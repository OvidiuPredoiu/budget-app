import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();

// Middleware pentru autentificare
router.use(authenticate);

// POST /api/receipts/scan - Uploadează și procesează chitanță
router.post('/scan', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'receipts');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Receipts feature is not available' });
      }
    }
    const { imageUrl, extractedText, amount, merchant, date, description } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL required' });
    }

    // Salvează chitanța
    const receipt = await prisma.receipt.create({
      data: {
        userId,
        imageUrl,
        text: extractedText || '',
        merchant: merchant || 'Unknown',
        amount: amount ? parseFloat(amount) : null,
        date: date ? new Date(date) : new Date()
      }
    });

    // Încearcă să creeze o tranzacție automat
    if (amount && merchant) {
      try {
        const categories = await prisma.category.findMany({
          where: { userId },
          take: 1
        });

        const transaction = await prisma.transaction.create({
          data: {
            userId,
            categoryId: categories[0]?.id || '',
            type: 'expense',
            amount: parseFloat(amount),
            paymentMethod: 'card',
            merchant,
            date: date ? new Date(date) : new Date(),
            note: `Auto-created from receipt: ${description || ''}`
          }
        });

        // Actualizează chitanța cu tranzacția
        await prisma.receipt.update({
          where: { id: receipt.id },
          data: { transactionId: transaction.id }
        });

        return res.json({
          receipt,
          transaction,
          autoCreated: true,
          message: 'Chitanță scanată și tranzacție creată'
        });
      } catch (err) {
        // Dacă nu poate crea tranzacție automat, returnează doar chitanța
        return res.json({
          receipt,
          autoCreated: false,
          message: 'Chitanță scanată, dar tranzacția trebuie creată manual'
        });
      }
    }

    res.json({
      receipt,
      autoCreated: false,
      message: 'Chitanță scanată cu succes'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process receipt', details: err.message });
  }
});

// GET /api/receipts - Lista chitanțelor utilizatorului
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'receipts');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Receipts feature is not available' });
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

    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        transaction: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    res.json(receipts);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// GET /api/receipts/:id - Detalii chitanță
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'receipts');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Receipts feature is not available' });
      }
    }
    const { id } = req.params;

    const receipt = await prisma.receipt.findFirst({
      where: { id, userId },
      include: { transaction: true }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    res.json(receipt);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

// PATCH /api/receipts/:id - Actualizează chitanță
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'receipts');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Receipts feature is not available' });
      }
    }
    const { id } = req.params;
    const { merchant, amount, date, description } = req.body;

    const receipt = await prisma.receipt.findFirst({
      where: { id, userId }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    const updated = await prisma.receipt.update({
      where: { id },
      data: {
        merchant: merchant || receipt.merchant,
        amount: amount ? parseFloat(amount) : receipt.amount,
        date: date ? new Date(date) : receipt.date
      }
    });

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update receipt' });
  }
});

// POST /api/receipts/:id/create-transaction - Creează tranzacție din chitanță
router.post('/:id/create-transaction', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'receipts');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Receipts feature is not available' });
      }
    }
    const { id } = req.params;
    const { categoryId, note } = req.body;

    const receipt = await prisma.receipt.findFirst({
      where: { id, userId }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    if (!receipt.amount || !receipt.merchant) {
      return res.status(400).json({ error: 'Receipt missing amount or merchant' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        categoryId: categoryId || (await prisma.category.findFirst({ where: { userId } }))?.id || '',
        type: 'expense',
        amount: receipt.amount,
        paymentMethod: 'card',
        merchant: receipt.merchant,
        date: receipt.date || new Date(),
        note: note || `From receipt: ${receipt.merchant}`
      }
    });

    // Actualizează chitanța cu tranzacția
    await prisma.receipt.update({
      where: { id },
      data: { transactionId: transaction.id }
    });

    res.json({
      receipt,
      transaction,
      message: 'Tranzacție creată din chitanță'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// DELETE /api/receipts/:id - Șterge chitanță
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'receipts');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Receipts feature is not available' });
      }
    }
    const { id } = req.params;

    const receipt = await prisma.receipt.findFirst({
      where: { id, userId }
    });

    if (!receipt) {
      return res.status(404).json({ error: 'Receipt not found' });
    }

    await prisma.receipt.delete({ where: { id } });

    res.json({ message: 'Receipt deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete receipt' });
  }
});

// GET /api/receipts/stats/monthly - Statistici chitanțe pe lună
router.get('/stats/monthly', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'receipts');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Receipts feature is not available' });
      }
    }

    const receipts = await prisma.receipt.findMany({
      where: { userId, amount: { not: null } },
      orderBy: { date: 'desc' },
      take: 1000
    });

    const stats = receipts.reduce((acc: any, receipt) => {
      const month = receipt.date?.toISOString().substring(0, 7) || 'unknown';
      if (!acc[month]) {
        acc[month] = { month, count: 0, total: 0 };
      }
      acc[month].count += 1;
      acc[month].total += receipt.amount || 0;
      return acc;
    }, {});

    res.json(Object.values(stats).sort((a: any, b: any) => b.month.localeCompare(a.month)));
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
