import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();

// Middleware pentru autentificare
router.use(authenticate);

const plaidConfigured = Boolean(
  process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET
);

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

    if (!plaidConfigured) {
      return res.status(501).json({ error: 'Plaid integration not configured' });
    }

    return res.status(501).json({ error: 'Plaid integration not implemented' });
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

    if (!plaidConfigured) {
      return res.status(501).json({ error: 'Plaid integration not configured' });
    }

    return res.status(501).json({ error: 'Plaid integration not implemented' });
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

    if (!plaidConfigured) {
      return res.status(501).json({ error: 'Plaid integration not configured' });
    }

    res.json({
      integration,
      accounts: [],
      linkedAt: integration?.metadata ? JSON.parse(integration.metadata).linkedAt : null
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

    if (!plaidConfigured) {
      return res.status(501).json({ error: 'Plaid integration not configured' });
    }

    return res.status(501).json({ error: 'Plaid integration not implemented' });
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
