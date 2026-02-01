import { Router } from 'express';
import argon2 from 'argon2';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const router = Router();

const isProduction = process.env.NODE_ENV === 'production';

// JWT configuration - must be defined in .env
const JWT_SECRET = (process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production') as jwt.Secret;
const JWT_REFRESH_SECRET = (process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key-change-this-in-production') as jwt.Secret;

const jwtOptions: SignOptions = { 
  expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn']
};

const refreshJwtOptions: SignOptions = { 
  expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn']
};

if (isProduction) {
  const hasDefaultSecrets =
    String(JWT_SECRET).includes('change-this-in-production') ||
    String(JWT_REFRESH_SECRET).includes('change-this-in-production');
  if (hasDefaultSecrets) {
    throw new Error('JWT secrets must be set to secure values in production.');
  }
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

const cookieSameSite = (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || (isProduction ? 'none' : 'lax');
const cookieSecure = isProduction || process.env.COOKIE_SECURE === 'true';

// Register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const hashedPassword = await argon2.hash(password);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name
      }
    });
    
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      jwtOptions
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_REFRESH_SECRET,
      refreshJwtOptions
    );
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });
    
    // Set tokens as HttpOnly cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(201).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.active) {
      return res.status(403).json({ error: 'Account suspended. Contact administrator.' });
    }
    
    const validPassword = await argon2.verify(user.password, password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      jwtOptions
    );
    
    const refreshToken = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_REFRESH_SECRET,
      refreshJwtOptions
    );
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });
    
    // Set tokens as HttpOnly cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
});

// Refresh token
router.post('/refresh', async (req, res, next) => {
  try {
    // Read refreshToken from cookie instead of body
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ error: 'No refresh token provided' });
    }
    
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });
    
    if (!storedToken || storedToken.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    
    const decoded = jwt.verify(
      refreshToken,
      JWT_REFRESH_SECRET
    ) as { userId: string; role?: string };
    
    const accessToken = jwt.sign(
      { userId: decoded.userId, role: decoded.role },
      JWT_SECRET,
      jwtOptions
    );
    
    // Set new accessToken as cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    res.json({ success: true, accessToken });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post('/logout', async (req, res, next) => {
  try {
    // Read refreshToken from cookie
    const refreshToken = req.cookies.refreshToken;
    
    if (refreshToken) {
      await prisma.refreshToken.delete({
        where: { token: refreshToken }
      }).catch(() => {});
    }
    
    // Clear both cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
