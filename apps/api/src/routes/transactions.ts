import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import { appEvents } from '../events';
import { prisma } from '../lib/prisma';

const router = Router();

const updateGoalAmount = async (userId: string, goalId: string, amountChange: number) => {
  const goal = await prisma.savingsGoal.findFirst({
    where: { id: goalId, userId }
  });
  
  if (!goal) return;
  
  await prisma.savingsGoal.update({
    where: { id: goalId },
    data: {
      currentAmount: Math.max(0, Math.min(goal.currentAmount + amountChange, goal.targetAmount))
    }
  });
};

const transactionSchema = z.object({
  date: z.string().transform(str => new Date(str)),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense', 'transfer']),
  paymentMethod: z.enum(['card', 'cash']),
  cardType: z.enum(['debit', 'credit', 'virtual']).optional(),
  merchant: z.string().optional(),
  note: z.string().optional(),
  categoryId: z.string(),
  goalId: z.string().optional() // Optional link to savings goal
});

// Get all transactions (with optional filters)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'transactions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Transactions feature is not available' });
      }
    }

    const { month, categoryId, type } = req.query;
    
    const where: any = { userId: req.userId };
    
    if (month) {
      const [year, monthNum] = (month as string).split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }
    
    if (categoryId) {
      where.categoryId = categoryId;
    }
    
    if (type) {
      where.type = type;
    }
    
    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        category: true,
        goal: {
          select: { id: true, name: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    res.json(transactions);
  } catch (error) {
    next(error);
  }
});

// Get single transaction
router.get('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      },
      include: {
        category: true,
        goal: {
          select: { id: true, name: true }
        }
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    res.json(transaction);
  } catch (error) {
    next(error);
  }
});

// Create transaction
router.post('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'transactions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Transactions feature is not available' });
      }
    }

    const data = transactionSchema.parse(req.body);
    
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
    
    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId: req.userId!
      },
      include: {
        category: true,
        goal: {
          select: { id: true, name: true }
        }
      }
    });
    
    // If linked to a goal, update goal's currentAmount
    if (data.goalId && (data.type === 'income' || data.type === 'expense')) {
      const amountChange = data.type === 'income' ? data.amount : -data.amount;
      await updateGoalAmount(req.userId!, data.goalId, amountChange);
    }
    
    appEvents.emit('insights:update', { userId: req.userId });
    res.status(201).json(transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Update transaction
router.put('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'transactions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Transactions feature is not available' });
      }
    }
    const data = transactionSchema.parse(req.body);
    
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    const updated = await prisma.transaction.update({
      where: { id: req.params.id },
      data,
      include: {
        category: true,
        goal: {
          select: { id: true, name: true }
        }
      }
    });
    
    // Reverse old goal impact if needed
    if (transaction.goalId && (transaction.type === 'income' || transaction.type === 'expense')) {
      const reverseAmount = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      await updateGoalAmount(req.userId!, transaction.goalId, reverseAmount);
    }
    
    // Apply new goal impact if needed
    if (data.goalId && (data.type === 'income' || data.type === 'expense')) {
      const amountChange = data.type === 'income' ? data.amount : -data.amount;
      await updateGoalAmount(req.userId!, data.goalId, amountChange);
    }
    
    appEvents.emit('insights:update', { userId: req.userId });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Delete transaction
router.delete('/:id', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'transactions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Transactions feature is not available' });
      }
    }
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId: req.userId
      }
    });
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    await prisma.transaction.delete({
      where: { id: req.params.id }
    });
    
    // Reverse goal impact on delete
    if (transaction.goalId && (transaction.type === 'income' || transaction.type === 'expense')) {
      const reverseAmount = transaction.type === 'income' ? -transaction.amount : transaction.amount;
      await updateGoalAmount(req.userId!, transaction.goalId, reverseAmount);
    }
    
    appEvents.emit('insights:update', { userId: req.userId });
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
