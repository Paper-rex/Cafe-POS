import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import '../types/index.js';

const router = Router();

// GET /api/payment-config — Get config (any authenticated user)
router.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    let config = await prisma.paymentConfig.findUnique({ where: { id: 'singleton' } });

    if (!config) {
      config = await prisma.paymentConfig.create({
        data: { id: 'singleton', cashEnabled: true, cardEnabled: true, upiEnabled: false },
      });
    }

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/payment-config — Update config (admin only)
router.patch('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { cashEnabled, cardEnabled, upiEnabled, upiId, upiName } = req.body;

    // Validate: at least one method enabled
    const cash = cashEnabled !== undefined ? cashEnabled : undefined;
    const card = cardEnabled !== undefined ? cardEnabled : undefined;
    const upi = upiEnabled !== undefined ? upiEnabled : undefined;

    // Get current config
    const current = await prisma.paymentConfig.findUnique({ where: { id: 'singleton' } });
    const finalCash = cash ?? current?.cashEnabled ?? true;
    const finalCard = card ?? current?.cardEnabled ?? true;
    const finalUpi = upi ?? current?.upiEnabled ?? false;

    if (!finalCash && !finalCard && !finalUpi) {
      res.status(400).json({ error: 'At least one payment method must be enabled' });
      return;
    }

    // If enabling UPI, require UPI ID
    if (finalUpi && !upiId && !current?.upiId) {
      res.status(400).json({ error: 'UPI ID is required when enabling UPI' });
      return;
    }

    const config = await prisma.paymentConfig.update({
      where: { id: 'singleton' },
      data: {
        ...(cash !== undefined && { cashEnabled: cash }),
        ...(card !== undefined && { cardEnabled: card }),
        ...(upi !== undefined && { upiEnabled: upi }),
        ...(upiId !== undefined && { upiId }),
        ...(upiName !== undefined && { upiName }),
      },
    });

    res.json(config);
  } catch (error) {
    console.error('Update payment config error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
