import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

const round2 = (value: number) => Math.round(value * 100) / 100;

const getBudgetWithMembers = async (budgetId: string, userId: string) => {
  return prisma.sharedBudget.findFirst({
    where: {
      id: budgetId,
      members: {
        some: { userId }
      }
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, email: true, name: true } }
        }
      }
    }
  });
};

const resolveMemberId = (
  value: string,
  membersById: Map<string, string>,
  membersByEmail: Map<string, string>
) => {
  if (membersById.has(value)) return value;
  if (membersByEmail.has(value)) return membersByEmail.get(value)!;
  return null;
};

// POST /api/shared-budgets - Create shared budget
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { name, totalAmount, members, categoryIds } = req.body;

    if (!name || !totalAmount || !members || members.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const memberUsers = await prisma.user.findMany({
      where: { email: { in: members } }
    });

    if (memberUsers.length !== members.length) {
      return res.status(400).json({ error: 'Some members not found' });
    }

    const uniqueMemberIds = new Set<string>([userId, ...memberUsers.map((m) => m.id)]);
    const membersData = Array.from(uniqueMemberIds).map((id) => ({
      userId: id,
      role: id === userId ? 'owner' : 'member'
    }));

    const sharedBudget = await prisma.sharedBudget.create({
      data: {
        name,
        totalAmount: Number(totalAmount),
        createdById: userId,
        categoryIds: categoryIds || [],
        isActive: true,
        members: {
          create: membersData
        }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        }
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

    const budgets = await prisma.sharedBudget.findMany({
      where: {
        members: { some: { userId } }
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const budgetIds = budgets.map((b) => b.id);
    const transactions = budgetIds.length
      ? await prisma.transaction.findMany({
          where: { sharedBudgetId: { in: budgetIds } },
          select: { sharedBudgetId: true, amount: true }
        })
      : [];

    const spentByBudget = transactions.reduce<Record<string, number>>((acc, txn) => {
      if (!txn.sharedBudgetId) return acc;
      acc[txn.sharedBudgetId] = (acc[txn.sharedBudgetId] || 0) + txn.amount;
      return acc;
    }, {});

    res.json(
      budgets.map((budget) => {
        const spent = round2(spentByBudget[budget.id] || 0);
        const remaining = round2(budget.totalAmount - spent);
        return {
          ...budget,
          spent,
          remaining,
          members: budget.members.map((m) => ({
            id: m.user.id,
            email: m.user.email,
            name: m.user.name,
            role: m.role
          }))
        };
      })
    );
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

    if (!amount || !category || !paidBy || !splitAmong || splitAmong.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const budget = await getBudgetWithMembers(id, userId);
    if (!budget) {
      return res.status(404).json({ error: 'Shared budget not found' });
    }

    const membersByEmail = new Map(budget.members.map((m) => [m.user.email, m.user.id]));
    const membersById = new Map(budget.members.map((m) => [m.user.id, m.user.id]));

    const paidById = resolveMemberId(paidBy, membersById, membersByEmail);
    if (!paidById) {
      return res.status(400).json({ error: 'Paid by user is not a budget member' });
    }

    const splitIds = splitAmong
      .map((value: string) => resolveMemberId(value, membersById, membersByEmail))
      .filter((value: string | null): value is string => Boolean(value));

    if (splitIds.length !== splitAmong.length) {
      return res.status(400).json({ error: 'Some split members are not part of this budget' });
    }

    const categoryObj = await prisma.category.findFirst({
      where: {
        userId,
        OR: [{ id: category }, { name: category }]
      }
    });

    if (!categoryObj) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: Number(amount),
        categoryId: categoryObj.id,
        type: 'expense',
        date: new Date(),
        merchant: description,
        paymentMethod: 'shared',
        sharedBudgetId: id,
        note: `Shared: paid by ${paidById}, split among ${splitIds.length} people`
      }
    });

    await prisma.sharedExpense.create({
      data: {
        budgetId: id,
        transactionId: transaction.id,
        paidByUserId: paidById,
        splitAmong: splitIds,
        amount: Number(amount)
      }
    });

    res.status(201).json({
      transactionId: transaction.id,
      paidBy: paidById,
      splitAmong: splitIds,
      perPerson: round2(Number(amount) / splitIds.length)
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

    const budget = await getBudgetWithMembers(id, userId);
    if (!budget) {
      return res.status(404).json({ error: 'Shared budget not found' });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const transactions = await prisma.transaction.findMany({
      where: {
        sharedBudgetId: id,
        date: { gte: startOfMonth }
      },
      include: { category: true }
    });

    const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
    const byCategory = transactions.reduce<Record<string, number>>((acc, t) => {
      const name = t.category?.name || 'Uncategorized';
      acc[name] = (acc[name] || 0) + t.amount;
      return acc;
    }, {});

    res.json({
      budgetId: id,
      totalSpent: round2(totalSpent),
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
    const { id } = req.params;

    const budget = await getBudgetWithMembers(id, userId);
    if (!budget) {
      return res.status(404).json({ error: 'Shared budget not found' });
    }

    const membersById = new Map(budget.members.map((m) => [m.user.id, m.user.email]));
    const balances = new Map<string, number>();
    for (const member of budget.members) {
      balances.set(member.user.id, 0);
    }

    const expenses = await prisma.sharedExpense.findMany({
      where: { budgetId: id }
    });

    for (const expense of expenses) {
      const splitAmong = expense.splitAmong as string[];
      const perPerson = expense.amount / splitAmong.length;
      balances.set(expense.paidByUserId, (balances.get(expense.paidByUserId) || 0) + expense.amount);
      for (const memberId of splitAmong) {
        balances.set(memberId, (balances.get(memberId) || 0) - perPerson);
      }
    }

    const settlements = await prisma.sharedSettlement.findMany({
      where: { budgetId: id }
    });

    for (const settlement of settlements) {
      balances.set(settlement.fromUserId, (balances.get(settlement.fromUserId) || 0) + settlement.amount);
      balances.set(settlement.toUserId, (balances.get(settlement.toUserId) || 0) - settlement.amount);
    }

    const debtors = Array.from(balances.entries())
      .filter(([, amount]) => amount < -0.01)
      .map(([userId, amount]) => ({ userId, amount: Math.abs(amount) }));
    const creditors = Array.from(balances.entries())
      .filter(([, amount]) => amount > 0.01)
      .map(([userId, amount]) => ({ userId, amount }));

    const transfers = [] as Array<{ from: string; to: string; amount: number }>;
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(debtor.amount, creditor.amount);
      transfers.push({
        from: membersById.get(debtor.userId) || debtor.userId,
        to: membersById.get(creditor.userId) || creditor.userId,
        amount: round2(amount)
      });
      debtor.amount -= amount;
      creditor.amount -= amount;
      if (debtor.amount <= 0.01) i += 1;
      if (creditor.amount <= 0.01) j += 1;
    }

    res.json(transfers);
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

    const budget = await getBudgetWithMembers(id, userId);
    if (!budget) {
      return res.status(404).json({ error: 'Shared budget not found' });
    }

    const memberIds = new Set(budget.members.map((m) => m.user.id));
    if (!memberIds.has(fromUserId) || !memberIds.has(toUserId)) {
      return res.status(400).json({ error: 'Users must be members of this budget' });
    }

    const settlement = await prisma.sharedSettlement.create({
      data: {
        budgetId: id,
        fromUserId,
        toUserId,
        amount: Number(amount),
        createdById: userId
      }
    });

    res.json(settlement);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record settlement' });
  }
});

export default router;
