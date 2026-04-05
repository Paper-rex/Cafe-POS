/**
 * Upsert admin + default staff into the DB and attach them to a branch.
 * Safe on existing databases (idempotent).
 *
 * Run: node --env-file=.env prisma/seed-users.mjs
 *   or: npm run db:seed-users
 */
import { PrismaClient, Role, UserStatus } from './generated/prisma/client.js';
import bcrypt from 'bcryptjs';
import {
  getAdminEmails,
  getAdminPassword,
  getStaffPassword,
  getDefaultStaff,
} from './seed-config.mjs';

const prisma = new PrismaClient();

function isMissingBranchTableError(error) {
  return (
    error?.code === 'P2021' &&
    (error?.meta?.modelName === 'Branch' ||
      String(error?.meta?.table || '').toLowerCase().includes('branch'))
  );
}

async function ensureUserBranchLink(userId, branchId) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { branches: { select: { id: true } } },
  });
  if (!u) return;
  if (u.branches.some((b) => b.id === branchId)) return;
  await prisma.user.update({
    where: { id: userId },
    data: { branches: { connect: { id: branchId } } },
  });
}

async function main() {
  console.log('Seeding admins + default staff...\n');

  let branch = null;
  let supportsBranches = true;
  try {
    branch = await prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!branch) {
      branch = await prisma.branch.create({ data: { name: 'Main Branch' } });
      console.log(`  Created branch: ${branch.name}`);
    } else {
      console.log(`  Using branch: ${branch.name} (${branch.id})`);
    }
  } catch (error) {
    if (!isMissingBranchTableError(error)) {
      throw error;
    }
    supportsBranches = false;
    console.log('  Branch table not found; seeding users without branch links (legacy schema).');
  }

  const adminPassword = getAdminPassword();
  const staffPassword = getStaffPassword();
  const hashedAdmin = await bcrypt.hash(adminPassword, 12);
  const hashedStaff = await bcrypt.hash(staffPassword, 12);

  const ADMIN_EMAILS = getAdminEmails();
  for (const email of ADMIN_EMAILS) {
    const createData = {
      email,
      name: 'Admin',
      password: hashedAdmin,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      ...(supportsBranches && branch ? { branches: { connect: [{ id: branch.id }] } } : {}),
    };

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        password: hashedAdmin,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        verifyToken: null,
      },
      create: createData,
    });
    if (supportsBranches && branch) {
      await ensureUserBranchLink(user.id, branch.id);
    }
    console.log(`  Admin: ${user.email}`);
  }

  for (const staff of getDefaultStaff()) {
    const createData = {
      email: staff.email,
      name: staff.name,
      role: staff.role,
      password: hashedStaff,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      ...(supportsBranches && branch ? { branches: { connect: [{ id: branch.id }] } } : {}),
    };

    const user = await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        name: staff.name,
        role: staff.role,
        password: hashedStaff,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        verifyToken: null,
      },
      create: createData,
    });
    if (supportsBranches && branch) {
      await ensureUserBranchLink(user.id, branch.id);
    }
    console.log(`  Staff: ${user.email} (${user.role})`);
  }

  console.log('\nDone. Log in with emails above; passwords from .env:');
  console.log('  ADMIN_DEFAULT_PASSWORD (default Admin@123)');
  console.log('  STAFF_DEFAULT_PASSWORD (default Staff@123)\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
