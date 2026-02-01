import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

// Exchange rates cache
let exchangeRates: any = null;
let lastFetch = 0;

// Fetch from free API
async function getExchangeRates() {
  const now = Date.now();
  if (exchangeRates && (now - lastFetch) < 3600000) { // 1 hour cache
    return exchangeRates;
  }

  try {
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = (await response.json()) as { rates?: Record<string, number> };
    exchangeRates = data.rates || {};
    lastFetch = now;
    return exchangeRates;
  } catch (err) {
    console.error('Exchange rate fetch error:', err);
    return exchangeRates || {};
  }
}

const router = Router();
router.use(authMiddleware);

// GET /api/currency/rates - Get current exchange rates
router.get('/rates', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'currency');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }

    const baseCurrency = (req.query.base as string) || 'USD';
    const rates = await getExchangeRates();

    res.json({
      base: baseCurrency,
      rates,
      timestamp: new Date()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// POST /api/currency/convert - Convert amount between currencies
router.post('/convert', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'currency');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }

    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const rates = await getExchangeRates();

    // Get rate for conversion
    const fromRate = rates[fromCurrency] || 1;
    const toRate = rates[toCurrency] || 1;
    const converted = (amount / fromRate) * toRate;

    res.json({
      original: amount,
      fromCurrency,
      toCurrency,
      converted: Math.round(converted * 100) / 100,
      rate: Math.round((toRate / fromRate) * 100000) / 100000
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to convert currency' });
  }
});

// GET /api/currency/travel-report - Travel expenses report
router.get('/travel-report', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'currency');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }

    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
        type: 'expense'
      },
      include: { category: true }
    });

    // Group by travel-related categories
    const travelKeywords = ['travel', 'hotel', 'flight', 'taxi', 'restaurant', 'transport', 'vacanța', 'hotel', 'zbor'];
    const travelTx = transactions.filter(t =>
      travelKeywords.some(keyword => t.category.name.toLowerCase().includes(keyword))
    );

    const byCategory = travelTx.reduce((acc: any, t) => {
      if (!acc[t.category.name]) {
        acc[t.category.name] = { amount: 0, count: 0, transactions: [] };
      }
      acc[t.category.name].amount += t.amount;
      acc[t.category.name].count++;
      acc[t.category.name].transactions.push({
        date: t.date,
        amount: t.amount,
        merchant: t.merchant,
        note: t.note
      });
      return acc;
    }, {});

    const totalSpent = Object.values(byCategory).reduce((sum: number, cat: any) => sum + cat.amount, 0);

    res.json({
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalSpent: Math.round(totalSpent * 100) / 100,
      byCategory,
      avgPerDay: Math.round((totalSpent / Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))) * 100) / 100
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate travel report' });
  }
});

// POST /api/currency/transaction - Record multi-currency transaction
router.post('/transaction', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'currency');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }

    const { amount, originalCurrency, convertedAmount, convertedCurrency, categoryId, description, date } = req.body;

    const rates = await getExchangeRates();
    const rate = (convertedAmount / amount);

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: convertedAmount, // Stored in converted currency
        categoryId,
        type: 'expense',
        date: new Date(date || Date.now()),
        paymentMethod: 'card',
        merchant: description,
        note: `${amount} ${originalCurrency} = ${convertedAmount} ${convertedCurrency} (Rate: ${rate.toFixed(4)})`
      }
    });

    res.status(201).json({
      transactionId: transaction.id,
      original: amount,
      originalCurrency,
      converted: convertedAmount,
      convertedCurrency,
      rate: rate.toFixed(4)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record currency transaction' });
  }
});

// GET /api/currency/portfolio - Multi-currency portfolio summary
router.get('/portfolio', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'currency');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: { category: true }
    });

    // Extract currencies from notes
    const currencies: any = {};
    
    transactions.forEach(t => {
      if (t.note && t.note.includes('=')) {
        const parts = t.note.split('=');
        const match = parts[1]?.match(/(\d+)\s(\w{3})/);
        if (match) {
          const currency = match[2];
          const amount = parseFloat(match[1]);
          if (!currencies[currency]) {
            currencies[currency] = 0;
          }
          if (t.type === 'income') {
            currencies[currency] += amount;
          } else {
            currencies[currency] -= amount;
          }
        }
      }
    });

    res.json({
      currencies,
      totalTransactions: transactions.length,
      lastUpdated: new Date()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router;
