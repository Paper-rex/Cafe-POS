import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { sessionRequired } from '../middleware/sessionRequired.js';
import { ORDER_STATUS_TRANSITIONS, ITEM_STATUS_TRANSITIONS, ORDER_PREFIX } from '../lib/constants.js';
import sseService from '../services/sse.service.js';
import '../types/index.js';

const router = Router();

router.use(authenticate);

// GET /api/orders — List orders with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, tableId, sessionId, waiterId, limit } = req.query;
    const where: any = {};
    if (status) where.status = Array.isArray(status) ? { in: status } : status;
    if (tableId) where.tableId = tableId;
    if (sessionId) where.sessionId = sessionId;
    if (waiterId) where.waiterId = waiterId;

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        table: { select: { id: true, number: true } },
        waiter: { select: { id: true, name: true, email: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string) : 100,
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id — Get single order
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: { select: { id: true, imageUrl: true } } } },
        table: true,
        waiter: { select: { id: true, name: true, email: true } },
        payment: true,
      },
    });

    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders — Create new order (waiter only, session required)
router.post('/', authorize('WAITER', 'ADMIN'), sessionRequired, async (req: Request, res: Response) => {
  try {
    const { tableId, items, notes } = req.body;

    if (!tableId || !items || !items.length) {
      res.status(400).json({ error: 'tableId and items are required' });
      return;
    }

    // Generate order number
    const orderCount = await prisma.order.count({
      where: { sessionId: req.activeSession!.id },
    });
    const orderNumber = `${ORDER_PREFIX}-${String(orderCount + 1).padStart(4, '0')}`;

    // Fetch products to snapshot prices
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true, toppings: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // Build order items with snapshotted data
    const orderItems = items.map((item: any) => {
      const product = productMap.get(item.productId);
      if (!product) throw Object.assign(new Error(`Product ${item.productId} not found`), { status: 400 });

      let unitPrice = product.price;

      // Add variant extra prices
      const selectedVariants = item.variants || [];
      selectedVariants.forEach((v: any) => {
        if (v.extraPrice) unitPrice += v.extraPrice;
      });

      // Add topping prices
      const selectedToppings = item.toppings || [];
      selectedToppings.forEach((t: any) => {
        if (t.price) unitPrice += t.price;
      });

      const quantity = item.quantity || 1;
      const subtotal = unitPrice * quantity;

      return {
        productId: product.id,
        name: product.name,
        unitPrice,
        quantity,
        variants: selectedVariants.length > 0 ? selectedVariants : undefined,
        toppings: selectedToppings.length > 0 ? selectedToppings : undefined,
        subtotal,
      };
    });

    const order = await prisma.order.create({
      data: {
        orderNumber,
        tableId,
        waiterId: req.user!.userId,
        sessionId: req.activeSession!.id,
        notes,
        items: { create: orderItems },
      },
      include: {
        items: true,
        table: { select: { id: true, number: true } },
        waiter: { select: { id: true, name: true } },
      },
    });

    // Broadcast to kitchen and cashier
    sseService.broadcast('order:created', { order }, {
      targetRoles: ['KITCHEN', 'CASHIER', 'ADMIN'],
    });

    res.status(201).json(order);
  } catch (error: any) {
    if (error.status) { res.status(error.status).json({ error: error.message }); return; }
    console.error('Create order error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/orders/:id/status — Update order status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status: newStatus } = req.body;
    const orderId = req.params.id;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    // Check valid transition
    const validTransitions = ORDER_STATUS_TRANSITIONS[order.status];
    if (!validTransitions) {
      res.status(400).json({ error: `No transitions from ${order.status}`, code: 'INVALID_TRANSITION' });
      return;
    }

    const transition = validTransitions.find(t => t.next === newStatus);
    if (!transition) {
      res.status(400).json({
        error: `Invalid transition: ${order.status} → ${newStatus}`,
        code: 'INVALID_TRANSITION',
        validTransitions: validTransitions.map(t => t.next),
      });
      return;
    }

    // Check role permission
    if (!transition.roles.includes(req.user!.role)) {
      res.status(403).json({
        error: `Role ${req.user!.role} cannot perform ${order.status} → ${newStatus}`,
        code: 'FORBIDDEN',
      });
      return;
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: newStatus as any },
      include: {
        items: true,
        table: { select: { id: true, number: true } },
        waiter: { select: { id: true, name: true } },
      },
    });

    sseService.broadcast('order:status_updated', {
      orderId,
      status: newStatus,
      order: updated,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/orders/:id/items/status — Update item statuses
router.patch('/:id/items/status', async (req: Request, res: Response) => {
  try {
    const { itemIds, status } = req.body;
    if (!itemIds || !Array.isArray(itemIds) || !status) {
      res.status(400).json({ error: 'itemIds array and status are required' });
      return;
    }

    const orderId = req.params.id;

    // Check transition validity for at least one item (lazy validation, usually UI enforces this)
    const validTransitions = Object.values(ITEM_STATUS_TRANSITIONS).flat();
    const isAllowed = validTransitions.some(t => t.next === status && t.roles.includes(req.user!.role));
    if (!isAllowed) {
      res.status(403).json({ error: `Role ${req.user!.role} cannot transition to ${status}`, code: 'FORBIDDEN' });
      return;
    }

    // Update items
    await prisma.orderItem.updateMany({
      where: { id: { in: itemIds }, orderId },
      data: { itemStatus: status as any },
    });

    // Auto-compute order status
    const allItems = await prisma.orderItem.findMany({ where: { orderId } });
    let newOrderStatus = undefined;

    const statuses = allItems.map(i => i.itemStatus);
    const hasCooking = statuses.includes('COOKING');
    const allServed = statuses.length > 0 && statuses.every(s => s === 'SERVED');
    const allReadyOrServed = statuses.length > 0 && statuses.every(s => s === 'READY' || s === 'SERVED');

    if (hasCooking) newOrderStatus = 'COOKING';
    else if (allServed) newOrderStatus = 'SERVED';
    else if (allReadyOrServed) newOrderStatus = 'READY';
    else newOrderStatus = 'PENDING'; // Or we could keep the current logic, basically fallback

    let order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order && newOrderStatus && order.status !== newOrderStatus && !['PAYMENT_PENDING', 'PAID', 'CANCELLED'].includes(order.status)) {
      order = await prisma.order.update({
        where: { id: orderId },
        data: { status: newOrderStatus as any },
      });
      sseService.broadcast('order:status_updated', {
        orderId,
        status: newOrderStatus,
        order,
      });
    }

    sseService.broadcast('order:items_updated', {
      orderId,
      itemIds,
      status,
    });

    res.json({ success: true, orderStatus: order?.status });
  } catch (error) {
    console.error('Update item status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/orders/:id — Delete order (only if CREATED)
router.delete('/:id', authorize('WAITER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

    if (order.status !== 'CREATED') {
      res.status(400).json({ error: 'Can only delete orders in CREATED status' });
      return;
    }

    await prisma.order.delete({ where: { id: req.params.id } });
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
