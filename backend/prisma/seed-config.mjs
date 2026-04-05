import { Role } from './generated/prisma/client.js';

/** Comma-separated in env `ADMIN_EMAILS`, or default single admin. */
export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS || 'admin@cafepos.local')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getAdminPassword() {
  return process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
}

export function getStaffPassword() {
  return process.env.STAFF_DEFAULT_PASSWORD || 'Staff@123';
}

/** Default demo staff accounts (waiter / kitchen / cashier). */
export function getDefaultStaff() {
  return [
    { email: 'waiter@cafepos.local', name: 'Waiter', role: Role.WAITER },
    { email: 'kitchen@cafepos.local', name: 'Kitchen', role: Role.KITCHEN },
    { email: 'cashier@cafepos.local', name: 'Cashier', role: Role.CASHIER },
  ];
}
