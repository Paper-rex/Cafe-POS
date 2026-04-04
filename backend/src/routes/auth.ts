import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { signAccess, signRefresh, verifyRefreshToken, verifyInviteToken } from '../lib/jwt.js';
import { authenticate } from '../middleware/authenticate.js';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS } from '../lib/constants.js';
import '../types/index.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    if (!user || !user.password) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.status === 'DISABLED') {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({ error: 'Please verify your email first' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const tokenPayload = { userId: user.id, role: user.role, email: user.email };
    const accessToken = signAccess(tokenPayload);
    const refreshToken = signRefresh(tokenPayload);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token' });
      return;
    }

    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || user.status === 'DISABLED') {
      res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
      res.status(401).json({ error: 'User not found or disabled' });
      return;
    }

    const tokenPayload = { userId: user.id, role: user.role, email: user.email };
    const newAccessToken = signAccess(tokenPayload);
    const newRefreshToken = signRefresh(tokenPayload);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, REFRESH_COOKIE_OPTIONS);

    res.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error: any) {
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/set-password
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword) {
      res.status(400).json({ error: 'All fields are required' });
      return;
    }

    if (password !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    const decoded = verifyInviteToken(token);

    const user = await prisma.user.findUnique({ where: { email: decoded.email } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.verifyToken !== token) {
      res.status(400).json({ error: 'Invalid or expired token' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email: decoded.email },
      data: {
        password: hashedPassword,
        emailVerified: true,
        status: 'ACTIVE',
        verifyToken: null,
      },
    });

    res.json({ message: 'Password set successfully. You can now log in.' });
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(400).json({ error: 'Invite link has expired. Please request a new one.' });
      return;
    }
    console.error('Set password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/verify-email
router.get('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const decoded = verifyInviteToken(token);

    await prisma.user.update({
      where: { email: decoded.email },
      data: {
        emailVerified: true,
        status: 'ACTIVE',
        verifyToken: null,
      },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
