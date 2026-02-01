import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import { prisma } from '../lib/prisma';

const router = Router();

const dashboardQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

// Get dashboard data
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'dashboard');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Dashboard feature is not available' });
      }
    }

    const { month } = dashboardQuerySchema.parse(req.query);
    
    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);
    
    // Get all transactions for the month
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        category: true
      }
    });
    
    // Get budgets for the month
    const budgets = await prisma.budget.findMany({
      where: {
        userId: req.userId,
        month
      },
      include: {
        category: true
      }
    });
    
    // Calculate KPIs
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const net = totalIncome - totalExpense;
    
    // Spend by category (expenses only)
    const spendByCategory: { [key: string]: { name: string; amount: number; color?: string } } = {};
    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};

    transactions.forEach(t => {
      if (t.type === 'income') {
        incomeByCategory[t.categoryId] = (incomeByCategory[t.categoryId] || 0) + t.amount;
      }

      if (t.type === 'expense') {
        expenseByCategory[t.categoryId] = (expenseByCategory[t.categoryId] || 0) + t.amount;
        if (!spendByCategory[t.categoryId]) {
          spendByCategory[t.categoryId] = {
            name: t.category.name,
            amount: 0,
            color: t.category.color || undefined
          };
        }
        spendByCategory[t.categoryId].amount += t.amount;
      }
    });
    
    const spendByCategoryArray = Object.entries(spendByCategory).map(([id, data]) => ({
      categoryId: id,
      ...data
    }));
    
    // Top 3 categories
    const top3Categories = spendByCategoryArray
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
    
    // Daily spend trend
    const dailySpend: { [key: string]: number } = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const day = t.date.toISOString().split('T')[0];
        if (!dailySpend[day]) {
          dailySpend[day] = 0;
        }
        dailySpend[day] += t.amount;
      });
    
    const dailySpendArray = Object.entries(dailySpend)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Budget vs actual
    const budgetVsActual = budgets.map(budget => {
      const incomeActual = incomeByCategory[budget.categoryId] || 0;
      const expenseActual = expenseByCategory[budget.categoryId] || 0;
      const budgetType = incomeActual > 0 && incomeActual >= expenseActual ? 'income' : 'expense';
      const actual = budgetType === 'income' ? incomeActual : expenseActual;
      return {
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        categoryColor: budget.category.color,
        budget: budget.amount,
        actual,
        budgetType,
        remaining: budget.amount - actual,
        percentage: budget.amount > 0 ? (actual / budget.amount) * 100 : 0
      };
    });
    
    res.json({
      month,
      kpis: {
        totalIncome,
        totalExpense,
        net
      },
      spendByCategory: spendByCategoryArray,
      top3Categories,
      dailySpend: dailySpendArray,
      budgetVsActual
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

export default router;
