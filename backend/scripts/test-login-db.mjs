import 'dotenv/config';
import { PrismaClient } from '../prisma/generated/prisma/client.js';

const prisma = new PrismaClient();
const email = process.argv[2] || 'admin@cafepos.local';

try {
  const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  console.log('findUnique ok:', u ? { id: u.id, email: u.email, branchId: u.branchId, role: u.role } : 'not found');
} catch (e) {
  console.error('Prisma error:', e.message, e.code);
}
await prisma.$disconnect();
