import prisma from '../lib/prisma.js';
import sseService from './sse.service.js';

class PaymentService {
  async initiateCashOrCard(orderId: string, method: 'CASH' | 'CARD', waiterId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
    if (order.payment) throw Object.assign(new Error('Payment already exists for this order'), { status: 409 });
    
    // Ensure all items are served
    const allItemsServed = order.items.length > 0 && order.items.every(i => i.itemStatus === 'SERVED');
    if (!allItemsServed || order.status !== 'SERVED') {
      throw Object.assign(new Error('All items must be SERVED before payment'), { status: 400 });
    }

    // Calculate total
    const subtotalTotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxTotal = order.items.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotalTotal + taxTotal;

    const payment = await prisma.payment.create({
      data: {
        orderId,
        method,
        amount: total,
        taxTotal,
        status: 'PENDING',
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAYMENT_PENDING' },
    });

    sseService.broadcast('order:status_updated', {
      orderId,
      status: 'PAYMENT_PENDING',
      paymentId: payment.id,
      method,
    });

    return payment;
  }

  async initiateUPI(orderId: string, waiterId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });

    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 });
    if (order.payment) throw Object.assign(new Error('Payment already exists'), { status: 409 });
    
    const allItemsServed = order.items.length > 0 && order.items.every(i => i.itemStatus === 'SERVED');
    if (!allItemsServed || order.status !== 'SERVED') {
      throw Object.assign(new Error('All items must be SERVED before payment'), { status: 400 });
    }

    const subtotalTotal = order.items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxTotal = order.items.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = subtotalTotal + taxTotal;

    // Get UPI config or use default
    const config = await prisma.paymentConfig.findUnique({ where: { id: 'singleton' } });
    const upiId = config?.upiEnabled && config.upiId ? config.upiId : 'cafepos@ybl';
    const upiName = config?.upiEnabled && config.upiName ? config.upiName : 'Cafe POS';

    // Generate UPI string
    const upiString = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiName)}&am=${total}&cu=INR&tn=Order-${order.orderNumber}`;

    const payment = await prisma.payment.create({
      data: {
        orderId,
        method: 'UPI',
        amount: total,
        taxTotal,
        status: 'PENDING',
        upiQrData: upiString,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAYMENT_PENDING' },
    });

    sseService.broadcast('order:status_updated', {
      orderId,
      status: 'PAYMENT_PENDING',
      paymentId: payment.id,
      method: 'UPI',
    });

    return payment;
  }

  async confirmPayment(paymentId: string, userId: string, amountTendered?: number, userRole?: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) throw Object.assign(new Error('Payment not found'), { status: 404 });
    if (payment.status !== 'PENDING') throw Object.assign(new Error('Payment is not pending'), { status: 400 });
    
    if (userRole === 'WAITER') {
      throw Object.assign(new Error('Waiters cannot confirm payments'), { status: 403 });
    }

    let change: number | undefined;
    if (payment.method === 'CASH') {
      if (!amountTendered || amountTendered < payment.amount) {
        throw Object.assign(new Error('Insufficient amount tendered'), { status: 400 });
      }
      change = amountTendered - payment.amount;
    }

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        confirmedById: userId,
        amountTendered,
        change,
      },
    });

    // Update order to PAID
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAID' },
    });

    sseService.broadcast('payment:confirmed', {
      paymentId,
      orderId: payment.orderId,
      method: payment.method,
      amount: payment.amount,
    });

    sseService.broadcast('order:status_updated', {
      orderId: payment.orderId,
      status: 'PAID',
    });

    return updatedPayment;
  }

  async handleRazorpayWebhook(payload: any, signature: string) {
    // In mock mode, just log
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.log('⚡ Razorpay webhook (mock mode):', JSON.stringify(payload).substring(0, 200));

      // For development, auto-confirm if razorpayId matches
      if (payload.entity?.notes?.paymentId) {
        await this.confirmPayment(payload.entity.notes.paymentId, 'system');
      }
      return;
    }

    // TODO: Verify Razorpay signature in production
    // crypto.createHmac('sha256', webhookSecret).update(JSON.stringify(payload)).digest('hex') === signature
    console.log('⚡ Razorpay webhook received');
  }
}

export const paymentService = new PaymentService();
export default paymentService;
