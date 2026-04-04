import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { signInviteToken } from '../lib/jwt.js';
import { sendInviteEmail } from '../services/email.service.js';
import '../types/index.js';

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/staff — List all staff
router.get('/staff', async (_req: Request, res: Response) => {
  try {
    const staff = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(staff);
  } catch (error) {
    console.error('List staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/staff — Invite new staff
router.post('/staff', async (req: Request, res: Response) => {
  try {
    const { email, role, name } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'Email and role are required' });
      return;
    }

    const validRoles = ['WAITER', 'KITCHEN', 'CASHIER', 'ADMIN'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }

    // Generate invite token
    const token = signInviteToken({ email: email.toLowerCase(), role });

    // Create user as PENDING
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: name || null,
        role: role as any,
        status: 'PENDING',
        verifyToken: token,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Send invite email
    await sendInviteEmail(email.toLowerCase(), role, token);

    res.status(201).json(user);
  } catch (error) {
    console.error('Invite staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/staff/:id/role — Change role
router.patch('/staff/:id/role', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['WAITER', 'KITCHEN', 'CASHIER', 'ADMIN'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/staff/:id/resend-invite — Resend invite email
router.post('/staff/:id/resend-invite', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.status !== 'PENDING') {
      res.status(400).json({ error: 'User is already active' });
      return;
    }

    // Generate new token
    const token = signInviteToken({ email: user.email, role: user.role });

    await prisma.user.update({
      where: { id },
      data: { verifyToken: token },
    });

    await sendInviteEmail(user.email, user.role, token);

    res.json({ message: 'Invite resent successfully' });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/staff/:id — Disable user
router.delete('/staff/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Prevent self-deletion
    if (id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot disable your own account' });
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status: 'DISABLED' },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/staff/:id/enable — Re-enable disabled user
router.patch('/staff/:id/enable', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: { id: true, email: true, name: true, role: true, status: true },
    });
    res.json(user);
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('Enable staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/staff/:id/permanent — Hard delete user
router.delete('/staff/:id/permanent', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }
    await prisma.user.delete({ where: { id } });
    res.json({ message: 'User permanently deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('Hard delete staff error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
