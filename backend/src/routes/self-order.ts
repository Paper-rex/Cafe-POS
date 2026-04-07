import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import sseService from '../services/sse.service.js';
import { withFallbackProductImages } from '../services/product-image.service.js';
import { withUniqueOrderNumber } from '../lib/order-number.js';

const router = Router();

const ACTIVE_ORDER_STATUSES = ['CREATED', 'SENT', 'PENDING', 'COOKING', 'READY', 'SERVED', 'PAYMENT_PENDING'] as const;
const TRACK_SECRET = process.env.SELF_ORDER_TRACK_SECRET || process.env.JWT_ACCESS_SECRET || 'dev-self-order-secret';
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

function paramOrderId(raw: string | string[] | undefined): string | undefined {
  if (raw === undefined) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

const idempotencyCache = new Map<string, { orderId: string; trackingToken: string; expiresAt: number }>();

function cleanupIdempotencyCache() {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (value.expiresAt <= now) idempotencyCache.delete(key);
  }
}

function signTrackingToken(orderId: string, phone: string) {
  return jwt.sign({ orderId, phone }, TRACK_SECRET, { expiresIn: '4h' });
}

function verifyTrackingToken(token: string) {
  return jwt.verify(token, TRACK_SECRET) as { orderId: string; phone: string };
}

function mapCustomerStatus(status: string) {
  if (['CREATED', 'SENT', 'PENDING'].includes(status)) return 'TO_COOK';
  if (status === 'COOKING') return 'PREPARING';
  if (['READY', 'SERVED', 'PAYMENT_PENDING', 'PAID'].includes(status)) return 'COMPLETED';
  return 'TO_COOK';
}

function estimateMinutes(status: string) {
  if (['CREATED', 'SENT', 'PENDING'].includes(status)) return 18;
  if (status === 'COOKING') return 8;
  if (['READY', 'SERVED', 'PAYMENT_PENDING', 'PAID'].includes(status)) return 0;
  return 15;
}

async function getActiveSession() {
  return prisma.posSession.findFirst({
    where: { isActive: true },
    select: { id: true, openedAt: true, isActive: true, branchId: true },
  });
}

async function getDefaultWaiterId() {
  const waiter = await prisma.user.findFirst({
    where: {
      status: 'ACTIVE',
      role: { in: ['WAITER', 'ADMIN'] },
    },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  return waiter?.id || null;
}

async function getOrderTotalAmount(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { subtotal: true },
  });
  return items.reduce((sum: number, item: { subtotal: number }) => sum + item.subtotal, 0);
}

router.get('/bootstrap', async (req: Request, res: Response) => {
  try {
    const tableId = req.query.tableId as string | undefined;
    const session = await getActiveSession();

    if (!session) {
      res.status(409).json({ error: 'No active POS session', code: 'SESSION_EXPIRED' });
      return;
    }

    const [categories, products, paymentConfig, tables] = await Promise.all([
      prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
      prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          price: true,
          description: true,
          imageUrl: true,
          categoryId: true,
        },
      }),
      prisma.paymentConfig.findUnique({ where: { id: 'singleton' } }),
      prisma.table.findMany({
        where: { isActive: true },
        include: {
          floor: { select: { id: true, name: true } },
          orders: {
            where: { status: { in: [...ACTIVE_ORDER_STATUSES] } },
            select: { id: true },
          },
        },
        orderBy: [{ floorId: 'asc' }, { number: 'asc' }],
      }),
    ]);

    const availableTables = tables
      .filter((t: any) => t.orders.length === 0)
      .map((t: any) => ({
        id: t.id,
        number: t.number,
        seats: t.seats,
        floorName: t.floor.name,
      }));

    const requestedTable = tableId
      ? tables.find((t: any) => t.id === tableId) || null
      : null;

    const enrichedProducts = await withFallbackProductImages(products as any);

    res.json({
      session,
      categories,
      products: enrichedProducts,
      paymentConfig: paymentConfig || {
        cashEnabled: true,
        cardEnabled: true,
        upiEnabled: false,
        upiId: null,
        upiName: null,
      },
      requestedTable: requestedTable
        ? {
            id: requestedTable.id,
            number: requestedTable.number,
            seats: requestedTable.seats,
            floorName: requestedTable.floor.name,
            occupied: requestedTable.orders.length > 0,
          }
        : null,
      availableTables,
    });
  } catch (error) {
    console.error('Self-order bootstrap error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    cleanupIdempotencyCache();

    const { name, phone, tableId, items, notes, paymentOption } = req.body as {
      name: string;
      phone: string;
      tableId: string;
      items: Array<{ productId: string; quantity?: number; variants?: any[]; toppings?: any[] }>;
      notes?: string;
      paymentOption?: 'PAY_AT_COUNTER' | 'PREPAID_UPI';
    };

    if (!name || !phone || !tableId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'name, phone, tableId and items are required' });
      return;
    }

    const idempotencyKey = req.header('x-idempotency-key');
    if (idempotencyKey && idempotencyCache.has(idempotencyKey)) {
      const cached = idempotencyCache.get(idempotencyKey)!;
      const existingOrder = await prisma.order.findUnique({ where: { id: cached.orderId } });
      if (existingOrder) {
        res.status(200).json({
          orderId: existingOrder.id,
          orderNumber: existingOrder.orderNumber,
          trackingToken: cached.trackingToken,
          estimatedMinutes: estimateMinutes(existingOrder.status),
          reused: true,
        });
        return;
      }
    }

    const [activeSession, table, waiterId] = await Promise.all([
      getActiveSession(),
      prisma.table.findUnique({ where: { id: tableId } }),
      getDefaultWaiterId(),
    ]);

    if (!activeSession) {
      res.status(409).json({ error: 'No active POS session', code: 'SESSION_EXPIRED' });
      return;
    }

    if (!table || !table.isActive) {
      res.status(404).json({ error: 'Table not found or inactive', code: 'TABLE_NOT_FOUND' });
      return;
    }

    if (!waiterId) {
      res.status(409).json({ error: 'No active POS staff available', code: 'STAFF_UNAVAILABLE' });
      return;
    }

    const occupiedOrders = await prisma.order.count({
      where: {
        tableId,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
    });

    if (occupiedOrders > 0) {
      res.status(409).json({ error: 'Table is already occupied', code: 'TABLE_OCCUPIED' });
      return;
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true, name: true, price: true },
    });

    const productMap = new Map(products.map((p: any) => [p.id, p]));

    const orderItems = items.map((item) => {
      const product = productMap.get(item.productId) as any;
      if (!product) {
        throw Object.assign(new Error(`Invalid product: ${item.productId}`), { status: 400 });
      }
      const quantity = Math.max(1, item.quantity || 1);
      const unitPrice = product.price;
      return {
        productId: product.id,
        name: product.name,
        unitPrice,
        quantity,
        variants: item.variants?.length ? item.variants : undefined,
        toppings: item.toppings?.length ? item.toppings : undefined,
        subtotal: unitPrice * quantity,
      };
    });

    const customerMeta = {
      source: 'SELF_ORDER',
      customerName: name,
      customerPhone: phone,
      payMode: paymentOption || 'PAY_AT_COUNTER',
      customerNotes: notes || null,
      createdAt: new Date().toISOString(),
    };

    const created = await withUniqueOrderNumber((orderNumber) =>
      prisma.order.create({
        data: {
          orderNumber,
          status: 'SENT',
          tableId,
          waiterId,
          sessionId: activeSession.id,
          branchId: activeSession.branchId,
          notes: JSON.stringify(customerMeta),
          items: { create: orderItems },
        },
        include: {
          items: true,
          table: { select: { id: true, number: true } },
        },
      })
    );

    const orderTotal = created.items.reduce((sum: number, i: any) => sum + i.subtotal, 0);

    // Always create a pending online payment for self-orders.
    await prisma.payment.upsert({
      where: { orderId: created.id },
      update: {
        method: 'UPI',
        status: 'PENDING',
        amount: orderTotal,
        upiQrData: 'DUMMY_ONLINE_PAYMENT',
      },
      create: {
        orderId: created.id,
        method: 'UPI',
        status: 'PENDING',
        amount: orderTotal,
        upiQrData: 'DUMMY_ONLINE_PAYMENT',
      },
    });

    sseService.broadcast('order:created', { order: created }, { targetRoles: ['KITCHEN', 'CASHIER', 'ADMIN', 'WAITER'] });

    const trackingToken = signTrackingToken(created.id, phone);

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, {
        orderId: created.id,
        trackingToken,
        expiresAt: Date.now() + IDEMPOTENCY_TTL_MS,
      });
    }

    res.status(201).json({
      orderId: created.id,
      orderNumber: created.orderNumber,
      table: created.table,
      status: created.status,
      totalAmount: orderTotal,
      trackingToken,
      estimatedMinutes: estimateMinutes(created.status),
    });
  } catch (error: any) {
    if (error.status) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error('Self-order create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orders/:orderId/status', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    const orderId = paramOrderId(req.params.orderId);

    if (!orderId) {
      res.status(400).json({ error: 'Order id required' });
      return;
    }

    if (!token) {
      res.status(401).json({ error: 'Tracking token is required' });
      return;
    }

    let payload: { orderId: string; phone: string };
    try {
      payload = verifyTrackingToken(token);
    } catch {
      res.status(401).json({ error: 'Invalid or expired tracking token' });
      return;
    }

    if (payload.orderId !== orderId) {
      res.status(403).json({ error: 'Tracking token does not match order' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: { select: { id: true, number: true } },
        items: { select: { id: true, itemStatus: true, quantity: true, name: true } },
        payment: { select: { status: true, method: true } },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      table: order.table,
      status: order.status,
      customerStatus: mapCustomerStatus(order.status),
      estimatedMinutes: estimateMinutes(order.status),
      payment: order.payment || null,
      items: order.items,
    });
  } catch (error) {
    console.error('Self-order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orders/:orderId/payment-intent', async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    const orderId = paramOrderId(req.params.orderId);

    if (!orderId) {
      res.status(400).json({ error: 'Order id required' });
      return;
    }

    if (!token) {
      res.status(401).json({ error: 'Tracking token is required' });
      return;
    }

    let payload: { orderId: string; phone: string };
    try {
      payload = verifyTrackingToken(token);
    } catch {
      res.status(401).json({ error: 'Invalid or expired tracking token' });
      return;
    }

    if (payload.orderId !== orderId) {
      res.status(403).json({ error: 'Tracking token does not match order' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: { select: { id: true, number: true } },
        payment: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const totalAmount = order.payment?.amount ?? await getOrderTotalAmount(orderId);

    if (!order.payment) {
      await prisma.payment.create({
        data: {
          orderId,
          method: 'UPI',
          status: 'PENDING',
          amount: totalAmount,
          upiQrData: 'DUMMY_ONLINE_PAYMENT',
        },
      });
    }

    const payment = await prisma.payment.findUnique({ where: { orderId } });

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      table: order.table,
      totalAmount,
      paymentStatus: payment?.status || 'PENDING',
      isPaid: payment?.status === 'PAID',
      paymentMethod: payment?.method || 'UPI',
      paymentLabel: 'Online Payment',
    });
  } catch (error) {
    console.error('Self-order payment intent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/orders/:orderId/pay', async (req: Request, res: Response) => {
  try {
    const orderId = paramOrderId(req.params.orderId);
    if (!orderId) {
      res.status(400).json({ error: 'Order id required' });
      return;
    }

    const { token, payerName, upiId } = req.body as {
      token?: string;
      payerName?: string;
      upiId?: string;
    };

    if (!token) {
      res.status(401).json({ error: 'Tracking token is required' });
      return;
    }

    let payload: { orderId: string; phone: string };
    try {
      payload = verifyTrackingToken(token);
    } catch {
      res.status(401).json({ error: 'Invalid or expired tracking token' });
      return;
    }

    if (payload.orderId !== orderId) {
      res.status(403).json({ error: 'Tracking token does not match order' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: { select: { id: true, number: true } },
        payment: true,
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const totalAmount = order.payment?.amount ?? await getOrderTotalAmount(orderId);

    const payment = order.payment
      ? await prisma.payment.update({
          where: { id: order.payment.id },
          data: {
            method: 'UPI',
            status: 'PAID',
            amount: totalAmount,
            upiQrData: `DUMMY_ONLINE_PAYMENT|name=${payerName || ''}|upi=${upiId || ''}`,
          },
        })
      : await prisma.payment.create({
          data: {
            orderId,
            method: 'UPI',
            status: 'PAID',
            amount: totalAmount,
            upiQrData: `DUMMY_ONLINE_PAYMENT|name=${payerName || ''}|upi=${upiId || ''}`,
          },
        });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAID' },
    });

    const message = `Online Payment Received for Order #${order.orderNumber} (Table ${order.table?.number})`;

    sseService.broadcast('payment:confirmed', {
      paymentId: payment.id,
      orderId,
      orderNumber: order.orderNumber,
      tableNumber: order.table?.number,
      method: 'UPI',
      amount: totalAmount,
      source: 'ONLINE_SELF_ORDER',
      message,
    }, {
      targetRoles: ['CASHIER', 'WAITER', 'KITCHEN', 'ADMIN'],
    });

    res.json({
      success: true,
      orderId,
      orderNumber: order.orderNumber,
      table: order.table,
      totalAmount,
      paymentStatus: payment.status,
      isPaid: payment.status === 'PAID',
      message,
    });
  } catch (error) {
    console.error('Self-order dummy pay error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/orders/:orderId/payment-failure', async (req: Request, res: Response) => {
  try {
    const orderId = paramOrderId(req.params.orderId);
    if (!orderId) {
      res.status(400).json({ error: 'Order id required' });
      return;
    }

    const payment = await prisma.payment.findUnique({ where: { orderId } });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    await prisma.payment.update({
      where: { orderId },
      data: { status: 'FAILED' },
    });

    await prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });

    sseService.broadcast('order:status_updated', {
      orderId,
      status: 'CANCELLED',
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Self-order payment failure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
