import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();
router.use(authenticate);

// POST /api/white-label/setup - Configurează white-label
router.post('/setup', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'whiteLabel');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'White-label feature is not available' });
      }
    }
    const { companyName, logo, colors, domain, email } = req.body;

    // TODO: Save to WhiteLabelConfig model

    res.json({
      success: true,
      config: {
        companyName,
        logo,
        colors,
        domain,
        email,
        customDomain: `${domain}.budgetapp.io`,
        status: 'active'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to setup white-label' });
  }
});

// GET /api/white-label/config - Obține configurație
router.get('/config', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'whiteLabel');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'White-label feature is not available' });
      }
    }

    // TODO: Fetch from WhiteLabelConfig model

    res.json({
      companyName: 'My Company',
      logo: 'https://example.com/logo.png',
      colors: {
        primary: '#10b981',
        secondary: '#06b6d4'
      },
      domain: 'mycompany',
      email: 'noreply@mycompany.com'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PATCH /api/white-label/config - Update configurație
router.patch('/config', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'whiteLabel');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'White-label feature is not available' });
      }
    }
    const { companyName, logo, colors, domain, email } = req.body;

    // TODO: Update WhiteLabelConfig model

    res.json({
      success: true,
      message: 'Configuration updated'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// POST /api/white-label/upload-logo - Upload logo
router.post('/upload-logo', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    // Check permission for non-admin users
    if (req.user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'whiteLabel');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'White-label feature is not available' });
      }
    }

    // TODO: Handle file upload (S3/local storage)

    res.json({
      success: true,
      logoUrl: 'https://cdn.budgetapp.io/logos/user_' + userId + '.png'
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

export default router;
