import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { prisma } from '../lib/prisma';

export function checkPermission(feature: string) {
  // Return the middleware function directly, not a promise
  const middleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      // Admins have all permissions
      if (user.role === 'admin') {
        return next();
      }

      // Get user permissions
      let permissions = await prisma.userPermissions.findUnique({
        where: { userId: user.id },
      });

      // Create default permissions if not exists
      if (!permissions) {
        permissions = await prisma.userPermissions.create({
          data: {
            userId: user.id,
          },
        });
      }

      // Check if feature is permitted (case-insensitive property access)
      const permissionValue = (permissions as any)[feature];
      
      if (!permissionValue) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: `Feature "${feature}" is not available for your account. Please contact administrator.`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };

  return middleware;
}

// Helper to get user permissions
export async function getUserPermissions(userId: string) {
  let permissions = await prisma.userPermissions.findUnique({
    where: { userId },
  });

  if (!permissions) {
    permissions = await prisma.userPermissions.create({
      data: {
        userId,
      },
    });
  }

  return permissions;
}

// Helper to check if user has permission
export async function hasPermission(userId: string, feature: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return (permissions as any)[feature] === true;
}
