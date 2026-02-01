import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();
router.use(authenticate);

// POST /api/subscriptions - Creează abonament
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'subscriptions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Subscriptions feature is not available' });
      }
    }
    const { name, amount, frequency, nextBillingDate, paymentMethod, notes } = req.body;

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        name,
        amount: parseFloat(amount),
        frequency,
        nextBillingDate: new Date(nextBillingDate),
        paymentMethod,
        notes,
        status: 'active'
      }
    });

    res.json(subscription);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// GET /api/subscriptions - Lista abonamente
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'subscriptions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Subscriptions feature is not available' });
      }
    }
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      orderBy: { nextBillingDate: 'asc' }
    });
    res.json(subscriptions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// GET /api/subscriptions/analytics - Costuri lunare
router.get('/analytics/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'subscriptions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Subscriptions feature is not available' });
      }
    }
    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: 'active' }
    });

    const monthlyTotals: any = {};
    subscriptions.forEach(s => {
      const multiplier = s.frequency === 'monthly' ? 1 : s.frequency === 'yearly' ? 1/12 : s.frequency === 'weekly' ? 52/12 : 1;
      const monthlyAmount = s.amount * multiplier;
      
      for (let i = 0; i < 12; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const key = date.toISOString().substring(0, 7);
        if (!monthlyTotals[key]) monthlyTotals[key] = 0;
        monthlyTotals[key] += monthlyAmount;
      }
    });

    res.json({
      subscriptions,
      monthlyTotals,
      currentMonthTotal: Object.values(monthlyTotals)[0] || 0,
      annualTotal: Object.values(monthlyTotals).reduce((a: any, b: any) => a + b, 0)
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// PATCH /api/subscriptions/:id - Update abonament
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'subscriptions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Subscriptions feature is not available' });
      }
    }
    const { id } = req.params;
    const { status, nextBillingDate } = req.body;

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        status: status || undefined,
        nextBillingDate: nextBillingDate ? new Date(nextBillingDate) : undefined
      }
    });

    res.json(subscription);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// DELETE /api/subscriptions/:id - Șterge abonament
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'subscriptions');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Subscriptions feature is not available' });
      }
    }
    const { id } = req.params;

    await prisma.subscription.update({
      where: { id },
      data: { status: 'cancelled' }
    });

    res.json({ success: true, message: 'Subscription cancelled' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

export default router;
