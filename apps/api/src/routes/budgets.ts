import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import { prisma } from '../lib/prisma';

const router = Router();

const budgetSchema = z.object({
  name: z.string().min(1).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().positive(),
  categoryId: z.string()
});

// Get all budgets (with optional month filter)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'budgets');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Budgets feature is not available' });
      }
    }
    const { month } = req.query;
    
    const budgets = await prisma.budget.findMany({
      where: {
        userId: req.userId,
        ...(month && { month: month as string })
      },
      include: {
        category: true
      },
      orderBy: { month: 'desc' }
    });
    
    // Calculate spent amount for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        // Get start and end date for the month
        const [year, monthNum] = budget.month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0, 23, 59, 59);
        
        // Sum all expense transactions for this category in this month
        const result = await prisma.transaction.aggregate({
          where: {
            userId: req.userId,
            categoryId: budget.categoryId,
            type: 'expense',
            date: {
              gte: startDate,
              lte: endDate
            }
          },
          _sum: {
            amount: true
          }
        });
        
        const spent = result._sum.amount || 0;
        const remaining = budget.amount - spent;
        const percentage = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0;
        
        return {
          ...budget,
          spent,
          remaining,
          percentage
        };
      })
    );
    
    res.json(budgetsWithSpent);
  } catch (error) {
    next(error);
  }
});

// Get single budget
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'budgets');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Budgets feature is not available' });
      }
    }
    const budget = await prisma.budget.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        category: true
      }
    });
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    res.json(budget);
  } catch (error) {
    next(error);
  }
});

// Create budget
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'budgets');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Budgets feature is not available' });
      }
    }
    const data = budgetSchema.parse(req.body);
    
    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: data.categoryId,
        userId: req.userId
      }
    });
    
    if (!category) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    
    const budget = await prisma.budget.create({
      data: {
        ...data,
        userId: req.userId!
      },
      include: {
        category: true
      }
    });
    
    res.status(201).json(budget);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update budget
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'budgets');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Budgets feature is not available' });
      }
    }
    const data = budgetSchema.parse(req.body);
    
    const budget = await prisma.budget.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    const updated = await prisma.budget.update({
      where: { id: req.params.id },
      data,
      include: {
        category: true
      }
    });
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delete budget
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'budgets');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Budgets feature is not available' });
      }
    }
    const budget = await prisma.budget.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!budget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    await prisma.budget.delete({
      where: { id: req.params.id }
    });
    
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
