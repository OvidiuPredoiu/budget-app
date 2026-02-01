import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import { prisma } from '../lib/prisma';

const router = Router();

const categorySchema = z.object({
  name: z.string().min(1),
  color: z.string().optional()
});

// Get all categories
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'categories');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Categories feature is not available' });
      }
    }

    const categories = await prisma.category.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' }
    });

    const unique = new Map<string, typeof categories[number]>();
    categories.forEach((cat) => {
      const key = `${cat.name.trim().toLowerCase()}::${(cat.color || '').toLowerCase()}`;
      if (!unique.has(key)) {
        unique.set(key, cat);
      }
    });
    
    res.json(Array.from(unique.values()));
  } catch (error) {
    next(error);
  }
});

// Get single category
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'categories');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Categories feature is not available' });
      }
    }
    const category = await prisma.category.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'categories');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Categories feature is not available' });
      }
    }

    const data = categorySchema.parse(req.body);
    
    const category = await prisma.category.create({
      data: {
        ...data,
        userId: req.userId!
      }
    });
    
    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update category
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'categories');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Categories feature is not available' });
      }
    }
    const data = categorySchema.parse(req.body);
    
    const category = await prisma.category.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data
    });
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delete category
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'categories');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Categories feature is not available' });
      }
    }
    const category = await prisma.category.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    await prisma.category.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
