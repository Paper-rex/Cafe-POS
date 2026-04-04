import prisma from '../lib/prisma.js';
import sseService from './sse.service.js';

class SessionService {
  private closeMonitorInterval: NodeJS.Timeout | null = null;

  async openSession(userId: string) {
    // Check if there's already an active session
    const existing = await prisma.posSession.findFirst({ where: { isActive: true } });
    if (existing) {
      throw Object.assign(new Error('A session is already active'), { status: 409 });
    }

    const session = await prisma.posSession.create({
      data: {
        openedById: userId,
        isActive: true,
      },
      include: {
        openedBy: { select: { id: true, name: true, email: true } },
      },
    });

    sseService.broadcast('session:opened', {
      session: {
        id: session.id,
        openedAt: session.openedAt,
        openedBy: session.openedBy,
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

    return { sessionId, openOrderCount: openOrders };
  }

  private startCloseMonitor(sessionId: string) {
    // Clear existing monitor if any
    if (this.closeMonitorInterval) {
      clearInterval(this.closeMonitorInterval);
    }

    this.closeMonitorInterval = setInterval(async () => {
      const openOrders = await prisma.order.count({
        where: {
          sessionId,
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
      });

      if (openOrders === 0) {
        if (this.closeMonitorInterval) clearInterval(this.closeMonitorInterval);
        await this.finalizeClose(sessionId);
      }
    }, 5000); // Check every 5 seconds
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
    await prisma.posSession.update({
      where: { id: sessionId },
      data: {
        closedAt: new Date(),
        totalSales,
      },
    });

    // Reset all tables (no active status tracked on tables; orders just won't reference them)
    sseService.broadcast('session:closed', {
      sessionId,
      totalSales,
      closedAt: new Date().toISOString(),
    });

    console.log(`📊 Session closed. Total sales: ₹${totalSales}`);
  }
}

export const sessionService = new SessionService();
export default sessionService;
