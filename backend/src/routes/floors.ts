// @ts-nocheck
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import '../types/index.js';

const router = Router();

// All floor routes require authentication
router.use(authenticate);

// GET /api/floors — List all floors with tables, filtered by branch
router.get('/', async (req: Request, res: Response) => {
  try {
    const branchId = (req.query.branchId as string) || (req.headers['x-branch-id'] as string);
    const where: any = {};

    if (branchId) {
      where.branchId = branchId;
    } else if (req.user!.role !== 'ADMIN' && req.user!.branchIds.length > 0) {
      // Non-admin users: filter to their branches
      where.branchId = { in: req.user!.branchIds };
    }

    const floors = await prisma.floor.findMany({
      where,
      include: {
        tables: {
          orderBy: { number: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(floors);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/floors — Create floor (admin)
router.post('/', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, branchId } = req.body;
    if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
    if (!branchId) { res.status(400).json({ error: 'branchId is required' }); return; }

    const floor = await prisma.floor.create({ data: { name, branchId } });
    res.status(201).json(floor);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/floors/:id — Update floor (admin)
router.patch('/:id', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const floor = await prisma.floor.update({
      where: { id: req.params.id as string },
      data: { name: req.body.name },
    });
    res.json(floor);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Floor not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/floors/:id — Delete floor with cascade (admin)
router.delete('/:id', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.floor.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Floor deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Floor not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Table Routes ─────────────────────────────────────

// GET /api/floors/:floorId/tables
router.get('/:floorId/tables', async (req: Request, res: Response) => {
  try {
    const tables = await prisma.table.findMany({
      where: { floorId: req.params.floorId as string },
      orderBy: { number: 'asc' },
    });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/floors/:floorId/tables — Add table (admin)
router.post('/:floorId/tables', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { number, seats, shape, posX, posY } = req.body;

    if (!number) { res.status(400).json({ error: 'Table number is required' }); return; }

    const table = await prisma.table.create({
      data: {
        number,
        seats: seats || 4,
        shape: shape || 'SQUARE',
        posX: posX || 50,
        posY: posY || 50,
        floorId: req.params.floorId as string,
      },
    });

    res.status(201).json(table);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/floors/tables/:id — Update table (admin)
router.patch('/tables/:id', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { number, seats, shape, posX, posY, isActive } = req.body;

    const table = await prisma.table.update({
      where: { id: req.params.id as string },
      data: {
        ...(number !== undefined && { number }),
        ...(seats !== undefined && { seats }),
        ...(shape && { shape }),
        ...(posX !== undefined && { posX }),
        ...(posY !== undefined && { posY }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(table);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Table not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/floors/tables/:id — Delete table (admin)
router.delete('/tables/:id', authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    // Check for active orders on this table
    const activeOrders = await prisma.order.count({
      where: {
        tableId: req.params.id as string,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
    });

    if (activeOrders > 0) {
      res.status(409).json({ error: `Cannot delete: ${activeOrders} active orders on this table` });
      return;
    }

    await prisma.table.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Table deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Table not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
