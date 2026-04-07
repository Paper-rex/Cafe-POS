import { randomInt } from 'node:crypto';
import { ORDER_PREFIX } from './constants.js';

const MAX_ORDER_NUMBER_RETRIES = 6;

export function generateOrderNumber(now = new Date()): string {
  const iso = now.toISOString();
  const datePart = iso.slice(0, 10).replace(/-/g, '');
  const timePart = iso.slice(11, 19).replace(/:/g, '');
  const millis = String(now.getMilliseconds()).padStart(3, '0');
  const randomPart = randomInt(0, 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, '0');

  return `${ORDER_PREFIX}-${datePart}-${timePart}${millis}-${randomPart}`;
}

export function isOrderNumberConflictError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const prismaError = error as { code?: string; meta?: { target?: unknown } };
  if (prismaError.code !== 'P2002') return false;

  const target = prismaError.meta?.target;
  return Array.isArray(target) && target.includes('orderNumber');
}

export async function withUniqueOrderNumber<T>(create: (orderNumber: string) => Promise<T>): Promise<T> {
  let lastConflictError: unknown;

  for (let attempt = 0; attempt < MAX_ORDER_NUMBER_RETRIES; attempt += 1) {
    try {
      return await create(generateOrderNumber());
    } catch (error) {
      if (!isOrderNumberConflictError(error)) throw error;
      lastConflictError = error;
    }
  }

  throw lastConflictError ?? new Error('Unable to allocate unique order number');
}
