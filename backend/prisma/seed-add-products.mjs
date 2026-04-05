/**
 * Add EXTRA_PRODUCTS_BY_CATEGORY to an existing database (skips duplicates by name+category).
 * Run: node --env-file=.env prisma/seed-add-products.mjs
 */
import { PrismaClient } from './generated/prisma/client.js';
import { EXTRA_PRODUCTS_BY_CATEGORY } from './product-catalog-extra.mjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding extra products by category (skip if name already exists)...\n');

  let added = 0;
  let skipped = 0;

  for (const [catName, products] of Object.entries(EXTRA_PRODUCTS_BY_CATEGORY)) {
    const cat = await prisma.category.findFirst({ where: { name: catName } });
    if (!cat) {
      console.warn(`  [skip] Category "${catName}" not found`);
      continue;
    }
    for (const p of products) {
      const exists = await prisma.product.findFirst({
        where: { categoryId: cat.id, name: p.name },
      });
      if (exists) {
        skipped += 1;
        console.log(`  — ${catName} / ${p.name} (already exists)`);
        continue;
      }
      await prisma.product.create({
        data: {
          name: p.name,
          price: p.price,
          description: p.description,
          taxPercent: p.taxPercent ?? 5,
          isActive: true,
          categoryId: cat.id,
        },
      });
      added += 1;
      console.log(`  + ${catName} / ${p.name}`);
    }
  }

  console.log(`\nDone. Added ${added}, skipped ${skipped}.\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
