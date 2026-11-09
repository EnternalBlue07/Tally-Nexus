import express, { Express, Request, Response, NextFunction } from 'express';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { DatabaseManager } from '../db/index.js';
import { createApiRouter } from './routes.js';
import { sendError } from './auth.js';
import { IPayPalClient, MockPayPalClient } from '../paypal/index.js';
import { getDashboardHtml } from '../dashboard/index.js';

export interface AppOptions {
  db: DatabaseManager;
  paypalClient?: IPayPalClient;
}

export function createApp(optionsOrDb: AppOptions | DatabaseManager, maybeClient?: IPayPalClient): Express {
  const options: AppOptions =
    'runMigrations' in optionsOrDb
      ? { db: optionsOrDb, paypalClient: maybeClient }
      : optionsOrDb;

  const app = express();

  // Basic security and parsing middleware
  app.use(express.json());

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Serve vendored AG Grid Community assets locally for 100% offline self-contained operation
  const agGridDistPath = join(process.cwd(), 'node_modules', 'ag-grid-community', 'dist');
  const agGridStylesPath = join(process.cwd(), 'node_modules', 'ag-grid-community', 'styles');
  if (existsSync(agGridDistPath)) {
    app.use('/vendor/ag-grid/dist', express.static(agGridDistPath));
  }
  if (existsSync(agGridStylesPath)) {
    app.use('/vendor/ag-grid/styles', express.static(agGridStylesPath));
  }

  // Root dashboard routes
  app.get(['/', '/dashboard'], (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8').send(getDashboardHtml());
  });

  // Root health check endpoint (essential for Render / load-balancer probes)
  app.get('/health', (_req: Request, res: Response) => {
    const hasLiveCreds = Boolean(
      process.env.PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      !process.env.PAYPAL_CLIENT_ID.includes('placeholder') &&
      !process.env.PAYPAL_CLIENT_SECRET.includes('placeholder')
    );

    res.json({
      status: 'OK',
      system: 'TALLY NEXUS Clearinghouse',
      version: '0.1.0',
      publicDemoMode: process.env.PUBLIC_DEMO_MODE === 'true',
      environment: hasLiveCreds && !(options.paypalClient instanceof MockPayPalClient) ? 'LIVE_SANDBOX' : 'SIMULATION_MOCK',
      targetEndpoint: process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com',
      aiAvailable: Boolean(process.env.FREEMODEL_API_KEY || process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY),
      aiProvider: process.env.FREEMODEL_API_KEY ? 'FREEMODEL' : (process.env.GEMINI_API_KEY ? 'GEMINI' : 'OFFLINE_DETERMINISTIC_FALLBACK'),
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
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
