import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

// POST /api/developer/api-keys - Creează API key
router.post('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'developer');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }
    const { name } = req.body;

    const apiKey = 'buget_' + crypto.randomBytes(32).toString('hex');

    // TODO: Save API key in database (model APIKey)
    // For now, return mock

    res.json({
      id: crypto.randomUUID(),
      name,
      apiKey: apiKey.substring(0, 20) + '...', // Partially hidden
      fullKey: apiKey, // Show once
      createdAt: new Date(),
      lastUsed: null
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// GET /api/developer/api-keys - Lista API keys
router.get('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'developer');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }

    // TODO: Fetch from APIKey model
    res.json([
      {
        id: crypto.randomUUID(),
        name: 'Production API',
        apiKey: 'buget_production_key....',
        createdAt: new Date(),
        lastUsed: new Date(Date.now() - 3600000)
      }
    ]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// DELETE /api/developer/api-keys/:id - Șterge API key
router.delete('/api-keys/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'developer');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }
    const { id } = req.params;

    // TODO: Delete from APIKey model

    res.json({ success: true, message: 'API key deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// GET /api/developer/webhooks - Lista webhook-uri
router.get('/webhooks', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'developer');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }

    // TODO: Fetch from WebhookEvent model
    res.json([
      {
        id: crypto.randomUUID(),
        event: 'transaction.created',
        url: 'https://example.com/webhooks/transaction',
        active: true,
        createdAt: new Date()
      }
    ]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

// POST /api/developer/webhooks - Creează webhook
router.post('/webhooks', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'developer');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }
    const { event, url } = req.body;

    // TODO: Save to WebhookEvent model

    res.json({
      id: crypto.randomUUID(),
      event,
      url,
      active: true,
      createdAt: new Date()
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// GET /api/developer/events - Event logs
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'developer');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }
    const { limit } = req.query;
    const take = parseInt(limit as string) || 50;

    // TODO: Fetch from WebhookEvent model with logs

    res.json([
      {
        id: crypto.randomUUID(),
        event: 'transaction.created',
        status: 'success',
        statusCode: 200,
        timestamp: new Date(),
        payload: { transactionId: 'txn_123' }
      }
    ]);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/developer/test-webhook - Testează webhook
router.post('/test-webhook', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'developer');
      if (!allowed) {
        return res.status(403).json({ error: 'Feature not accessible' });
      }
    }
    const { url } = req.body;

    // TODO: Send test payload to webhook URL

    res.json({
      success: true,
      statusCode: 200,
      responseTime: '145ms'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

export default router;
