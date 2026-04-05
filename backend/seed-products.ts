import { PrismaClient } from './prisma/generated/prisma/client.js';

const prisma = new PrismaClient();

const coffeeNames = ['Espresso', 'Latte', 'Cappuccino', 'Americano', 'Macchiato', 'Mocha', 'Flat White', 'Affogato', 'Irish Coffee', 'Ristretto'];
const adjectives = ['Classic', 'Iced', 'Vanilla', 'Caramel', 'Hazelnut', 'Dark', 'Double', 'Spicy', 'Sweet', 'Premium'];
const pastries = ['Croissant', 'Muffin', 'Scone', 'Bagel', 'Brownie', 'Cookie', 'Tart', 'Cake Slice', 'Biscotti', 'Donut'];

async function main() {
  console.log('Seeding 50 products...');

  // Ensure there's at least one category
  let category = await prisma.category.findFirst({
    where: { name: 'Beverages' }
  });

  if (!category) {
    category = await prisma.category.create({
      data: { name: 'Beverages', icon: '☕', sortOrder: 1 }
    });
  }

  let foodCategory = await prisma.category.findFirst({
    where: { name: 'Food' }
  });

  if (!foodCategory) {
    foodCategory = await prisma.category.create({
      data: { name: 'Food', icon: '🥐', sortOrder: 2 }
    });
  }

  // Create 25 beverages
  for (let i = 0; i < 25; i++) {
    const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${coffeeNames[Math.floor(Math.random() * coffeeNames.length)]} ${i + 1}`;
    await prisma.product.create({
      data: {
        name,
        price: Math.floor(Math.random() * 300) + 150, // 150 to 450
        description: `A delicious ${name.toLowerCase()} prepared fresh.`,
        categoryId: category.id,
        taxPercent: 5,
        isActive: true,
      }
    });
  }

  // Create 25 food items
  for (let i = 0; i < 25; i++) {
    const name = `${adjectives[Math.floor(Math.random() * adjectives.length)]} ${pastries[Math.floor(Math.random() * pastries.length)]} ${i + 1}`;
    await prisma.product.create({
      data: {
        name,
        price: Math.floor(Math.random() * 200) + 100, // 100 to 300
        description: `A delicious ${name.toLowerCase()} baked fresh today.`,
        categoryId: foodCategory.id,
        taxPercent: 5,
        isActive: true,
      }
    });
  }

  console.log('Successfully seeded 50 products!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
