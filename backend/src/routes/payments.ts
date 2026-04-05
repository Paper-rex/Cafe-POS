// @ts-nocheck
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import paymentService from '../services/payment.service.js';
import '../types/index.js';

const router = Router();

// Razorpay calls this without our JWT — must be registered before authenticate middleware
router.post('/webhook/razorpay', async (req, res) => {
  try {
    await paymentService.handleRazorpayWebhook(req.body, req.headers['x-razorpay-signature'] as string);
    res.json({ status: 'ok' });
  } catch (e) { res.status(500).json({ error: 'Webhook failed' }); }
});

router.use(authenticate);

router.post('/', authorize('WAITER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const { orderId, method } = req.body;
    if (!orderId || !method) { res.status(400).json({ error: 'orderId and method required' }); return; }
    let result;
    if (method === 'UPI') result = await paymentService.initiateUPI(orderId, req.user!.userId);
    else if (method === 'CASH' || method === 'CARD') result = await paymentService.initiateCashOrCard(orderId, method, req.user!.userId);
    else { res.status(400).json({ error: 'Invalid method' }); return; }
    res.status(201).json(result);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
});

router.get('/pending', authorize('CASHIER', 'ADMIN'), async (req, res) => {
  try {
    const { branchId } = req.query;
    let branchFilter: any = {};
    if (branchId) {
      branchFilter = { order: { branchId: branchId as string } };
    } else if (req.user!.role !== 'ADMIN' && req.user!.branchIds?.length > 0) {
      branchFilter = { order: { branchId: { in: req.user!.branchIds } } };
    }

    const payments = await prisma.payment.findMany({
      where: { status: 'PENDING', ...branchFilter },
      include: { 
        order: { include: { items: true, table: { select: { number: true } }, waiter: { select: { name: true } } } },
        confirmedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(payments);
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

router.patch('/:id/confirm', authorize('CASHIER', 'ADMIN'), async (req: Request, res: Response) => {
  try {
    const result = await paymentService.confirmPayment(req.params.id as string, req.user!.userId, req.body.amountTendered, req.user!.role);
    res.json(result);
  } catch (e: any) { res.status(e.status || 500).json({ error: e.message }); }
});

router.get('/history', authorize('CASHIER', 'ADMIN'), async (req, res) => {
  try {
    const { method, page = '1', limit = '50', branchId } = req.query;
    
    let branchFilter: any = {};
    if (branchId) {
      branchFilter = { order: { branchId: branchId as string } };
    } else if (req.user!.role !== 'ADMIN' && req.user!.branchIds?.length > 0) {
      branchFilter = { order: { branchId: { in: req.user!.branchIds } } };
    }

    const where: any = { status: 'PAID', ...branchFilter };
    if (method) where.method = method;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [payments, total] = await Promise.all([
      prisma.payment.findMany({ where, include: { order: { include: { table: { select: { number: true } }, waiter: { select: { name: true } } } }, confirmedBy: { select: { name: true } } }, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit as string) }),
      prisma.payment.count({ where }),
    ]);
    res.json({ payments, pagination: { total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) } });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
