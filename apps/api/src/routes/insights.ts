import { Router } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import jwt from 'jsonwebtoken';
import { appEvents } from '../events';
import { prisma } from '../lib/prisma';

const router = Router();

const insightsQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/)
});

type InsightType = 'warning' | 'info' | 'success';

type InsightMessage = {
  type: InsightType;
  title: string;
  detail: string;
  date: string;
  transactionId: string | null;
  transactionDate: string | null;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount);
};

// SSE stream for insights updates
router.get('/stream', async (req, res) => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendPing = () => {
      res.write(`event: ping\ndata: {}\n\n`);
    };
    const pingId = setInterval(sendPing, 25000);

    const onUpdate = (payload: { userId?: string }) => {
      if (payload.userId === user.id) {
        res.write(`event: insights-update\ndata: ${JSON.stringify({ updatedAt: new Date().toISOString() })}\n\n`);
      }
    };

    appEvents.on('insights:update', onUpdate);

    req.on('close', () => {
      clearInterval(pingId);
      appEvents.off('insights:update', onUpdate);
      res.end();
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// AI-like insights (rule-based)
router.get('/', authenticate, async (req: AuthRequest, res, next) => {
  try {
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(req.userId!, 'insights');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Insights feature is not available' });
      }
    }
    const { month } = insightsQuerySchema.parse(req.query);

    const [year, monthNum] = month.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59);

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

    const lastTransaction = await prisma.transaction.findFirst({
      where: {
        userId: req.userId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'desc' },
      include: { category: true }
    });

    const messageDate = (lastTransaction?.date ?? new Date()).toISOString();
    const transactionId = lastTransaction?.id ?? null;
    const transactionDate = lastTransaction?.date ? lastTransaction.date.toISOString() : null;

    const budgets = await prisma.budget.findMany({
      where: {
        userId: req.userId,
        month
      },
      include: {
        category: true
      }
    });

    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const net = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? net / totalIncome : 0;

    const spendByCategory: { [key: string]: { name: string; amount: number; color?: string } } = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        if (!spendByCategory[t.categoryId]) {
          spendByCategory[t.categoryId] = {
            name: t.category.name,
            amount: 0,
            color: t.category.color || undefined
          };
        }
        spendByCategory[t.categoryId].amount += t.amount;
      });

    const spendByCategoryArray = Object.entries(spendByCategory)
      .map(([id, data]) => ({ categoryId: id, ...data }))
      .sort((a, b) => b.amount - a.amount);

    const overBudget = budgets
      .map(b => {
        const actual = spendByCategory[b.categoryId]?.amount || 0;
        return {
          categoryName: b.category.name,
          budget: b.amount,
          actual,
          diff: actual - b.amount
        };
      })
      .filter(b => b.diff > 0)
      .sort((a, b) => b.diff - a.diff);

    const remainingBudget = budgets
      .map(b => {
        const actual = spendByCategory[b.categoryId]?.amount || 0;
        return {
          categoryName: b.category.name,
          remaining: b.amount - actual
        };
      })
      .filter(b => b.remaining > 0)
      .sort((a, b) => b.remaining - a.remaining);

    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    const cashExpense = expenseTransactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + t.amount, 0);

    const cardExpense = expenseTransactions
      .filter(t => t.paymentMethod === 'card')
      .reduce((sum, t) => sum + t.amount, 0);

    const cashShare = totalExpense > 0 ? cashExpense / totalExpense : 0;

    const dailySpend: { [key: string]: number } = {};
    expenseTransactions.forEach(t => {
      const day = t.date.toISOString().split('T')[0];
      if (!dailySpend[day]) dailySpend[day] = 0;
      dailySpend[day] += t.amount;
    });
    const dailySpendValues = Object.values(dailySpend);
    const avgDaily = dailySpendValues.length > 0
      ? dailySpendValues.reduce((sum, v) => sum + v, 0) / dailySpendValues.length
      : 0;
    const maxDaily = dailySpendValues.length > 0 ? Math.max(...dailySpendValues) : 0;

    const messages: InsightMessage[] = [];

    if (totalIncome === 0 && totalExpense === 0) {
      messages.push({
        type: 'info',
        title: 'Începe cu primele tranzacții',
        detail: 'Nu am suficiente date pentru recomandări. Adaugă venituri și cheltuieli pentru a primi sfaturi utile.',
        date: messageDate,
        transactionId,
        transactionDate
      });
    }

    if (net < 0) {
      messages.push({
        type: 'warning',
        title: 'Cheltuieli peste venituri',
        detail: `Ai cheltuit cu ${formatCurrency(Math.abs(net))} mai mult decât ai câștigat. Încearcă să reduci din categoriile cu cele mai mari depășiri.`,
        date: messageDate,
        transactionId,
        transactionDate
      });
    } else if (totalIncome > 0) {
      const rate = Math.round(savingsRate * 100);
      if (rate < 10) {
        messages.push({
          type: 'warning',
          title: 'Rată mică de economisire',
          detail: `Economisești doar ${rate}%. Propunere: setează un obiectiv de 10–20% și ajustează cheltuielile.`,
          date: messageDate,
          transactionId,
          transactionDate
        });
      } else {
        messages.push({
          type: 'success',
          title: 'Echilibru sănătos',
          detail: `Economisești aproximativ ${rate}%. Continuă așa și păstrează ritmul.`,
          date: messageDate,
          transactionId,
          transactionDate
        });
      }
    }

    if (overBudget.length > 0) {
      const top = overBudget[0];
      messages.push({
        type: 'warning',
        title: 'Depășire de buget',
        detail: `Categoria ${top.categoryName} este peste buget cu ${formatCurrency(top.diff)}. Aici merită să încetinești.`,
        date: messageDate,
        transactionId,
        transactionDate
      });
    } else if (budgets.length > 0 && totalExpense > 0) {
      messages.push({
        type: 'success',
        title: 'Bugete respectate',
        detail: 'Felicitări! Cheltuielile sunt în limitele bugetelor setate.',
        date: messageDate,
        transactionId,
        transactionDate
      });
    }

    if (remainingBudget.length > 0) {
      const top = remainingBudget[0];
      messages.push({
        type: 'info',
        title: 'Spațiu de cheltuit',
        detail: `Ai încă ${formatCurrency(top.remaining)} rămas în ${top.categoryName}. Poți folosi mai mult acolo dacă ai nevoie.`,
        date: messageDate,
        transactionId,
        transactionDate
      });
    } else if (budgets.length === 0 && totalExpense > 0) {
      messages.push({
        type: 'info',
        title: 'Setează bugete',
        detail: 'Nu ai bugete setate. Adaugă bugete pe categorii pentru recomandări mai precise.',
        date: messageDate,
        transactionId,
        transactionDate
      });
    }

    if (spendByCategoryArray.length > 0 && totalExpense > 0) {
      const top = spendByCategoryArray[0];
      const share = Math.round((top.amount / totalExpense) * 100);
      if (share >= 40) {
        messages.push({
          type: 'warning',
          title: 'Concentrare mare într-o categorie',
          detail: `${top.name} reprezintă ${share}% din cheltuieli. Dacă poți, încearcă să distribui mai bine.`,
          date: messageDate,
          transactionId,
          transactionDate
        });
      }
    }

    if (cashShare >= 0.7 && totalExpense > 0) {
      messages.push({
        type: 'info',
        title: 'Cheltuieli cash ridicate',
        detail: `Aproximativ ${Math.round(cashShare * 100)}% din cheltuieli sunt cash. Notează-le constant pentru a nu pierde controlul.`,
        date: messageDate,
        transactionId,
        transactionDate
      });
    }

    if (avgDaily > 0 && maxDaily >= avgDaily * 2) {
      messages.push({
        type: 'warning',
        title: 'Zi cu cheltuieli neobișnuit de mari',
        detail: 'Am observat o zi cu cheltuieli mult peste medie. Merită revăzut ce s-a întâmplat atunci.',
        date: messageDate,
        transactionId,
        transactionDate
      });
    }

    const summary = totalIncome === 0 && totalExpense === 0
      ? 'Nu există încă date pentru analiză.'
      : net >= 0
        ? 'Ești pe plus. Continuă cu atenție și optimizează acolo unde apar depășiri.'
        : 'Ești pe minus. Prioritizează reducerea cheltuielilor în categoriile mari.';

    res.json({
      month,
      summary,
      messages,
      lastTransaction: lastTransaction
        ? {
            id: lastTransaction.id,
            date: lastTransaction.date.toISOString(),
            amount: lastTransaction.amount,
            type: lastTransaction.type,
            categoryName: lastTransaction.category.name
          }
        : null,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalIncome,
        totalExpense,
        net,
        savingsRate,
        cashShare,
        cardExpense
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

export default router;
