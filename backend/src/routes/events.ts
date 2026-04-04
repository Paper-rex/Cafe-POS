import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { verifyAccessToken } from '../lib/jwt.js';
import sseService from '../services/sse.service.js';
import '../types/index.js';

const router = Router();

// GET /api/events — SSE endpoint
// Supports both Authorization header (normal) and ?token= query param (for EventSource)
router.get('/', (req: Request, res: Response) => {
  // Try Authorization header first, then query param
  let user = req.user;

  if (!user) {
    const tokenParam = req.query.token as string;
    if (tokenParam) {
      try {
        const payload = verifyAccessToken(tokenParam);
        user = { userId: payload.userId, role: payload.role, email: payload.email, branchIds: [] };
        req.user = user;
      } catch {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    } else {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
  }

  const clientId = sseService.addClient(user.userId, user.role, res);

  req.on('close', () => {
    sseService.removeClient(clientId);
  });
});

export default router;
