/**
 * Seed historical orders + transactions for demo dashboards/reports.
 * Adds up to HISTORY_ORDER_COUNT tagged records (default 30) in an idempotent way.
 *
 * Run:
 *   npm run db:seed-history
 *
 * Optional env overrides:
 *   HISTORY_ORDER_COUNT=30
 *   HISTORY_DAYS_BACK=21
 *   HISTORY_BRANCH_INDEX=1
 *   HISTORY_BRANCH_ID=<branch-id>
 *   HISTORY_BRANCH_NAME=<branch-name>
 */
import { PrismaClient } from './generated/prisma/client.js';

const prisma = new PrismaClient();

const SEED_TAG = 'HISTORY_SEED_V1';
const TARGET_ORDERS = Math.max(1, Number.parseInt(process.env.HISTORY_ORDER_COUNT || '30', 10) || 30);
const MAX_DAYS_BACK = Math.max(7, Number.parseInt(process.env.HISTORY_DAYS_BACK || '21', 10) || 21);
const TARGET_BRANCH_INDEX = Math.max(1, Number.parseInt(process.env.HISTORY_BRANCH_INDEX || '1', 10) || 1);
const TARGET_BRANCH_ID = (process.env.HISTORY_BRANCH_ID || '').trim();
const TARGET_BRANCH_NAME = (process.env.HISTORY_BRANCH_NAME || '').trim().toLowerCase();

function roundMoney(value) {
  return Number(value.toFixed(2));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne(list) {
  return list[randInt(0, list.length - 1)];
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getDayKey(date) {
  return date.toISOString().split('T')[0];
}

function getDayBounds(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function formatOrderNumber(value) {
  return `ORD-${String(value).padStart(4, '0')}`;
}

function buildDayOffsets(count) {
  const offsets = [];
  const todayChunk = Math.min(8, count);
  const yesterdayChunk = Math.min(6, Math.max(0, count - todayChunk));
  const twoDaysChunk = Math.min(5, Math.max(0, count - todayChunk - yesterdayChunk));

  for (let i = 0; i < todayChunk; i += 1) offsets.push(0);
  for (let i = 0; i < yesterdayChunk; i += 1) offsets.push(1);
  for (let i = 0; i < twoDaysChunk; i += 1) offsets.push(2);
  while (offsets.length < count) offsets.push(randInt(3, MAX_DAYS_BACK));

  return shuffle(offsets);
}

function buildStatusPlan(count) {
  const cancelledCount = Math.min(5, Math.max(1, Math.floor(count * 0.18)));
  const paidCount = Math.max(0, count - cancelledCount);
  const statuses = [];
  for (let i = 0; i < paidCount; i += 1) statuses.push('PAID');
  for (let i = 0; i < cancelledCount; i += 1) statuses.push('CANCELLED');
  return shuffle(statuses);
}

function buildOrderDate(dayOffset) {
  const date = new Date();
  date.setDate(date.getDate() - dayOffset);
  date.setHours(randInt(9, 22), randInt(0, 59), randInt(0, 59), 0);
  return date;
}

async function getNextOrderNumberStart() {
  const rows = await prisma.order.findMany({ select: { orderNumber: true } });
  let max = 0;

  for (const row of rows) {
    const match = /^ORD-(\d+)$/i.exec(row.orderNumber || '');
    if (!match) continue;
    const value = Number.parseInt(match[1], 10);
    if (Number.isFinite(value)) max = Math.max(max, value);
  }

  return max + 1;
}

async function resolveTargetBranch() {
  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });

  if (branches.length === 0) return null;

  if (TARGET_BRANCH_ID) {
    const byId = branches.find((b) => b.id === TARGET_BRANCH_ID);
    if (!byId) {
      throw new Error(`Branch with HISTORY_BRANCH_ID=${TARGET_BRANCH_ID} not found.`);
    }
    return byId;
  }

  if (TARGET_BRANCH_NAME) {
    const byName = branches.find((b) => b.name.toLowerCase() === TARGET_BRANCH_NAME);
    if (!byName) {
      throw new Error(`Branch with HISTORY_BRANCH_NAME=${TARGET_BRANCH_NAME} not found.`);
    }
    return byName;
  }

  const idx = Math.min(TARGET_BRANCH_INDEX, branches.length) - 1;
  return branches[idx];
}

async function getOrCreateSessionForDate({ date, branchId, openedById, cache, todayActiveSession }) {
  const key = getDayKey(date);
  if (cache.has(key)) return cache.get(key);

  const { start, end } = getDayBounds(date);
  const todayKey = getDayKey(new Date());

  if (key === todayKey && todayActiveSession) {
    cache.set(key, todayActiveSession);
    return todayActiveSession;
  }

  let session = await prisma.posSession.findFirst({
    where: {
      branchId,
      openedAt: { gte: start, lt: end },
    },
    orderBy: { openedAt: 'asc' },
    select: { id: true, isActive: true },
  });

  if (!session) {
    const openedAt = new Date(start);
    openedAt.setHours(8, randInt(0, 40), 0, 0);

    const closedAt = new Date(start);
    closedAt.setHours(23, 15, 0, 0);

    session = await prisma.posSession.create({
      data: {
        branchId,
        openedById,
        openedAt,
        closedAt,
        isActive: false,
        totalSales: 0,
      },
      select: { id: true, isActive: true },
    });
  }

  cache.set(key, session);
  return session;
}

async function main() {
  console.log(`Seeding historical orders/transactions (target: ${TARGET_ORDERS})...\n`);

  const branch = await resolveTargetBranch();
  if (!branch) {
    throw new Error('No branch found. Run `npm run db:seed` first.');
  }

  console.log(`Target branch: ${branch.name} (${branch.id})`);

  const [
    tables,
    branchScopedWaiters,
    globalWaiters,
    branchScopedConfirmers,
    globalConfirmers,
    products,
    todayActiveSession,
    alreadySeededCount,
  ] = await Promise.all([
    prisma.table.findMany({
      where: { isActive: true, floor: { branchId: branch.id } },
      select: { id: true, number: true },
      orderBy: { number: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { in: ['WAITER', 'ADMIN'] },
        branches: { some: { id: branch.id } },
      },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { in: ['WAITER', 'ADMIN'] },
      },
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { in: ['CASHIER', 'ADMIN'] },
        branches: { some: { id: branch.id } },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        role: { in: ['CASHIER', 'ADMIN'] },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, price: true, taxPercent: true },
      orderBy: { name: 'asc' },
    }),
    prisma.posSession.findFirst({
      where: { branchId: branch.id, isActive: true },
      orderBy: { openedAt: 'desc' },
      select: { id: true, isActive: true },
    }),
    prisma.order.count({
      where: {
        branchId: branch.id,
        notes: { contains: `"source":"${SEED_TAG}"` },
      },
    }),
  ]);

  const waiters = branchScopedWaiters.length > 0 ? branchScopedWaiters : globalWaiters;
  const confirmers = branchScopedConfirmers.length > 0 ? branchScopedConfirmers : globalConfirmers;

  if (tables.length === 0) throw new Error('No active tables found for branch. Run `npm run db:seed` first.');
  if (waiters.length === 0) throw new Error('No active waiter/admin found in system. Run `npm run db:seed-users` first.');
  if (products.length < 3) throw new Error('Not enough products found. Run `npm run db:seed` first.');

  const paymentConfirmers = confirmers.length > 0 ? confirmers : waiters.map((u) => ({ id: u.id }));

  if (alreadySeededCount >= TARGET_ORDERS) {
    console.log(
      `Skipped: already seeded ${alreadySeededCount} historical orders for ${branch.name} tagged with ${SEED_TAG} (target ${TARGET_ORDERS}).\n`
    );
    return;
  }

  const toCreate = TARGET_ORDERS - alreadySeededCount;
  const dayOffsets = buildDayOffsets(toCreate);
  const statusPlan = buildStatusPlan(toCreate);
  const sessionCache = new Map();
  const touchedSessionIds = new Set();

  let nextOrderNumber = await getNextOrderNumberStart();
  let createdOrders = 0;
  let createdPaidPayments = 0;
  let createdFailedPayments = 0;

  for (let i = 0; i < toCreate; i += 1) {
    const orderDate = buildOrderDate(dayOffsets[i]);
    const session = await getOrCreateSessionForDate({
      date: orderDate,
      branchId: branch.id,
      openedById: waiters[0].id,
      cache: sessionCache,
      todayActiveSession,
    });
    touchedSessionIds.add(session.id);

    const lineCount = randInt(1, 4);
    const chosenProducts = shuffle(products).slice(0, lineCount);
    const orderStatus = statusPlan[i] || 'PAID';

    const items = chosenProducts.map((product) => {
      const quantity = randInt(1, 3);
      const subtotal = roundMoney(product.price * quantity);
      const taxPercent = roundMoney(product.taxPercent || 5);
      const taxAmount = roundMoney(subtotal * (taxPercent / 100));

      return {
        productId: product.id,
        name: product.name,
        unitPrice: roundMoney(product.price),
        quantity,
        subtotal,
        taxPercent,
        taxAmount,
        itemStatus: orderStatus === 'PAID' ? 'SERVED' : 'PENDING',
        isDone: orderStatus === 'PAID',
      };
    });

    const gross = roundMoney(items.reduce((sum, item) => sum + item.subtotal, 0));
    const taxTotal = roundMoney(items.reduce((sum, item) => sum + item.taxAmount, 0));
    const orderTotal = roundMoney(gross + taxTotal);

    const table = pickOne(tables);
    const waiter = pickOne(waiters);
    const paymentMethod = pickOne(['CASH', 'CARD', 'UPI']);
    const paymentStatus = orderStatus === 'PAID' ? 'PAID' : 'FAILED';
    const paymentCreatedAt = new Date(orderDate.getTime() + randInt(5, 45) * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        orderNumber: formatOrderNumber(nextOrderNumber),
        status: orderStatus,
        notes: JSON.stringify({
          source: SEED_TAG,
          generatedAt: new Date().toISOString(),
          bucket: dayOffsets[i] === 0 ? 'today' : 'history',
        }),
        createdAt: orderDate,
        tableId: table.id,
        waiterId: waiter.id,
        sessionId: session.id,
        branchId: branch.id,
        items: { create: items },
      },
      select: { id: true, orderNumber: true },
    });

    const amountTendered =
      paymentMethod === 'CASH' && paymentStatus === 'PAID'
        ? roundMoney(orderTotal + randInt(0, 5) * 10)
        : null;

    await prisma.payment.create({
      data: {
        orderId: order.id,
        method: paymentMethod,
        status: paymentStatus,
        amount: orderTotal,
        taxTotal,
        amountTendered,
        change: amountTendered !== null ? roundMoney(amountTendered - orderTotal) : null,
        upiQrData: paymentMethod === 'UPI' ? `SEED-${order.orderNumber}` : null,
        confirmedById: paymentStatus === 'PAID' ? pickOne(paymentConfirmers).id : null,
        createdAt: paymentCreatedAt,
      },
    });

    nextOrderNumber += 1;
    createdOrders += 1;
    if (paymentStatus === 'PAID') createdPaidPayments += 1;
    else createdFailedPayments += 1;
  }

  for (const sessionId of touchedSessionIds) {
    const paid = await prisma.payment.aggregate({
      where: {
        status: 'PAID',
        order: { sessionId },
      },
      _sum: { amount: true },
    });

    await prisma.posSession.update({
      where: { id: sessionId },
      data: { totalSales: roundMoney(paid._sum.amount || 0) },
    });
  }

  console.log(`Done for branch: ${branch.name}`);
  console.log(`  Created orders: ${createdOrders}`);
  console.log(`  Created payments (PAID): ${createdPaidPayments}`);
  console.log(`  Created payments (FAILED): ${createdFailedPayments}`);
  console.log(`  Existing tagged orders kept: ${alreadySeededCount}`);
  console.log('\nTip: Set HISTORY_BRANCH_INDEX=2 (or HISTORY_BRANCH_ID/HISTORY_BRANCH_NAME) before running to target another branch.\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
