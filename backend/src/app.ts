import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';

import { env } from './config/env';
import authRoutes from './routes/auth.routes';
import marketRoutes from './routes/market.routes';
import tradingRoutes from './routes/trading.routes';
import portfolioRoutes from './routes/portfolio.routes';
import userRoutes from './routes/user.routes';
import alertRoutes from './routes/alert.routes';
import newsRoutes from './routes/news.routes';
import { AppError, ValidationError } from './utils/errors';

const app: Application = express();

// Middleware
app.use(cors({
  origin: env.NODE_ENV === 'production'
    ? ['https://investx.vercel.app']     // Restrict in production
    : ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/trading', tradingRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/user', userRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/news', newsRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    message: 'InvestX Backend is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
});

// Global error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Handle AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err instanceof ValidationError && { details: err.details }),
    });
  }

  // Handle unexpected errors
  console.error('[ERROR]', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    code: 'INTERNAL_ERROR',
    message: env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

export default app;
