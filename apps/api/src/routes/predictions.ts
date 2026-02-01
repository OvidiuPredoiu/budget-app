import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();
router.use(authMiddleware);

// Helper: calculează media și deviația standard
function calculateStats(values: number[]) {
  if (values.length === 0) return { mean: 0, stdDev: 0 };
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return { mean, stdDev };
}

// GET /api/predictions/expenses - Predict cheltuielile viitoare
router.get('/expenses', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'predictions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Predictions feature is not available' });
      }
    }
    const months = parseInt(req.query.months as string) || 3;

    // Collect last 12 months of transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        }
      },
      include: { category: true },
      orderBy: { date: 'asc' }
    });

    // Group by month and category
    const monthlyByCategory: any = {};
    transactions.forEach(t => {
      const monthKey = t.date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyByCategory[monthKey]) {
        monthlyByCategory[monthKey] = {};
      }
      if (!monthlyByCategory[monthKey][t.category.id]) {
        monthlyByCategory[monthKey][t.category.id] = {
          categoryName: t.category.name,
          amount: 0
        };
      }
      monthlyByCategory[monthKey][t.category.id].amount += t.amount;
    });

    // Predict next months
    const predictions: any[] = [];
    const now = new Date();

    for (let i = 1; i <= months; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = futureDate.toISOString().slice(0, 7);

      // Get historical data for this month
      const historicalMonths = Object.keys(monthlyByCategory).filter(m => m.endsWith(`-${String(futureDate.getMonth() + 1).padStart(2, '0')}`));
      
      const categoryPredictions: any = {};

      // For each category, calculate trend
      Object.keys(monthlyByCategory[Object.keys(monthlyByCategory)[0]] || {}).forEach(categoryId => {
        const historicalAmounts = historicalMonths
          .map(m => monthlyByCategory[m]?.[categoryId]?.amount || 0)
          .filter(a => a > 0);

        if (historicalAmounts.length > 0) {
          const { mean, stdDev } = calculateStats(historicalAmounts);
          const categoryName = monthlyByCategory[historicalMonths[0]]?.[categoryId]?.categoryName;

          categoryPredictions[categoryName] = {
            predicted: Math.round(mean * 100) / 100,
            confidence: Math.max(0, 1 - (stdDev / mean || 0)),
            historicalAvg: historicalAmounts.length
          };
        }
      });

      const totalPredicted = Object.values(categoryPredictions).reduce((sum: number, cat: any) => sum + cat.predicted, 0);

      predictions.push({
        month: monthKey,
        predictedTotal: Math.round(totalPredicted * 100) / 100,
        byCategory: categoryPredictions
      });
    }

    res.json(predictions);
  } catch (err: any) {
    console.error('Prediction error:', err);
    res.status(500).json({ error: 'Failed to predict expenses' });
  }
});

// GET /api/predictions/anomalies - Detectează cheltuieli neobișnuite
router.get('/anomalies', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const threshold = parseFloat(req.query.threshold as string) || 2; // 2 std dev

    // Last 3 months
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        }
      },
      include: { category: true },
      orderBy: { date: 'desc' }
    });

    // Group by category
    const byCategory: any = {};
    transactions.forEach(t => {
      if (!byCategory[t.category.id]) {
        byCategory[t.category.id] = {
          name: t.category.name,
          transactions: []
        };
      }
      byCategory[t.category.id].transactions.push(t);
    });

    // Find anomalies
    const anomalies: any[] = [];

    Object.values(byCategory).forEach((category: any) => {
      if (category.transactions.length < 3) return; // Need at least 3 transactions

      const amounts = category.transactions.map((t: any) => t.amount);
      const { mean, stdDev } = calculateStats(amounts);

      category.transactions.forEach((t: any) => {
        const zScore = (t.amount - mean) / (stdDev || 1);
        if (Math.abs(zScore) > threshold) {
          anomalies.push({
            transactionId: t.id,
            date: t.date,
            category: category.name,
            amount: t.amount,
            expectedAvg: Math.round(mean * 100) / 100,
            deviation: Math.round(zScore * 100) / 100,
            merchant: t.merchant,
            note: t.note,
            severity: Math.abs(zScore) > 3 ? 'high' : 'medium'
          });
        }
      });
    });

    res.json(anomalies.sort((a, b) => b.amount - a.amount));
  } catch (err: any) {
    console.error('Anomaly detection error:', err);
    res.status(500).json({ error: 'Failed to detect anomalies' });
  }
});

// GET /api/predictions/recommendations - Recomandări de economii
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Get last 6 months data
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'expense',
        date: {
          gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        }
      },
      include: { category: true }
    });

    const categories = await prisma.category.findMany({
      where: { userId },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    // Analyze spending patterns
    const recommendations: any[] = [];

    // By category
    const byCategory: any = {};
    transactions.forEach(t => {
      if (!byCategory[t.category.id]) {
        byCategory[t.category.id] = {
          name: t.category.name,
          amount: 0,
          count: 0
        };
      }
      byCategory[t.category.id].amount += t.amount;
      byCategory[t.category.id].count++;
    });

    const categoryArray = Object.values(byCategory) as any[];
    categoryArray.sort((a, b) => b.amount - a.amount);

    // Top spenders (if > 30% of total)
    const totalSpent = categoryArray.reduce((sum, c) => sum + c.amount, 0);
    categoryArray.forEach((cat, idx) => {
      const percentage = (cat.amount / totalSpent) * 100;
      if (percentage > 30) {
        recommendations.push({
          type: 'high_spending',
          category: cat.name,
          percentage: Math.round(percentage),
          amount: Math.round(cat.amount * 100) / 100,
          message: `Categoria "${cat.name}" reprezintă ${Math.round(percentage)}% din cheltuieli. Încearcă să o reduci cu 10%.`,
          potentialSavings: Math.round((cat.amount * 0.1) * 100) / 100,
          priority: 'high'
        });
      }
    });

    // Frequency analysis - too many small purchases
    Object.values(byCategory).forEach((cat: any) => {
      const avgPerTransaction = cat.amount / cat.count;
      if (cat.count > 20 && avgPerTransaction < 50) {
        recommendations.push({
          type: 'frequent_purchases',
          category: cat.name,
          frequency: cat.count,
          avgPerTransaction: Math.round(avgPerTransaction * 100) / 100,
          message: `Faci ${cat.count} cumpărături în categoria "${cat.name}". Consolidarea ar putea economisi până la 15%.`,
          potentialSavings: Math.round((cat.amount * 0.15) * 100) / 100,
          priority: 'medium'
        });
      }
    });

    // Subscription check
    const categoryNames = categoryArray.map(c => c.name.toLowerCase());
    const subscriptionKeywords = ['netflix', 'spotify', 'gym', 'abonament', 'subscription', 'premium'];
    const subscriptionCategories = categoryNames.filter(name =>
      subscriptionKeywords.some(keyword => name.includes(keyword))
    );

    if (subscriptionCategories.length > 0) {
      const totalSubscriptions = categoryArray
        .filter((_, idx) => subscriptionKeywords.some(keyword => categoryNames[idx].includes(keyword)))
        .reduce((sum, c) => sum + c.amount, 0);

      recommendations.push({
        type: 'subscriptions',
        message: `Cheltuiești ${Math.round(totalSubscriptions * 100) / 100} RON/lună pe abonamente. Revizuiește-le și anulează neutilizate.`,
        potentialSavings: Math.round((totalSubscriptions * 0.25) * 100) / 100,
        priority: 'medium'
      });
    }

    // Budget adherence
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: true }
    });

    budgets.forEach(budget => {
      const spent = byCategory[budget.categoryId]?.amount || 0;
      const percentage = (spent / budget.amount) * 100;
      if (percentage > 100) {
        recommendations.push({
          type: 'budget_exceeded',
          category: budget.category.name,
          budget: budget.amount,
          spent: spent,
          message: `Ai depășit bugetul pentru "${budget.category.name}" cu ${Math.round(spent - budget.amount)} RON.`,
          priority: 'high'
        });
      }
    });

    res.json(recommendations.sort((a, b) => {
      const priorityMap = { high: 0, medium: 1, low: 2 };
      return priorityMap[a.priority as keyof typeof priorityMap] - priorityMap[b.priority as keyof typeof priorityMap];
    }));
  } catch (err: any) {
    console.error('Recommendation error:', err);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// GET /api/predictions/financial-health - Financial health score
router.get('/financial-health', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true }
    });

    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const currentMonthTx = transactions.filter(t => t.date > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    
    const income = currentMonthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = currentMonthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expense;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    // Calculate categories diversity
    const categories = new Set(currentMonthTx.map(t => t.category.id)).size;
    const transactionCount = currentMonthTx.length;

    // Budget adherence
    const budgets = await prisma.budget.findMany({
      where: { userId }
    });

    const budgetAdherence = budgets.length > 0
      ? budgets.filter(b => {
          const spent = currentMonthTx
            .filter(t => t.categoryId === b.categoryId && t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
          return spent <= b.amount;
        }).length / budgets.length * 100
      : 100;

    // Calculate score (0-100)
    let score = 0;
    if (savingsRate > 20) score += 30; // 30% for good savings rate
    else if (savingsRate > 10) score += 20;
    else if (savingsRate > 0) score += 10;

    if (budgetAdherence >= 80) score += 30;
    else if (budgetAdherence >= 60) score += 20;
    else if (budgetAdherence >= 40) score += 10;

    if (categories >= 5) score += 20; // Diversity
    else if (categories >= 3) score += 10;

    if (transactionCount >= 20) score += 20; // Activity
    else if (transactionCount >= 10) score += 10;

    const health = {
      score: Math.round(score),
      grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      savingsRate: Math.round(savingsRate * 100) / 100,
      budgetAdherence: Math.round(budgetAdherence * 100) / 100,
      categoryDiversity: categories,
      transactionCount,
      recommendations: [] as string[]
    };

    if (health.savingsRate < 10) {
      health.recommendations.push('Încearcă să economisești mai mult - țintă: 20% din venit');
    }
    if (health.budgetAdherence < 80) {
      health.recommendations.push('Urmărești mai riguros bugetele tale');
    }
    if (health.categoryDiversity < 3) {
      health.recommendations.push('Creează mai multe categorii pentru o mai bună organizare');
    }

    res.json(health);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate financial health' });
  }
});

export default router;
