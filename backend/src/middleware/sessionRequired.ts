import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import '../types/index.js';

export async function sessionRequired(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Determine branch: from query param, header, or user's first branch
    const branchId = (req.query.branchId as string)
      || (req.headers['x-branch-id'] as string)
      || req.user?.branchIds?.[0];

    if (!branchId) {
      res.status(400).json({
        error: 'No branch selected',
        code: 'BRANCH_REQUIRED',
      });
      return;
    }

    const activeSession = await prisma.posSession.findFirst({
      where: { isActive: true, branchId },
    });

    if (!activeSession) {
      res.status(403).json({
        error: 'No active session for this branch',
        code: 'SESSION_REQUIRED',
      });
      return;
    }

    req.activeSession = {
      id: activeSession.id,
      openedAt: activeSession.openedAt,
      isActive: activeSession.isActive,
      branchId: activeSession.branchId,
      openedById: activeSession.openedById,
      branchId: activeSession.branchId,
    };

    next();
  } catch (error) {
    next(error);
  }
}
