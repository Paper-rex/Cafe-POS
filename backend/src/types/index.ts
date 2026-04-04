import { Request } from 'express';

export interface AuthUser {
  userId: string;
  role: string;
  email: string;
}

export interface ActiveSession {
  id: string;
  openedAt: Date;
  isActive: boolean;
  openedById: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      activeSession?: ActiveSession;
    }
  }
}
