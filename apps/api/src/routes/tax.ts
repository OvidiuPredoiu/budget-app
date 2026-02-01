import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();
router.use(authenticate);

// GET /api/tax/summary - Sumar taxe (venituri + deduceri)
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'tax');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Tax feature is not available' });
      }
    }
    const { year } = req.query;
    const selectedYear = parseInt(year as string) || new Date().getFullYear();

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(selectedYear, 0, 1),
          lte: new Date(selectedYear, 11, 31)
        }
      }
    });

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    res.json({
      year: selectedYear,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      taxableIncome: Math.max(0, totalIncome - (totalExpenses * 0.2)), // 20% deductible
      estimatedTax: Math.max(0, (totalIncome - (totalExpenses * 0.2)) * 0.16) // 16% tax rate
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch tax summary' });
  }
});

// GET /api/tax/estimate - Estimare taxă anuală
router.get('/estimate', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const currentYear = new Date().getFullYear();
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date()
        }
      }
    });

    const monthsPassed = new Date().getMonth() + 1;
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const estimatedAnnualIncome = (totalIncome / monthsPassed) * 12;
    const estimatedTax = Math.max(0, (estimatedAnnualIncome * 0.16) - 1000); // Standard deduction

    res.json({
      currentYear,
      monthsPassed,
      actualIncomeYTD: totalIncome,
      estimatedAnnualIncome,
      estimatedTax,
      estimatedMonthlyTax: estimatedTax / 12,
      message: `Based on ${monthsPassed} months of data`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to estimate tax' });
  }
});

// GET /api/tax/deductions - Deduceri posibile
router.get('/deductions', async (req: AuthRequest, res: Response) => {
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
      include: { category: true }
    });

    const deductibleCategories: any = {
      'Business Expenses': 1.0,
      'Office Supplies': 1.0,
      'Software': 0.8,
      'Transportation': 0.5,
      'Meals & Entertainment': 0.5,
      'Professional Development': 1.0
    };

    let totalDeductions = 0;
    const breakdown: any = {};

    transactions.forEach(t => {
      const categoryName = t.category.name;
      const deductionRate = deductibleCategories[categoryName] || 0;

      if (deductionRate > 0) {
        const deductionAmount = t.amount * deductionRate;
        totalDeductions += deductionAmount;

        if (!breakdown[categoryName]) {
          breakdown[categoryName] = { total: 0, deductible: 0 };
        }
        breakdown[categoryName].total += t.amount;
        breakdown[categoryName].deductible += deductionAmount;
      }
    });

    res.json({
      year: selectedYear,
      totalDeductions,
      breakdown,
      maxStandardDeduction: 12000
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch deductions' });
  }
});

// POST /api/tax/generate-report - Generează raport fiscal (PDF)
router.post('/generate-report', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { year } = req.body;
    const selectedYear = year || new Date().getFullYear();

    // Get summary data
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: new Date(selectedYear, 0, 1),
          lte: new Date(selectedYear, 11, 31)
        }
      }
    });

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const report = {
      year: selectedYear,
      generatedAt: new Date().toISOString(),
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      estimatedTax: (totalIncome * 0.16),
      transactionCount: transactions.length
    };

    res.json({
      success: true,
      reportUrl: `/tax-reports/${userId}_${selectedYear}.pdf`,
      report
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

export default router;
