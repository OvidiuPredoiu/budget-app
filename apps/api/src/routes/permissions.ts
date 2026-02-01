import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get current user's permissions
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    let permissions = await prisma.userPermissions.findUnique({
      where: { userId },
    });

    if (!permissions) {
      permissions = await prisma.userPermissions.create({
        data: { userId },
      });
    }

    res.json(permissions);
  } catch (error) {
    console.error('Error fetching current user permissions:', error);
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

export default router;
