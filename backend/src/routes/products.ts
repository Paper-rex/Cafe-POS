// @ts-nocheck
import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import '../types/index.js';

const categoriesRouter = Router();
const productsRouter = Router();


categoriesRouter.get('/', authenticate, async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


// POST /api/categories
categoriesRouter.post('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, icon, sortOrder } = req.body;
    if (!name) { res.status(400).json({ error: 'Name is required' }); return; }

    const category = await prisma.category.create({
      data: { name, icon, sortOrder: sortOrder || 0 },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/categories/:id
categoriesRouter.patch('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, icon, sortOrder } = req.body;
    const category = await prisma.category.update({
      where: { id: req.params.id as string },
      data: { ...(name && { name }), ...(icon !== undefined && { icon }), ...(sortOrder !== undefined && { sortOrder }) },
    });
    res.json(category);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Category not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/categories/:id
categoriesRouter.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const productCount = await prisma.product.count({ where: { categoryId: req.params.id as string } });
    if (productCount > 0) {
      res.status(409).json({ error: `Cannot delete: ${productCount} products in this category` });
      return;
    }
    await prisma.category.delete({ where: { id: req.params.id as string } });
    res.json({ message: 'Category deleted' });
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Category not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});


// GET /api/products
productsRouter.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { categoryId, active, search, page = '1', limit = '15' } = req.query;
    const where: any = {};
    if (categoryId) where.categoryId = categoryId;
    if (active === 'true') where.isActive = true;
    if (active === 'false') where.isActive = false;
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, icon: true } },
          variants: true,
          toppings: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      data: products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/products/:id
productsRouter.get('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id as string },
      include: { category: true, variants: true, toppings: true },
    });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

productsRouter.post('/', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, price, description, imageUrl, categoryId, taxPercent, variants, toppings } = req.body;

    if (!name || price === undefined || !categoryId) {
      res.status(400).json({ error: 'Name, price, and categoryId are required' });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name,
        price,
        description,
        imageUrl,
        categoryId,
        taxPercent: taxPercent || 5,
        variants: variants ? { create: variants } : undefined,
        toppings: toppings ? { create: toppings } : undefined,
      },
      include: { category: true, variants: true, toppings: true },
    });

    res.status(201).json(product);
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/products/:id
productsRouter.patch('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { name, price, description, imageUrl, categoryId, taxPercent, isActive, variants, toppings } = req.body;

    // Update basic fields
    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data: {
        ...(name && { name }),
        ...(price !== undefined && { price }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(categoryId && { categoryId }),
        ...(taxPercent !== undefined && { taxPercent }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { category: true, variants: true, toppings: true },
    });

    // If variants provided, replace them
    if (variants) {
      await prisma.variant.deleteMany({ where: { productId: req.params.id as string } });
      await prisma.variant.createMany({
        data: variants.map((v: any) => ({ ...v, productId: req.params.id as string })),
      });
    }

    // If toppings provided, replace them
    if (toppings) {
      await prisma.topping.deleteMany({ where: { productId: req.params.id as string } });
      await prisma.topping.createMany({
        data: toppings.map((t: any) => ({ ...t, productId: req.params.id as string })),
      });
    }

    // Refetch with updated relations
    const updated = await prisma.product.findUnique({
      where: { id: req.params.id as string },
      include: { category: true, variants: true, toppings: true },
    });

    res.json(updated);
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Product not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id (soft delete)
productsRouter.delete('/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  try {
    await prisma.product.update({
      where: { id: req.params.id as string },
      data: { isActive: false },
    });
    res.json({ message: 'Product deactivated' });
  } catch (error: any) {
    if (error.code === 'P2025') { res.status(404).json({ error: 'Product not found' }); return; }
    res.status(500).json({ error: 'Internal server error' });
  }
});

productsRouter.get('/api/products/page=${page}&limit=${limit}', async (req: Request, res: Response) => {
  const page = 1
  const limit = 10
  const nextstart = (page - 1) * limit

  const [products] = await prisma.product.findMany({
    skip: nextstart,
    take: limit,
    where: { isActive: true },
    include: { category: true },
    orderBy: { createdAt: 'asc' }
  })
  res.json(products)
})


export default { categories: categoriesRouter, products: productsRouter };
