import express, { Express, Request, Response, NextFunction } from 'express';
import { DatabaseManager } from '../db/index.js';
import { createApiRouter } from './routes.js';
import { sendError } from './auth.js';
import { IPayPalClient } from '../paypal/index.js';

export interface AppOptions {
  db: DatabaseManager;
  paypalClient?: IPayPalClient;
}

export function createApp(options: AppOptions): Express {
  const app = express();

  // Basic security and parsing middleware
  app.use(express.json());

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Mount API router under /api
  const apiRouter = createApiRouter(options.db, options.paypalClient);
  app.use('/api', apiRouter);

  // 404 handler
  app.use((_req: Request, res: Response) => {
    sendError(res, 404, 'NOT_FOUND', 'Requested endpoint does not exist.');
  });

  // Global error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const message = err instanceof Error ? err.message : 'Internal server error';
    sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
  });

  return app;
}
