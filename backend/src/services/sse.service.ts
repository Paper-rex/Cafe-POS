import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

interface SSEClient {
  id: string;
  res: Response;
  userId: string;
  role: string;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
  }

  addClient(userId: string, role: string, res: Response): string {
    const clientId = uuidv4();

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // For nginx
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`);

    this.clients.set(clientId, { id: clientId, res, userId, role });

    console.log(`📡 SSE client connected: ${clientId} (${role})`);

    return clientId;
  }

  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      console.log(`📡 SSE client disconnected: ${clientId} (${client.role})`);
    }
  }

  broadcast(
    event: string,
    data: any,
    options?: {
      targetRoles?: string[];
      targetUserIds?: string[];
      excludeUserId?: string;
    }
  ): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

    this.clients.forEach((client) => {
      // Role filtering
      if (options?.targetRoles && !options.targetRoles.includes(client.role)) {
        return;
      }

      // User filtering
      if (options?.targetUserIds && !options.targetUserIds.includes(client.userId)) {
        return;
      }

      // Exclude specific user
      if (options?.excludeUserId && client.userId === options.excludeUserId) {
        return;
      }

      try {
        client.res.write(message);
      } catch (error) {
        // Client probably disconnected
        this.removeClient(client.id);
      }
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const message = `event: ping\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`;
      this.clients.forEach((client) => {
        try {
          client.res.write(message);
        } catch {
          this.removeClient(client.id);
        }
      });
    }, 30000); // 30 seconds
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.clients.clear();
  }
}

// Singleton
export const sseService = new SSEService();
export default sseService;
