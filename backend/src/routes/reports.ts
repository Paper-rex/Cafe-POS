import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';

const router = Router();
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/reports/dashboard
router.get('/dashboard', async (_req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [todayOrders, todayRevenue, activeSession, recentOrders, topProducts] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: today } } }),
      prisma.payment.aggregate({ where: { status: 'PAID', createdAt: { gte: today } }, _sum: { amount: true } }),
      prisma.posSession.findFirst({ where: { isActive: true } }),
      prisma.order.findMany({ take: 20, orderBy: { createdAt: 'desc' }, include: { table: { select: { number: true } }, waiter: { select: { name: true } }, items: true } }),
      prisma.orderItem.groupBy({ by: ['name'], where: { order: { createdAt: { gte: today } } }, _sum: { quantity: true, subtotal: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 10 }),
    ]);
    // Last 7 days revenue
    const days: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const rev = await prisma.payment.aggregate({ where: { status: 'PAID', createdAt: { gte: d, lt: next } }, _sum: { amount: true } });
      days.push({ date: d.toISOString().split('T')[0], revenue: rev._sum.amount || 0 });
    }
    const activeTables = await prisma.order.findMany({ where: { status: { notIn: ['PAID', 'CANCELLED'] } }, select: { tableId: true }, distinct: ['tableId'] });
    res.json({ todayOrders, todayRevenue: todayRevenue._sum.amount || 0, activeTables: activeTables.length, activeSession: !!activeSession, recentOrders, topProducts, revenueChart: days });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error' }); }
});

// GET /api/reports/monthly
router.get('/monthly', async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = parseInt(month as string) || new Date().getMonth() + 1;
    const y = parseInt(year as string) || new Date().getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    const [orders, revenue, topProducts] = await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: start, lte: end } }, include: { items: true, table: { select: { number: true } }, waiter: { select: { name: true } }, payment: true }, orderBy: { createdAt: 'desc' } }),
      prisma.payment.aggregate({ where: { status: 'PAID', createdAt: { gte: start, lte: end } }, _sum: { amount: true } }),
      prisma.orderItem.groupBy({ by: ['name'], where: { order: { createdAt: { gte: start, lte: end } } }, _sum: { quantity: true, subtotal: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 10 }),
    ]);
    res.json({ month: m, year: y, totalRevenue: revenue._sum.amount || 0, totalOrders: orders.length, orders, topProducts });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal server error' }); }
});

export default router;
