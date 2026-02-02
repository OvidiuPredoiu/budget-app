import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

const ensureAccess = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  if (req.user?.role === 'admin') return true;
  const allowed = await hasPermission(userId, 'developer');
  if (!allowed) {
    res.status(403).json({ error: 'Feature not accessible' });
    return false;
  }
  return true;
};

const hashKey = (value: string) =>
  crypto.createHash('sha256').update(value).digest('hex');

// POST /api/developer/api-keys - Creează API key
router.post('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const apiKey = 'buget_' + crypto.randomBytes(32).toString('hex');
    const keyHash = hashKey(apiKey);
    const keyPrefix = apiKey.slice(0, 8);
    const keyLast4 = apiKey.slice(-4);

    const created = await prisma.apiKey.create({
      data: {
        userId,
        name,
        keyHash,
        keyPrefix,
        keyLast4
      }
    });

    res.json({
      id: created.id,
      name: created.name,
      apiKey,
      createdAt: created.createdAt,
      lastUsed: created.lastUsedAt
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// GET /api/developer/api-keys - Lista API keys
router.get('/api-keys', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;

    const keys = await prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    res.json(
      keys.map((key) => ({
        id: key.id,
        name: key.name,
        apiKey: `${key.keyPrefix}...${key.keyLast4}`,
        createdAt: key.createdAt,
        lastUsed: key.lastUsedAt
      }))
    );
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// DELETE /api/developer/api-keys/:id - Șterge API key
router.delete('/api-keys/:id', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;
    const { id } = req.params;

    await prisma.apiKey.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date() }
    });

    res.json({ success: true, message: 'API key deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// GET /api/developer/webhooks - Lista webhook-uri
router.get('/webhooks', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;

    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(webhooks);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

// POST /api/developer/webhooks - Creează webhook
router.post('/webhooks', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;
    const { event, url } = req.body;

    if (!event || !url) {
      return res.status(400).json({ error: 'Event and URL are required' });
    }

    const webhook = await prisma.webhook.create({
      data: {
        userId,
        event,
        url,
        active: true
      }
    });

    res.json(webhook);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

// GET /api/developer/events - Event logs
router.get('/events', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;
    const { limit } = req.query;
    const take = parseInt(limit as string, 10) || 50;

    const events = await prisma.webhookEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take
    });

    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/developer/test-webhook - Testează webhook
router.post('/test-webhook', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const payload = { test: true, timestamp: new Date().toISOString() };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const duration = Date.now() - startedAt;
      await prisma.webhookEvent.create({
        data: {
          userId,
          event: 'test.webhook',
          status: response.ok ? 'success' : 'failed',
          statusCode: response.status,
          responseTimeMs: duration,
          payload
        }
      });

      res.json({
        success: response.ok,
        statusCode: response.status,
        responseTimeMs: duration
      });
    } catch (error) {
      const duration = Date.now() - startedAt;
      await prisma.webhookEvent.create({
        data: {
          userId,
          event: 'test.webhook',
          status: 'failed',
          responseTimeMs: duration,
          payload
        }
      });

      res.status(500).json({ error: 'Failed to send test webhook' });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

export default router;
