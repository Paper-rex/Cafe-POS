// @ts-nocheck
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import '../types/index.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/branches — List all branches
router.get('/', async (_req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        _count: { select: { floors: true, users: true, orders: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(branches);
  } catch (error) {
    console.error('List branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/branches — Create a branch
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: 'Branch name is required' }); return; }

    const branch = await prisma.branch.create({ data: { name } });
    res.status(201).json(branch);
  } catch (error) {
    console.error('Create branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/branches/:id — Update branch
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const branch = await prisma.branch.update({
      where: { id: req.params.id as string },
      data: { name },
    });
    res.json(branch);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Branch not found' }); return; }
    console.error('Update branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/branches/:id — Delete branch (only if no active orders)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const activeOrders = await prisma.order.count({
      where: { branchId: req.params.id as string, status: { notIn: ['PAID', 'CANCELLED'] } },
    });
    if (activeOrders > 0) {
      res.status(409).json({ error: `Cannot delete: ${activeOrders} active orders in this branch` });
      return;
    }
    await prisma.branch.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Branch deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Branch not found' }); return; }
    console.error('Delete branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
