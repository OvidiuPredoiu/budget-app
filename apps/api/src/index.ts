import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import categoriesRoutes from './routes/categories';
import budgetsRoutes from './routes/budgets';
import transactionsRoutes from './routes/transactions';
import dashboardRoutes from './routes/dashboard';
import insightsRoutes from './routes/insights';
import adminRoutes from './routes/admin';
import reportsRoutes from './routes/reports';
import predictionsRoutes from './routes/predictions';
import sharedBudgetsRoutes from './routes/shared-budgets';
import recurringRoutes from './routes/recurring';
import goalsRoutes from './routes/goals';
import currencyRoutes from './routes/currency';
import receiptsRoutes from './routes/receipts';
import analyticsRoutes from './routes/analytics';
import bankingRoutes from './routes/banking';
import subscriptionsRoutes from './routes/subscriptions';
import investmentsRoutes from './routes/investments';
import taxRoutes from './routes/tax';
import developerRoutes from './routes/developer';
import whiteLabelRoutes from './routes/white-label';
import permissionsRoutes from './routes/permissions';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Trust proxy for correct IP/secure cookies behind Railway/NGINX
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Fail fast on missing required env in production
if (isProduction) {
  const requiredEnv = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL', 'ALLOWED_ORIGINS'];
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}

// CORS configuration with credentials and origin whitelist
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    // In production, require a valid Origin header
    if (!origin) {
      return isProduction ? callback(new Error('Origin required')) : callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent
}));
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting configuration
const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : 60 * 60 * 1000, // 15 min in prod, 1 hour in dev
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // 20 requests in prod, 100 in dev
  message: 'Prea multe încercări. Încercați din nou peste 15 minute.',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute for general endpoints
  message: 'Prea multe cereri. Încercați din nou peste un minut.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Routes
app.use('/auth', authLimiter, authRoutes);
app.use('/categories', categoriesRoutes);
app.use('/budgets', budgetsRoutes);
app.use('/transactions', transactionsRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/insights', insightsRoutes);
app.use('/admin', adminRoutes);
app.use('/reports', reportsRoutes);
app.use('/predictions', predictionsRoutes);
app.use('/shared-budgets', sharedBudgetsRoutes);
app.use('/recurring', recurringRoutes);
app.use('/goals', goalsRoutes);
app.use('/currency', currencyRoutes);
app.use('/receipts', receiptsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/banking', bankingRoutes);
app.use('/subscriptions', subscriptionsRoutes);
app.use('/investments', investmentsRoutes);
app.use('/tax', taxRoutes);
app.use('/developer', developerRoutes);
app.use('/white-label', whiteLabelRoutes);
app.use('/permissions', permissionsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
