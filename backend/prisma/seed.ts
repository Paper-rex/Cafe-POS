import { PrismaClient, Role, UserStatus, TableShape } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@cafepos.local')
  .split(',')
  .map(e => e.trim());
const ADMIN_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';

async function main() {
  console.log('🌱 Seeding database...\n');

  // ─── Admin Users ────────────────────────────────
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  for (const email of ADMIN_EMAILS) {
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: 'Admin',
        password: hashedPassword,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      },
    });
    console.log(`  ✓ Admin user: ${user.email}`);
  }

  // ─── Payment Config (singleton) ─────────────────
  await prisma.paymentConfig.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      cashEnabled: true,
      cardEnabled: true,
      upiEnabled: false,
    },
  });
  console.log('  ✓ Payment config created');

  // ─── Floors & Tables ───────────────────────────
  const groundFloor = await prisma.floor.create({
    data: {
      name: 'Ground Floor',
      tables: {
        create: [
          { number: 1, seats: 2, shape: TableShape.ROUND,     posX: 15, posY: 20 },
          { number: 2, seats: 4, shape: TableShape.SQUARE,    posX: 40, posY: 20 },
          { number: 3, seats: 6, shape: TableShape.RECTANGLE, posX: 70, posY: 20 },
          { number: 4, seats: 2, shape: TableShape.ROUND,     posX: 15, posY: 60 },
          { number: 5, seats: 4, shape: TableShape.SQUARE,    posX: 40, posY: 60 },
          { number: 6, seats: 8, shape: TableShape.RECTANGLE, posX: 70, posY: 60 },
        ],
      },
    },
  });
  console.log(`  ✓ Floor: ${groundFloor.name} (6 tables)`);

  const upperFloor = await prisma.floor.create({
    data: {
      name: 'Upper Floor',
      tables: {
        create: [
          { number: 7,  seats: 2, shape: TableShape.ROUND,  posX: 20, posY: 30 },
          { number: 8,  seats: 4, shape: TableShape.SQUARE, posX: 50, posY: 30 },
          { number: 9,  seats: 4, shape: TableShape.SQUARE, posX: 80, posY: 30 },
          { number: 10, seats: 6, shape: TableShape.RECTANGLE, posX: 50, posY: 70 },
        ],
      },
    },
  });
  console.log(`  ✓ Floor: ${upperFloor.name} (4 tables)`);

  // ─── Categories & Products ─────────────────────
  const coffeeCategory = await prisma.category.create({
    data: {
      name: 'Coffee',
      icon: '☕',
      sortOrder: 1,
      products: {
        create: [
          {
            name: 'Espresso',
            price: 150,
            description: 'Rich single-shot espresso',
            taxPercent: 5,
            variants: {
              create: [
                { name: 'Size', options: [{ label: 'Single', extraPrice: 0 }, { label: 'Double', extraPrice: 60 }] },
              ],
            },
          },
          {
            name: 'Cappuccino',
            price: 200,
            description: 'Classic cappuccino with steamed milk foam',
            taxPercent: 5,
            variants: {
              create: [
                { name: 'Size', options: [{ label: 'S', extraPrice: 0 }, { label: 'M', extraPrice: 40 }, { label: 'L', extraPrice: 80 }] },
                { name: 'Sugar', options: [{ label: 'No Sugar', extraPrice: 0 }, { label: 'Less', extraPrice: 0 }, { label: 'Normal', extraPrice: 0 }] },
              ],
            },
            toppings: {
              create: [
                { name: 'Whipped Cream', price: 40 },
                { name: 'Chocolate Drizzle', price: 30 },
              ],
            },
          },
          {
            name: 'Latte',
            price: 220,
            description: 'Smooth espresso with steamed milk',
            taxPercent: 5,
            variants: {
              create: [
                { name: 'Size', options: [{ label: 'S', extraPrice: 0 }, { label: 'M', extraPrice: 40 }, { label: 'L', extraPrice: 80 }] },
                { name: 'Milk', options: [{ label: 'Regular', extraPrice: 0 }, { label: 'Oat', extraPrice: 40 }, { label: 'Almond', extraPrice: 50 }] },
              ],
            },
            toppings: {
              create: [
                { name: 'Vanilla Syrup', price: 35 },
                { name: 'Caramel Syrup', price: 35 },
              ],
            },
          },
          {
            name: 'Cold Brew',
            price: 250,
            description: '20-hour cold steeped coffee',
            taxPercent: 5,
          },
        ],
      },
    },
  });
  console.log(`  ✓ Category: ${coffeeCategory.name} (4 products)`);

  const teaCategory = await prisma.category.create({
    data: {
      name: 'Tea',
      icon: '🍵',
      sortOrder: 2,
      products: {
        create: [
          {
            name: 'Masala Chai',
            price: 80,
            description: 'Traditional Indian spiced tea',
            taxPercent: 5,
            variants: {
              create: [
                { name: 'Size', options: [{ label: 'Regular', extraPrice: 0 }, { label: 'Kulhad', extraPrice: 20 }] },
              ],
            },
          },
          {
            name: 'Green Tea',
            price: 120,
            description: 'Organic green tea with honey option',
            taxPercent: 5,
          },
          {
            name: 'Iced Tea',
            price: 150,
            description: 'Refreshing lemon iced tea',
            taxPercent: 5,
            variants: {
              create: [
                { name: 'Flavor', options: [{ label: 'Lemon', extraPrice: 0 }, { label: 'Peach', extraPrice: 20 }, { label: 'Berry', extraPrice: 20 }] },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  ✓ Category: ${teaCategory.name} (3 products)`);

  const snacksCategory = await prisma.category.create({
    data: {
      name: 'Snacks',
      icon: '🥐',
      sortOrder: 3,
      products: {
        create: [
          {
            name: 'Croissant',
            price: 120,
            description: 'Buttery flaky croissant',
            taxPercent: 5,
            variants: {
              create: [
                { name: 'Type', options: [{ label: 'Plain', extraPrice: 0 }, { label: 'Chocolate', extraPrice: 30 }, { label: 'Almond', extraPrice: 40 }] },
              ],
            },
          },
          {
            name: 'Panini Sandwich',
            price: 200,
            description: 'Grilled panini with veggies and cheese',
            taxPercent: 5,
          },
          {
            name: 'Garlic Bread',
            price: 150,
            description: 'Toasted garlic bread with herbs and butter',
            taxPercent: 5,
            toppings: {
              create: [
                { name: 'Extra Cheese', price: 40 },
              ],
            },
          },
          {
            name: 'French Fries',
            price: 130,
            description: 'Crispy golden french fries',
            taxPercent: 5,
            variants: {
              create: [
                { name: 'Size', options: [{ label: 'Regular', extraPrice: 0 }, { label: 'Large', extraPrice: 50 }] },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`  ✓ Category: ${snacksCategory.name} (4 products)`);

  const dessertsCategory = await prisma.category.create({
    data: {
      name: 'Desserts',
      icon: '🍰',
      sortOrder: 4,
      products: {
        create: [
          {
            name: 'Chocolate Brownie',
            price: 160,
            description: 'Warm fudgy chocolate brownie',
            taxPercent: 5,
            toppings: {
              create: [
                { name: 'Ice Cream Scoop', price: 60 },
                { name: 'Hot Chocolate Sauce', price: 30 },
              ],
            },
          },
          {
            name: 'Cheesecake',
            price: 220,
            description: 'New York style baked cheesecake',
            taxPercent: 5,
            variants: {
              create: [
                { name: 'Flavor', options: [{ label: 'Classic', extraPrice: 0 }, { label: 'Blueberry', extraPrice: 30 }, { label: 'Strawberry', extraPrice: 30 }] },
              ],
            },
          },
          {
            name: 'Tiramisu',
            price: 250,
            description: 'Classic Italian coffee-flavored dessert',
            taxPercent: 5,
          },
        ],
      },
    },
  });
  console.log(`  ✓ Category: ${dessertsCategory.name} (3 products)`);

  console.log('\n✅ Seeding complete!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
