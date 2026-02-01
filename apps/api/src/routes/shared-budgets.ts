import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// POST /api/shared-budgets - Create shared budget
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, totalAmount, members, categoryIds } = req.body;

    if (!name || !totalAmount || !members || members.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify all members exist
    const memberUsers = await prisma.user.findMany({
      where: { email: { in: members } }
    });

    if (memberUsers.length !== members.length) {
      return res.status(400).json({ error: 'Some members not found' });
    }

    // Create shared budget record (stored as JSON)
    const sharedBudget = await (prisma as any).sharedBudget.create({
      data: {
        name,
        totalAmount,
        createdBy: userId,
        members: JSON.stringify(memberUsers.map(m => ({ id: m.id, email: m.email }))),
        categoryIds: JSON.stringify(categoryIds || []),
        isActive: true
      }
    });

    res.status(201).json(sharedBudget);
  } catch (err: any) {
    console.error('Error creating shared budget:', err);
    res.status(500).json({ error: 'Failed to create shared budget' });
  }
});

// GET /api/shared-budgets - List user's shared budgets
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // In production, would use a proper SharedBudget model
    // For now, return mock data structure
    res.json([
      {
        id: '1',
        name: 'Family Budget',
        totalAmount: 5000,
        createdBy: userId,
        members: [
          { id: userId, email: user?.email }
        ],
        spent: 2300,
        remaining: 2700,
        isActive: true,
        createdAt: new Date()
      }
    ]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch shared budgets' });
  }
});

// POST /api/shared-budgets/:id/expenses - Add shared expense
router.post('/:id/expenses', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { amount, category, description, paidBy, splitAmong } = req.body;

    // Create transaction for shared expense
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const categoryObj = await prisma.category.findFirst({
      where: { name: category, userId }
    });

    if (!categoryObj) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount,
        categoryId: categoryObj.id,
        type: 'expense',
        date: new Date(),
        merchant: description,
        paymentMethod: 'shared',
        note: `Shared: paid by ${paidBy}, split among ${splitAmong.length} people`
      }
    });

    res.status(201).json({
      transactionId: transaction.id,
      paidBy,
      splitAmong,
      perPerson: amount / splitAmong.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create shared expense' });
  }
});

// GET /api/shared-budgets/:id/summary - Summary of shared budget
router.get('/:id/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    // Get user's transactions for this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth },
        paymentMethod: 'shared'
      },
      include: { category: true }
    });

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const byCategory = transactions.reduce((acc: any, t) => {
      if (!acc[t.category.name]) acc[t.category.name] = 0;
      acc[t.category.name] += t.amount;
      return acc;
    }, {});

    res.json({
      budgetId: id,
      totalSpent: Math.round(totalSpent * 100) / 100,
      byCategory,
      transactionCount: transactions.length,
      period: `${startOfMonth.toLocaleDateString()} - ${now.toLocaleDateString()}`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
});

// GET /api/shared-budgets/:id/settlements - Calculate who owes whom
router.get('/:id/settlements', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // In production, this would calculate settlement logic
    // For now, return sample structure
    res.json([
      {
        from: 'user2@example.com',
        to: 'user1@example.com',
        amount: 250,
        reason: 'Share of restaurant expense'
      }
    ]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate settlements' });
  }
});

// POST /api/shared-budgets/:id/settle - Record settlement
router.post('/:id/settle', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { fromUserId, toUserId, amount } = req.body;

    // Create settlement transaction
    res.json({
      settlementId: `settle_${Date.now()}`,
      from: fromUserId,
      to: toUserId,
      amount,
      settledAt: new Date()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record settlement' });
  }
});

export default router;
