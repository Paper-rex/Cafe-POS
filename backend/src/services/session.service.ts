import prisma from '../lib/prisma.js';
import sseService from './sse.service.js';

class SessionService {
  private closeMonitorIntervals: Map<string, NodeJS.Timeout> = new Map();

  async openSession(userId: string, branchId: string) {
    // Check if there's already an active session for this branch
    const existing = await prisma.posSession.findFirst({ where: { isActive: true, branchId } });
    if (existing) {
      throw Object.assign(new Error('A session is already active for this branch'), { status: 409 });
    }

    // DB requires PosSession.branchId; use first available branch.
    const branch = await prisma.branch.findFirst({
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!branch) {
      throw Object.assign(new Error('No branch found. Create a branch before opening session.'), { status: 409 });
    }

    const session = await prisma.posSession.create({
      data: {
        openedById: userId,
        branchId,
        isActive: true,
        branchId: branch.id,
      },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
        branch: { select: { id: true, name: true } },
      },
    });

    sseService.broadcast('session:opened', {
      session: {
        id: session.id,
        openedAt: session.openedAt,
        openedBy: session.openedBy,
        branchId: session.branchId,
        branch: session.branch,
      },
    });

    return session;
  }

  async closeSession(sessionId: string) {
    // Mark session as not active (prevents new orders)
    const session = await prisma.posSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    // Count open orders
    const openOrders = await prisma.order.count({
      where: {
        sessionId,
        status: { notIn: ['PAID', 'CANCELLED'] },
      },
    });

    sseService.broadcast('session:closing', {
      sessionId,
      branchId: session.branchId,
      openOrderCount: openOrders,
      message: openOrders > 0
        ? `Session closing. ${openOrders} order(s) still pending.`
        : 'Session closing. No pending orders.',
    });

    // If no open orders, close immediately
    if (openOrders === 0) {
      await this.finalizeClose(sessionId);
    } else {
      // Start monitoring for order completion
      this.startCloseMonitor(sessionId);
    }

    return { sessionId, branchId: session.branchId, openOrderCount: openOrders };
  }

  private startCloseMonitor(sessionId: string) {
    // Clear existing monitor if any for this session
    const existingInterval = this.closeMonitorIntervals.get(sessionId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const interval = setInterval(async () => {
      const openOrders = await prisma.order.count({
        where: {
          sessionId,
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
      });

      if (openOrders === 0) {
        const iv = this.closeMonitorIntervals.get(sessionId);
        if (iv) clearInterval(iv);
        this.closeMonitorIntervals.delete(sessionId);
        await this.finalizeClose(sessionId);
      }
    }, 5000); // Check every 5 seconds

    this.closeMonitorIntervals.set(sessionId, interval);
  }

  private async finalizeClose(sessionId: string) {
    // Calculate total sales
    const salesResult = await prisma.payment.aggregate({
      where: {
        order: { sessionId },
        status: 'PAID',
      },
      _sum: { amount: true },
    });

    const totalSales = salesResult._sum.amount || 0;

    // Update session
    const session = await prisma.posSession.update({
      where: { id: sessionId },
      data: {
        closedAt: new Date(),
        totalSales,
      },
    });

    sseService.broadcast('session:closed', {
      sessionId,
      branchId: session.branchId,
      totalSales,
      closedAt: new Date().toISOString(),
    });

    console.log(`📊 Session closed (branch: ${session.branchId}). Total sales: ₹${totalSales}`);
  }
}

export const sessionService = new SessionService();
export default sessionService;
