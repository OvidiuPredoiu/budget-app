import { Router } from 'express';
import argon2 from 'argon2';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { prisma } from '../lib/prisma';

const router = Router();

// Helper pentru audit log
async function createAuditLog(
  userId: string | null,
  action: string,
  entity: string,
  entityId: string | null,
  details: any,
  req: any
) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        details: JSON.stringify(details),
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

// All admin routes require authentication + admin role
router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { search, role, active, sortBy } = req.query;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { email: { contains: search as string } },
        { name: { contains: search as string } },
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (active !== undefined) {
      where.active = active === 'true';
    }
    
    const orderBy: any = {};
    if (sortBy === 'recent') {
      orderBy.createdAt = 'desc';
    } else if (sortBy === 'lastLogin') {
      orderBy.lastLoginAt = 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }
    
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            categories: true,
            budgets: true,
            transactions: true,
          },
        },
      },
      orderBy,
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).default('user'),
});

router.post('/users', async (req, res) => {
  try {
    const body = createUserSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });
    
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    const hashedPassword = await argon2.hash(body.password);
    
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        name: body.name,
        role: body.role,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    await createAuditLog(
      (req as any).user.id,
      'create',
      'user',
      user.id,
      { email: user.email, role: user.role },
      req
    );
    
    res.status(201).json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  password: z.string().min(6).optional(),
});

router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = updateUserSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (body.email && body.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: body.email },
      });
      
      if (emailExists) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    
    const updateData: any = {
      email: body.email,
      name: body.name,
      role: body.role,
    };
    
    if (body.password) {
      updateData.password = await argon2.hash(body.password);
    }
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    
    if (id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await prisma.user.delete({
      where: { id },
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get user statistics
router.get('/users/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            categories: true,
            budgets: true,
            transactions: true,
          },
        },
      },
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const transactions = await prisma.transaction.findMany({
      where: { userId: id },
      select: {
        amount: true,
        type: true,
      },
    });
    
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      counts: user._count,
      financials: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// Get global statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await prisma.user.count();
    
    // Active users (with transactions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUserIds = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        userId: true,
      },
      distinct: ['userId'],
    });
    
    const totalTransactions = await prisma.transaction.count();
    
    const allTransactions = await prisma.transaction.findMany({
      select: {
        amount: true,
        type: true,
      },
    });
    
    const totalIncome = allTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = allTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    res.json({
      totalUsers,
      activeUsers: activeUserIds.length,
      totalTransactions,
      totalIncome,
      totalExpense,
      avgTransactionsPerUser: totalUsers > 0 ? totalTransactions / totalUsers : 0,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get activity logs (simulate - în producție ai folosi un audit log real)
router.get('/activity', async (req, res) => {
  try {
    // Fetch recent transactions as activity proxy
    const recentTransactions = await prisma.transaction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });
    
    const recentBudgets = await prisma.budget.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
    });
    
    const activities = [
      ...recentTransactions.map(t => ({
        id: `tx-${t.id}`,
        userId: t.userId,
        userName: t.user.name,
        userEmail: t.user.email,
        action: t.type === 'income' ? 'Adăugat venit' : t.type === 'expense' ? 'Adăugat cheltuială' : 'Creat transfer',
        details: `${t.category.name} - ${t.amount.toFixed(2)} Lei${t.merchant ? ` la ${t.merchant}` : ''}`,
        timestamp: t.createdAt.toISOString(),
      })),
      ...recentBudgets.map(b => ({
        id: `bg-${b.id}`,
        userId: b.userId,
        userName: b.user.name,
        userEmail: b.user.email,
        action: 'Creat buget',
        details: `${b.category.name} - ${b.amount.toFixed(2)} Lei pentru ${b.month}`,
        timestamp: b.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);
    
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

// Export users (CSV/JSON)
router.get('/users/export', async (req, res) => {
  try {
    const { format = 'csv' } = req.query;
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            categories: true,
            budgets: true,
            transactions: true,
          },
        },
      },
    });
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=users.json');
      return res.json(users);
    }
    
    // CSV format
    const csvRows = [
      ['ID', 'Email', 'Name', 'Role', 'Active', 'Last Login', 'Created', 'Categories', 'Budgets', 'Transactions'].join(','),
      ...users.map(u => [
        u.id,
        u.email,
        u.name || '',
        u.role,
        u.active,
        u.lastLoginAt?.toISOString() || '',
        u.createdAt.toISOString(),
        u._count.categories,
        u._count.budgets,
        u._count.transactions,
      ].join(','))
    ];
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csvRows.join('\n'));
  } catch (error) {
    console.error('Error exporting users:', error);
    res.status(500).json({ error: 'Failed to export users' });
  }
});

// Toggle user active status
router.patch('/users/:id/toggle-active', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    
    if (id === currentUser.id) {
      return res.status(400).json({ error: 'Cannot suspend your own account' });
    }
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updated = await prisma.user.update({
      where: { id },
      data: { active: !user.active },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    await createAuditLog(
      currentUser.id,
      'update',
      'user',
      id,
      { action: updated.active ? 'activated' : 'suspended', email: updated.email },
      req
    );
    
    res.json(updated);
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to toggle user status' });
  }
});

// Global categories management
router.get('/categories/global', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { isGlobal: true },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching global categories:', error);
    res.status(500).json({ error: 'Failed to fetch global categories' });
  }
});

router.post('/categories/global', async (req, res) => {
  try {
    const { name, color } = req.body;
    
    const category = await prisma.category.create({
      data: {
        name,
        color: color || '#3b82f6',
        isGlobal: true,
      },
    });
    
    await createAuditLog(
      (req as any).user.id,
      'create',
      'global_category',
      category.id,
      { name },
      req
    );
    
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating global category:', error);
    res.status(500).json({ error: 'Failed to create global category' });
  }
});

router.delete('/categories/global/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.category.delete({
      where: { id, isGlobal: true },
    });
    
    await createAuditLog(
      (req as any).user.id,
      'delete',
      'global_category',
      id,
      {},
      req
    );
    
    res.json({ message: 'Global category deleted' });
  } catch (error) {
    console.error('Error deleting global category:', error);
    res.status(500).json({ error: 'Failed to delete global category' });
  }
});

// Analytics endpoints
router.get('/analytics/growth', async (req, res) => {
  try {
    const months = 12;
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const newUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });
      
      const activeUsers = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      
      data.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        newUsers,
        activeUsers: activeUsers.length,
      });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error fetching growth analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

router.get('/analytics/retention', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const totalUsers = await prisma.user.count({ where: { active: true } });
    
    const activeLastMonth = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    
    const activeTwoMonthsAgo = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: sixtyDaysAgo,
          lte: thirtyDaysAgo,
        },
      },
      select: { userId: true },
      distinct: ['userId'],
    });
    
    const retained = activeTwoMonthsAgo.filter(u1 => 
      activeLastMonth.some(u2 => u2.userId === u1.userId)
    );
    
    res.json({
      totalUsers,
      activeLastMonth: activeLastMonth.length,
      activeTwoMonthsAgo: activeTwoMonthsAgo.length,
      retained: retained.length,
      retentionRate: activeTwoMonthsAgo.length > 0 
        ? (retained.length / activeTwoMonthsAgo.length) * 100 
        : 0,
    });
  } catch (error) {
    console.error('Error fetching retention:', error);
    res.status(500).json({ error: 'Failed to fetch retention data' });
  }
});

// Alerts system
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await prisma.globalAlert.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

router.patch('/alerts/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const alert = await prisma.globalAlert.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(alert);
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// Generate alerts (poate fi rulat ca cron job)
router.post('/alerts/generate', async (req, res) => {
  try {
    const alerts = [];
    
    // Inactive users (no login in 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const inactiveUsers = await prisma.user.findMany({
      where: {
        active: true,
        OR: [
          { lastLoginAt: { lt: thirtyDaysAgo } },
          { lastLoginAt: null, createdAt: { lt: thirtyDaysAgo } },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        lastLoginAt: true,
      },
    });
    
    for (const user of inactiveUsers) {
      const existing = await prisma.globalAlert.findFirst({
        where: {
          type: 'inactive_user',
          userId: user.id,
          isRead: false,
        },
      });
      
      if (!existing) {
        const alert = await prisma.globalAlert.create({
          data: {
            type: 'inactive_user',
            severity: 'info',
            title: 'Utilizator inactiv',
            description: `${user.name || user.email} nu s-a conectat de 30+ zile`,
            userId: user.id,
          },
        });
        alerts.push(alert);
      }
    }
    
    res.json({ generated: alerts.length, alerts });
  } catch (error) {
    console.error('Error generating alerts:', error);
    res.status(500).json({ error: 'Failed to generate alerts' });
  }
});

// Audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 100, userId, action, entity } = req.query;
    
    const where: any = {};
    if (userId) where.userId = userId as string;
    if (action) where.action = action as string;
    if (entity) where.entity = entity as string;
    
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });
    
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ===== USER PERMISSIONS =====

// Get user permissions
router.get('/users/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    
    let permissions = await prisma.userPermissions.findUnique({
      where: { userId: id },
    });
    
    // Create default permissions if not exists
    if (!permissions) {
      permissions = await prisma.userPermissions.create({
        data: {
          userId: id,
        },
      });
    }
    
    res.json(permissions);
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

// Update user permissions
router.patch('/users/:id/permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = (req as any).user;
    
    // Ensure basic features are always enabled
    const updateData = {
      ...req.body,
      dashboard: true,
      transactions: true,
      categories: true,
    };
    
    let permissions = await prisma.userPermissions.findUnique({
      where: { userId: id },
    });
    
    if (!permissions) {
      permissions = await prisma.userPermissions.create({
        data: {
          userId: id,
          ...updateData,
        },
      });
    } else {
      permissions = await prisma.userPermissions.update({
        where: { userId: id },
        data: updateData,
      });
    }
    
    await createAuditLog(
      currentUser.id,
      'update',
      'user_permissions',
      id,
      updateData,
      req
    );
    
    res.json(permissions);
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
});

// Get all users with their permissions
router.get('/permissions/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const usersWithPermissions = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        active: true,
        createdAt: true,
        permissions: true,
      },
    });
    
    res.json(usersWithPermissions);
  } catch (error) {
    console.error('Error fetching users with permissions:', error);
    res.status(500).json({ error: 'Failed to fetch users with permissions' });
  }
});

export default router;
