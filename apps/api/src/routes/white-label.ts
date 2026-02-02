import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';
import { prisma } from '../lib/prisma';

const router = Router();
router.use(authenticate);

const ensureAccess = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  if (req.user?.role === 'admin') return true;
  const allowed = await hasPermission(userId, 'whiteLabel');
  if (!allowed) {
    res.status(403).json({ error: 'Access denied', message: 'White-label feature is not available' });
    return false;
  }
  return true;
};

// POST /api/white-label/setup - Configurează white-label
router.post('/setup', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;
    const { companyName, logo, colors, domain, email } = req.body;

    const config = await prisma.whiteLabelConfig.upsert({
      where: { userId },
      update: {
        companyName,
        logo,
        colors,
        domain,
        email,
        customDomain: domain ? `${domain}.budgetapp.io` : null,
        status: 'active'
      },
      create: {
        userId,
        companyName,
        logo,
        colors,
        domain,
        email,
        customDomain: domain ? `${domain}.budgetapp.io` : null,
        status: 'active'
      }
    });

    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to setup white-label' });
  }
});

// GET /api/white-label/config - Obține configurație
router.get('/config', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;

    const config = await prisma.whiteLabelConfig.findUnique({ where: { userId } });
    if (!config) {
      return res.status(404).json({ error: 'White-label config not found' });
    }

    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PATCH /api/white-label/config - Update configurație
router.patch('/config', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;
    const userId = req.userId!;
    const { companyName, logo, colors, domain, email, status } = req.body;

    const config = await prisma.whiteLabelConfig.upsert({
      where: { userId },
      update: {
        companyName,
        logo,
        colors,
        domain,
        email,
        status: status || undefined,
        customDomain: domain ? `${domain}.budgetapp.io` : undefined
      },
      create: {
        userId,
        companyName,
        logo,
        colors,
        domain,
        email,
        status: status || 'active',
        customDomain: domain ? `${domain}.budgetapp.io` : null
      }
    });

    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// POST /api/white-label/upload-logo - Upload logo
router.post('/upload-logo', async (req: AuthRequest, res: Response) => {
  try {
    if (!(await ensureAccess(req, res))) return;

    return res.status(501).json({ error: 'Logo upload not implemented' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

export default router;
