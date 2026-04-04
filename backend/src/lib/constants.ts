// ─── Admin Emails (seeded on startup) ───────────────
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@cafepos.local')
  .split(',')
  .map(e => e.trim());

export const ADMIN_DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';

// ─── Order Number Prefix ────────────────────────────
export const ORDER_PREFIX = 'ORD';

// ─── Monetary Helpers ───────────────────────────────
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

// ─── Status Transitions ────────────────────────────
export const ORDER_STATUS_TRANSITIONS: Record<string, { next: string; roles: string[] }[]> = {
  CREATED:          [{ next: 'SENT', roles: ['WAITER'] }],
  SENT:             [{ next: 'PENDING', roles: ['KITCHEN', 'ADMIN'] }],
  PENDING:          [{ next: 'COOKING', roles: ['KITCHEN'] }],
  COOKING:          [{ next: 'READY', roles: ['KITCHEN'] }],
  READY:            [{ next: 'SERVED', roles: ['WAITER'] }],
  SERVED:           [{ next: 'PAYMENT_PENDING', roles: ['WAITER'] }],
  PAYMENT_PENDING:  [{ next: 'PAID', roles: ['CASHIER', 'ADMIN', 'WAITER'] }], // Waiter allowed for CASH only
};

export const ITEM_STATUS_TRANSITIONS: Record<string, { next: string; roles: string[] }[]> = {
  PENDING: [{ next: 'COOKING', roles: ['KITCHEN', 'ADMIN'] }],
  COOKING: [{ next: 'READY', roles: ['KITCHEN', 'ADMIN'] }],
  READY:   [{ next: 'SERVED', roles: ['WAITER', 'ADMIN'] }],
};

// ─── Error Codes ────────────────────────────────────
export const ERROR_CODES = {
  SESSION_REQUIRED: 'SESSION_REQUIRED',
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
} as const;

// ─── Cookie Config ──────────────────────────────────
export const REFRESH_COOKIE_NAME = 'cafepos_refresh';
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth',
};
