import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware } from '../middleware/auth';
import { hasPermission } from '../middleware/checkPermission';

const router = Router();
router.use(authMiddleware);

// POST /api/goals - Create savings goal
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'goals');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Goals feature is not available' });
      }
    }
    const { name, targetAmount, deadline, color, icon, description } = req.body;

    const goal = await prisma.savingsGoal.create({
      data: {
        userId,
        name,
        targetAmount,
        deadline: deadline ? new Date(deadline) : null,
        color,
        icon,
        description,
        currentAmount: 0
      }
    });

    res.status(201).json(goal);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create savings goal' });
  }
});

// GET /api/goals - List user's goals
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'goals');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Goals feature is not available' });
      }
    }
    const goals = await prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { deadline: 'asc' }
    });

    const enriched = goals.map(g => ({
      ...g,
      progress: (g.currentAmount / g.targetAmount) * 100,
      remaining: g.targetAmount - g.currentAmount,
      daysRemaining: g.deadline ? Math.ceil((g.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
    }));

    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
});

// PATCH /api/goals/:id/contribute - Add contribution to goal
router.patch('/:id/contribute', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'goals');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Goals feature is not available' });
      }
    }
    const { id } = req.params;
    const { amount } = req.body;

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const updated = await prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: Math.min(goal.currentAmount + amount, goal.targetAmount)
      }
    });

    const progress = (updated.currentAmount / updated.targetAmount) * 100;

    res.json({
      ...updated,
      progress,
      message: progress >= 100 ? '🎉 Goal reached!' : `Progress: ${Math.round(progress)}%`
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to contribute to goal' });
  }
});

// DELETE /api/goals/:id - Delete goal
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    // Check permission for non-admin users
    if ((req as any).user?.role !== 'admin') {
      const allowed = await hasPermission(userId, 'goals');
      if (!allowed) {
        return res.status(403).json({ error: 'Access denied', message: 'Goals feature is not available' });
      }
    }
    const { id } = req.params;

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    await prisma.savingsGoal.delete({ where: { id } });
    res.json({ message: 'Goal deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// GET /api/goals/milestones/:id - Get milestones for goal
router.get('/milestones/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;

    const goal = await prisma.savingsGoal.findFirst({
      where: { id, userId }
    });

    if (!goal) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const milestones = [
      { percentage: 25, name: '25% - Good start!', reached: goal.currentAmount >= goal.targetAmount * 0.25 },
      { percentage: 50, name: '50% - Halfway there!', reached: goal.currentAmount >= goal.targetAmount * 0.5 },
      { percentage: 75, name: '75% - Almost done!', reached: goal.currentAmount >= goal.targetAmount * 0.75 },
      { percentage: 100, name: '100% - Goal achieved!', reached: goal.currentAmount >= goal.targetAmount }
    ];

    res.json(milestones);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch milestones' });
  }
});

export default router;
