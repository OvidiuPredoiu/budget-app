import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();
router.use(authMiddleware);

// POST /api/recurring - Create recurring transaction
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'recurring');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Recurring feature is not available' });
      }
    }
    const { amount, type, paymentMethod, description, categoryId, frequency, startDate, endDate } = req.body;

    if (!amount || !type || !categoryId || !frequency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const recurring = await prisma.recurringTransaction.create({
      data: {
        userId,
        amount,
        type,
        paymentMethod: paymentMethod || 'card',
        description,
        categoryId,
        frequency,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true
      }
    });

    res.status(201).json(recurring);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create recurring transaction' });
  }
});

// GET /api/recurring - List user's recurring transactions
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'recurring');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Recurring feature is not available' });
      }
    }
    const onlyActive = req.query.active === 'true';

    const recurring = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        ...(onlyActive && { isActive: true })
      },
      include: { category: true },
      orderBy: { startDate: 'desc' }
    });

    res.json(recurring);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch recurring transactions' });
  }
});

// GET /api/recurring/:id - Get specific recurring transaction
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'recurring');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Recurring feature is not available' });
      }
    }
    const { id } = req.params;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId },
      include: { category: true }
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    res.json(recurring);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch recurring transaction' });
  }
});

// PATCH /api/recurring/:id - Update recurring transaction
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'recurring');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Recurring feature is not available' });
      }
    }
    const { id } = req.params;
    const { amount, frequency, endDate, isActive, description } = req.body;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId }
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(amount !== undefined && { amount }),
        ...(frequency && { frequency }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(isActive !== undefined && { isActive }),
        ...(description && { description })
      },
      include: { category: true }
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update recurring transaction' });
  }
});

// DELETE /api/recurring/:id - Delete recurring transaction
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'recurring');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Recurring feature is not available' });
      }
    }
    const { id } = req.params;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId }
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    await prisma.recurringTransaction.delete({ where: { id } });
    res.json({ message: 'Recurring transaction deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete recurring transaction' });
  }
});

// POST /api/recurring/:id/run - Manually run recurring transaction
router.post('/:id/run', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'recurring');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Recurring feature is not available' });
      }
    }
    const { id } = req.params;

    const recurring = await prisma.recurringTransaction.findFirst({
      where: { id, userId }
    });

    if (!recurring) {
      return res.status(404).json({ error: 'Recurring transaction not found' });
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount: recurring.amount,
        type: recurring.type,
        paymentMethod: recurring.paymentMethod,
        categoryId: recurring.categoryId,
        date: new Date(),
        note: `Recurring: ${recurring.description} (${recurring.frequency})`,
        merchant: recurring.description
      }
    });

    // Update last run date
    await prisma.recurringTransaction.update({
      where: { id },
      data: { lastRunDate: new Date() }
    });

    res.status(201).json({
      transaction,
      message: 'Recurring transaction executed'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to run recurring transaction' });
  }
});

// GET /api/recurring/upcoming/list - List upcoming recurring transactions
router.get('/upcoming/list', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const days = parseInt(req.query.days as string) || 30;

    const recurring = await prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true
      },
      include: { category: true }
    });

    // Calculate next run dates
    const upcoming = recurring.map(r => {
      const now = new Date();
      let nextRun = r.lastRunDate ? new Date(r.lastRunDate) : new Date(r.startDate);

      // Calculate next run based on frequency
      switch (r.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'biweekly':
          nextRun.setDate(nextRun.getDate() + 14);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
        case 'yearly':
          nextRun.setFullYear(nextRun.getFullYear() + 1);
          break;
      }

      return {
        ...r,
        nextRunDate: nextRun,
        daysUntilRun: Math.floor((nextRun.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      };
    }).filter(r => r.daysUntilRun <= days && r.daysUntilRun >= 0);

    res.json(upcoming.sort((a, b) => a.daysUntilRun - b.daysUntilRun));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch upcoming transactions' });
  }
});

// POST /api/recurring/process-scheduled - Server cron job endpoint
router.post('/process-scheduled', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    
    // Get all active recurring transactions
    const recurringTx = await prisma.recurringTransaction.findMany({
      where: { isActive: true }
    });

    let processedCount = 0;

    for (const recurring of recurringTx) {
      let nextRun = recurring.lastRunDate ? new Date(recurring.lastRunDate) : new Date(recurring.startDate);

      // Calculate next run
      switch (recurring.frequency) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'biweekly':
          nextRun.setDate(nextRun.getDate() + 14);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
        case 'yearly':
          nextRun.setFullYear(nextRun.getFullYear() + 1);
          break;
      }

      // Check if should run today
      if (nextRun <= now && (!recurring.endDate || nextRun <= recurring.endDate)) {
        // Create transaction
        await prisma.transaction.create({
          data: {
            userId: recurring.userId,
            amount: recurring.amount,
            type: recurring.type,
            paymentMethod: recurring.paymentMethod,
            categoryId: recurring.categoryId,
            date: now,
            note: `Auto-recurring: ${recurring.description}`,
            merchant: recurring.description
          }
        });

        // Update last run date
        await prisma.recurringTransaction.update({
          where: { id: recurring.id },
          data: { lastRunDate: now }
        });

        processedCount++;
      }
    }

    res.json({
      message: 'Scheduled transactions processed',
      processed: processedCount
    });
  } catch (err: any) {
    console.error('Scheduled processing error:', err);
    res.status(500).json({ error: 'Failed to process scheduled transactions' });
  }
});

export default router;
