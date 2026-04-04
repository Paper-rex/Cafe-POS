import { Request } from 'express';

export interface AuthUser {
  userId: string;
  role: string;
  email: string;
  branchIds: string[];   // branches this user belongs to
}

export interface ActiveSession {
  id: string;
  openedAt: Date;
  isActive: boolean;
  openedById: string;
  branchId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      activeSession?: ActiveSession;
    }
  }
}
