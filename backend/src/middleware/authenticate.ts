import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import prisma from '../lib/prisma.js';
import '../types/index.js';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required', code: 'UNAUTHORIZED' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);

    // Load live role & branches from DB so permission checks match the current user record
    // (JWT role can be stale after an admin changes roles without re-login).
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        role: true,
        email: true,
        status: true,
        branches: { select: { id: true } },
      },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found', code: 'UNAUTHORIZED' });
      return;
    }

    if (user.status === 'DISABLED') {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    req.user = {
      userId: payload.userId,
      role: user.role,
      email: user.email,
      branchIds: user.branches.map((b) => b.id),
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
  }
}
