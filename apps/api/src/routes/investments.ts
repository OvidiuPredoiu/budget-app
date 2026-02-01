import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();
router.use(authenticate);

// POST /api/investments - Creează investiție
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'investments');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Investments feature is not available' });
      }
    }
    const { name, type, symbol, quantity, purchasePrice, currency, notes, purchaseDate } = req.body;

    const investment = await prisma.investment.create({
      data: {
        userId,
        name,
        type,
        symbol,
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        currentPrice: parseFloat(purchasePrice),
        currency,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        notes
      }
    });

    res.json(investment);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create investment' });
  }
});

// GET /api/investments - Lista investiții
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'investments');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Investments feature is not available' });
      }
    }
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    res.json(investments);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch investments' });
  }
});

// GET /api/investments/performance - Performanță portofoliu
router.get('/performance/summary', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'investments');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Investments feature is not available' });
      }
    }
    const investments = await prisma.investment.findMany({
      where: { userId }
    });

    let totalInvested = 0;
    let totalCurrent = 0;
    const performance: any = [];

    investments.forEach(inv => {
      const investedAmount = inv.quantity * inv.purchasePrice;
      const currentAmount = inv.quantity * (inv.currentPrice || inv.purchasePrice);
      const gain = currentAmount - investedAmount;
      const gainPercent = (gain / investedAmount) * 100;

      totalInvested += investedAmount;
      totalCurrent += currentAmount;

      performance.push({
        name: inv.name,
        symbol: inv.symbol,
        investedAmount,
        currentAmount,
        gain,
        gainPercent
      });
    });

    const totalGain = totalCurrent - totalInvested;
    const totalGainPercent = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

    res.json({
      totalInvested,
      totalCurrent,
      totalGain,
      totalGainPercent,
      performance,
      count: investments.length
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

// PATCH /api/investments/:id - Update investiție (preț curent)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'investments');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Investments feature is not available' });
      }
    }
    const { id } = req.params;
    const { currentPrice, quantity } = req.body;

    const investment = await prisma.investment.update({
      where: { id },
      data: {
        currentPrice: currentPrice ? parseFloat(currentPrice) : undefined,
        quantity: quantity ? parseFloat(quantity) : undefined
      }
    });

    res.json(investment);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update investment' });
  }
});

// DELETE /api/investments/:id - Șterge investiție
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'investments');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Investments feature is not available' });
      }
    }
    const { id } = req.params;

    await prisma.investment.delete({ where: { id } });
    res.json({ success: true, message: 'Investment deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete investment' });
  }
});

export default router;
