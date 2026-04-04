import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import '../types/index.js';

export async function sessionRequired(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeSession = await prisma.posSession.findFirst({
      where: { isActive: true },
    });

    if (!activeSession) {
      res.status(403).json({
        error: 'No active session',
        code: 'SESSION_REQUIRED',
      });
      return;
    }

    req.activeSession = {
      id: activeSession.id,
      openedAt: activeSession.openedAt,
      isActive: activeSession.isActive,
      openedById: activeSession.openedById,
    };

    next();
  } catch (error) {
    next(error);
  }
}
