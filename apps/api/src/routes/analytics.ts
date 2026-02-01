import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();

// Middleware pentru autentificare
router.use(authenticate);

// GET /api/analytics/sankey - Date pentru Sankey diagram (flux bani)
router.get('/sankey', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'analytics');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Analytics feature is not available' });
      }
    }
    const { month, year } = req.query;

    let where: any = { userId };
    if (month && year) {
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' }
    });

    // Construiește Sankey nodes și links
    const sources: any = {};
    const targets: any = {};
    const links: any[] = [];

    transactions.forEach((t) => {
      const type = t.type === 'income' ? 'Income' : 'Expenses';
      const category = t.category.name;

      // Source (Income/Expenses)
      if (!sources[type]) {
        sources[type] = { id: type, amount: 0 };
      }
      sources[type].amount += t.amount;

      // Target (Category)
      const targetId = `${type}-${category}`;
      if (!targets[targetId]) {
        targets[targetId] = { id: targetId, name: category, type, amount: 0 };
      }
      targets[targetId].amount += t.amount;

      // Link
      links.push({
        source: type,
        target: targetId,
        value: t.amount
      });
    });

    const nodes = [
      ...Object.values(sources),
      ...Object.values(targets)
    ];

    res.json({
      nodes,
      links,
      totalIncome: Object.values(sources).reduce((sum: number, s: any) => sum + s.amount, 0),
      totalExpenses: Object.values(sources).reduce((sum: number, s: any) => sum + (s.type === 'Expenses' ? s.amount : 0), 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sankey data' });
  }
});

// GET /api/analytics/heatmap - Date pentru spending heatmap (calendar)
router.get('/heatmap', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { year } = req.query;
    const selectedYear = parseInt(year as string) || new Date().getFullYear();

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: new Date(selectedYear, 0, 1),
          lte: new Date(selectedYear, 11, 31)
        }
      },
      select: { amount: true, date: true }
    });

    // Group by day
    const heatmapData: any = {};
    transactions.forEach((t) => {
      const dateKey = t.date.toISOString().split('T')[0];
      if (!heatmapData[dateKey]) {
        heatmapData[dateKey] = 0;
      }
      heatmapData[dateKey] += t.amount;
    });

    // Convert to array with month/day/value
    const data = Object.entries(heatmapData).map(([date, amount]) => ({
      date,
      amount,
      month: new Date(date).getMonth() + 1,
      day: new Date(date).getDate(),
      dayOfWeek: new Date(date).getDay()
    }));

    res.json({
      year: selectedYear,
      data,
      maxAmount: Math.max(...data.map(d => d.amount as number), 0),
      totalSpent: data.reduce((sum, d) => sum + (d.amount as number), 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch heatmap data' });
  }
});

// GET /api/analytics/custom - Date flexible pentru chart-uri personalizate
router.get('/custom', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { type, month, year, groupBy } = req.query;

    let where: any = { userId };
    const groupByType = groupBy || 'category';

    if (month && year) {
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 0);
      where.date = {
        gte: startDate,
        lte: endDate
      };
    }

    if (type) {
      where.type = type;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' }
    });

    // Group transactions
    const grouped: any = {};

    transactions.forEach((t) => {
      let groupKey = '';
      if (groupByType === 'category') {
        groupKey = t.category.name;
      } else if (groupByType === 'day') {
        groupKey = t.date.toISOString().split('T')[0];
      } else if (groupByType === 'week') {
        const date = new Date(t.date);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        groupKey = new Date(date.setDate(diff)).toISOString().split('T')[0];
      } else if (groupByType === 'type') {
        groupKey = t.type;
      }

      if (!grouped[groupKey]) {
        grouped[groupKey] = { name: groupKey, count: 0, total: 0, transactions: [] };
      }
      grouped[groupKey].count += 1;
      grouped[groupKey].total += t.amount;
      grouped[groupKey].transactions.push(t);
    });

    const data = Object.values(grouped).sort((a: any, b: any) => b.total - a.total);

    res.json({
      groupBy: groupByType,
      type: type || 'all',
      data,
      summary: {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        avgAmount: transactions.length > 0 ? transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length : 0
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch custom analytics data' });
  }
});

// GET /api/analytics/daily - Date zilnice pentru mini-charts
router.get('/daily', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { days } = req.query;
    const lookbackDays = parseInt(days as string) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      include: { category: true },
      orderBy: { date: 'asc' }
    });

    // Group by day
    const dailyData: any = {};

    for (let i = lookbackDays; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = {
        date: dateKey,
        income: 0,
        expense: 0,
        net: 0
      };
    }

    transactions.forEach((t) => {
      const dateKey = t.date.toISOString().split('T')[0];
      if (dailyData[dateKey]) {
        if (t.type === 'income') {
          dailyData[dateKey].income += t.amount;
        } else {
          dailyData[dateKey].expense += t.amount;
        }
        dailyData[dateKey].net = dailyData[dateKey].income - dailyData[dateKey].expense;
      }
    });

    const data = Object.values(dailyData);

    res.json({
      data,
      summary: {
        totalIncome: data.reduce((sum: number, d: any) => sum + d.income, 0),
        totalExpense: data.reduce((sum: number, d: any) => sum + d.expense, 0),
        netBalance: data.reduce((sum: number, d: any) => sum + d.net, 0)
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch daily analytics' });
  }
});

// GET /api/analytics/category-trends - Tendințe pe categorii
router.get('/category-trends', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { months } = req.query;
    const lookbackMonths = parseInt(months as string) || 6;

    const trends: any = {};

    for (let i = lookbackMonths - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = date.toISOString().substring(0, 7);

      const startDate = new Date(date.getFullYear(), date.getMonth(), 1);
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const transactions = await prisma.transaction.findMany({
        where: {
          userId,
          type: 'expense',
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: { category: true }
      });

      transactions.forEach((t) => {
        const categoryName = t.category.name;
        if (!trends[categoryName]) {
          trends[categoryName] = [];
        }
        trends[categoryName].push({
          month: monthKey,
          amount: t.amount
        });
      });
    }

    // Consolidate monthly totals per category
    const data = Object.entries(trends).map(([category, entries]: [string, any]) => {
      const monthlyTotals: any = {};
      entries.forEach((e: any) => {
        if (!monthlyTotals[e.month]) {
          monthlyTotals[e.month] = 0;
        }
        monthlyTotals[e.month] += e.amount;
      });

      return {
        category,
        months: monthlyTotals
      };
    });

    res.json({
      lookbackMonths,
      data
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch category trends' });
  }
});

export default router;
