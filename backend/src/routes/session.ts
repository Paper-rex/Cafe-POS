import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import sessionService from '../services/session.service.js';
import '../types/index.js';

const router = Router();

// GET /api/session/active — Get active session for a branch (any authenticated user)
router.get('/active', authenticate, async (req: Request, res: Response) => {
  try {
    const branchId = (req.query.branchId as string)
      || (req.headers['x-branch-id'] as string)
      || req.user?.branchIds?.[0];

    if (!branchId) {
      res.json(null);
      return;
    }

    const session = await prisma.posSession.findFirst({
      where: { isActive: true, branchId },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    res.json(session);
  } catch (error) {
    console.error('Get active session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/session/history — Session history (admin only), optional branch filter
router.get('/history', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { branchId } = req.query;
    const where: any = {};
    if (branchId) where.branchId = branchId;

    const sessions = await prisma.posSession.findMany({
      where,
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { openedAt: 'desc' },
      take: 50,
    });

    res.json(sessions);
  } catch (error) {
    console.error('Session history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/session/open — Open new session for a branch (admin only)
router.post('/open', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { branchId } = req.body;
    if (!branchId) {
      res.status(400).json({ error: 'branchId is required' });
      return;
    }

    const session = await sessionService.openSession(req.user!.userId, branchId);
    res.status(201).json(session);
  } catch (error: any) {
    if (error.status === 409) {
      res.status(409).json({ error: error.message });
      return;
    }
    console.error('Open session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/session/close — Close active session for a branch (admin only)
router.post('/close', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const branchId = req.body.branchId || (req.headers['x-branch-id'] as string);
    if (!branchId) {
      res.status(400).json({ error: 'branchId is required' });
      return;
    }

    const activeSession = await prisma.posSession.findFirst({ where: { isActive: true, branchId } });

    if (!activeSession) {
      res.status(404).json({ error: 'No active session for this branch' });
      return;
    }

    const result = await sessionService.closeSession(activeSession.id);
    res.json(result);
  } catch (error) {
    console.error('Close session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
