import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import crypto from 'crypto';

const router = Router();

// Middleware pentru autentificare
router.use(authenticate);

// Mock Plaid client - in production, use actual Plaid SDK
const generateLinkToken = () => crypto.randomBytes(16).toString('hex');

// POST /api/banking/link-token - Crea token pentru Plaid Link
router.post('/link-token', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'banking');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Banking feature is not available' });
      }
    }

    // In production, call Plaid API
    const linkToken = generateLinkToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    res.json({
      linkToken,
      expiresAt,
      redirectUri: `${process.env.FRONTEND_URL}/banking/callback`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate link token' });
  }
});

// POST /api/banking/exchange-token - Exchange public token pentru access token
router.post('/exchange-token', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'banking');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Banking feature is not available' });
      }
    }
    const { publicToken } = req.body;

    if (!publicToken) {
      return res.status(400).json({ error: 'Public token required' });
    }

    // In production, call Plaid exchangePublicToken API
    const accessToken = crypto.randomBytes(32).toString('hex');

    // Salvează integrarea
    const integration = await prisma.integration.upsert({
      where: {
        userId_provider: {
          userId,
          provider: 'plaid'
        }
      },
      update: {
        token: accessToken,
        isActive: true,
        metadata: JSON.stringify({ linkedAt: new Date().toISOString() })
      },
      create: {
        userId,
        type: 'bank',
        provider: 'plaid',
        token: accessToken,
        isActive: true,
        metadata: JSON.stringify({ linkedAt: new Date().toISOString() })
      }
    });

    res.json({
      success: true,
      message: 'Bank account linked successfully',
      integration
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// GET /api/banking/accounts - Lista conturi conectate
router.get('/accounts', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'banking');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Banking feature is not available' });
      }
    }

    const integration = await prisma.integration.findFirst({
      where: { userId, provider: 'plaid', isActive: true }
    });

    if (!integration) {
      return res.json({ accounts: [] });
    }

    // In production, call Plaid getAccounts API
    // For now, return mock data
    const accounts = [
      {
        id: 'checking_' + crypto.randomBytes(4).toString('hex'),
        name: 'Checking Account',
        type: 'depository',
        subtype: 'checking',
        mask: '1234',
        balance: 5000.50,
        currency: 'USD',
        verified: true
      },
      {
        id: 'savings_' + crypto.randomBytes(4).toString('hex'),
        name: 'Savings Account',
        type: 'depository',
        subtype: 'savings',
        mask: '5678',
        balance: 15000.00,
        currency: 'USD',
        verified: false
      }
    ];

    res.json({
      integration,
      accounts,
      linkedAt: integration.metadata ? JSON.parse(integration.metadata).linkedAt : null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST /api/banking/sync-transactions - Sincronizează tranzacții din bancă
router.post('/sync-transactions', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'banking');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Banking feature is not available' });
      }
    }
    const { accountId, startDate, endDate } = req.body;

    const integration = await prisma.integration.findFirst({
      where: { userId, provider: 'plaid', isActive: true }
    });

    if (!integration) {
      return res.status(400).json({ error: 'No Plaid account linked' });
    }

    // In production, call Plaid getTransactions API
    // For now, generate mock transactions
    const mockTransactions = [
      {
        id: 'txn_' + crypto.randomBytes(4).toString('hex'),
        date: new Date(startDate),
        merchant: 'Amazon',
        amount: -49.99,
        category: ['Shopping'],
        pending: false
      },
      {
        id: 'txn_' + crypto.randomBytes(4).toString('hex'),
        date: new Date(),
        merchant: 'Direct Deposit - Company Inc',
        amount: 3500.00,
        category: ['Transfer', 'Deposit'],
        pending: false
      }
    ];

    // Salvează tranzacții ca transactions
    const categories = await prisma.category.findMany({
      where: { userId },
      take: 1
    });

    const imported = [];
    for (const mockTxn of mockTransactions) {
      const existing = await prisma.transaction.findFirst({
        where: {
          userId,
          merchant: mockTxn.merchant,
          amount: mockTxn.amount,
          date: mockTxn.date
        }
      });

      if (!existing) {
        const txn = await prisma.transaction.create({
          data: {
            userId,
            categoryId: categories[0]?.id || '',
            type: mockTxn.amount > 0 ? 'income' : 'expense',
            amount: Math.abs(mockTxn.amount),
            paymentMethod: 'card',
            merchant: mockTxn.merchant,
            date: mockTxn.date,
            note: `Imported from Plaid - ${mockTxn.category.join(', ')}`
          }
        });
        imported.push(txn);
      }
    }

    res.json({
      success: true,
      imported: imported.length,
      message: `${imported.length} transactions synced`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to sync transactions' });
  }
});

// DELETE /api/banking/disconnect - Deconectează cont bancar
router.delete('/disconnect', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    await prisma.integration.updateMany({
      where: { userId, provider: 'plaid' },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Bank account disconnected' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// POST /api/banking/auto-categorize - Auto-categorizează tranzacții sincronizate
router.post('/auto-categorize', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        note: { contains: 'Imported from Plaid' }
      },
      include: { category: true }
    });

    const categoryMap: any = {
      'amazon': 'Shopping',
      'starbucks': 'Dining',
      'whole foods': 'Groceries',
      'gas': 'Transportation',
      'spotify': 'Entertainment',
      'netflix': 'Entertainment'
    };

    let categorized = 0;

    for (const txn of transactions) {
      const merchant = (txn.merchant || '').toLowerCase();
      let foundCategory = null;

      for (const [key, value] of Object.entries(categoryMap)) {
        if (merchant.includes(key)) {
          foundCategory = await prisma.category.findFirst({
            where: { userId, name: value as string }
          });
          break;
        }
      }

      if (foundCategory) {
        await prisma.transaction.update({
          where: { id: txn.id },
          data: { categoryId: foundCategory.id }
        });
        categorized++;
      }
    }

    res.json({
      success: true,
      categorized,
      message: `${categorized} transactions auto-categorized`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to auto-categorize' });
  }
});

export default router;
