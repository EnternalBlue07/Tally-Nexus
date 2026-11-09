import type { Request, Response, NextFunction } from 'express';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isTimingSafeEqual, getOperatorApiKey, sendError } from './auth.js';

export function isPublicDemoMode(): boolean {
  return process.env.PUBLIC_DEMO_MODE === 'true';
}

/**
 * Middleware protecting live money-moving routes.
 * When PUBLIC_DEMO_MODE=true, any financial mutation requires a valid server-side operator token.
 * If no valid operator token is passed, it rejects immediately with 401 or 403.
 */
export function requireMoneyMovingAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header('X-Operator-Key') || req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  const expectedKey = getOperatorApiKey();

  // In PUBLIC_DEMO_MODE, default dev operator key is disabled
  if (isPublicDemoMode() && expectedKey === 'nexus-dev-operator-key') {
    sendError(
      res,
      403,
      'PUBLIC_DEMO_MODE_LOCKED',
      'Live financial execution routes are locked in public demo mode because no production OPERATOR_API_KEY is configured on the server.'
    );
    return;
  }

  if (!authHeader) {
    sendError(
      res,
      401,
      'UNAUTHORIZED',
      'Missing operator authentication key. Financial execution routes require authorized credentials.'
    );
    return;
  }

  if (!isTimingSafeEqual(authHeader, expectedKey)) {
    sendError(res, 403, 'FORBIDDEN', 'Invalid operator authentication credentials.');
    return;
  }

  next();
}

/**
 * In-memory AI Judge Rate Limiter & Daily Quota Guard.
 */
export class AiJudgeQuotaManager {
  private static perIpLimits = new Map<string, { count: number; resetAt: number }>();
  private static dailyCount = 0;
  private static dailyResetAt = Date.now() + 86400000;
  private static activeConcurrency = 0;
  public static MAX_CONCURRENCY = 2;
  public static MAX_PER_IP_PER_MIN = 5;
  public static MAX_DAILY_LIVE_CALLS = 50;

  public static resetForTesting(): void {
    this.perIpLimits.clear();
    this.dailyCount = 0;
    this.dailyResetAt = Date.now() + 86400000;
    this.activeConcurrency = 0;
  }

  public static checkQuota(ip: string): { allowed: boolean; reason?: 'IP_RATE_LIMIT' | 'CONCURRENCY_LIMIT' | 'DAILY_CAP_EXCEEDED' } {
    const now = Date.now();

    // Reset daily counter if expired
    if (now >= this.dailyResetAt) {
      this.dailyCount = 0;
      this.dailyResetAt = now + 86400000;
    }

    if (this.dailyCount >= this.MAX_DAILY_LIVE_CALLS) {
      return { allowed: false, reason: 'DAILY_CAP_EXCEEDED' };
    }

    if (this.activeConcurrency >= this.MAX_CONCURRENCY) {
      return { allowed: false, reason: 'CONCURRENCY_LIMIT' };
    }

    const ipEntry = this.perIpLimits.get(ip);
    if (!ipEntry || ipEntry.resetAt <= now) {
      this.perIpLimits.set(ip, { count: 1, resetAt: now + 60000 });
      return { allowed: true };
    }

    if (ipEntry.count >= this.MAX_PER_IP_PER_MIN) {
      return { allowed: false, reason: 'IP_RATE_LIMIT' };
    }

    ipEntry.count++;
    return { allowed: true };
  }

  public static incrementActive(): void {
    this.activeConcurrency++;
    this.dailyCount++;
  }

  public static decrementActive(): void {
    if (this.activeConcurrency > 0) this.activeConcurrency--;
  }

  public static getCanonicalStoredEvidence(): Record<string, unknown> | null {
    try {
      const evidenceDir = join(process.cwd(), 'docs', 'evidence');
      if (!existsSync(evidenceDir)) return null;
      const files = readdirSync(evidenceDir)
        .filter((f) => f.startsWith('ai-judge-') && f.endsWith('.json'))
        .sort()
        .reverse();

      for (const f of files) {
        try {
          const content = readFileSync(join(evidenceDir, f), 'utf-8');
          const parsed = JSON.parse(content);
          if (parsed.legitimateScenario) {
            return {
              sourceFile: f,
              ...parsed,
            };
          }
        } catch {
          // ignore parse errors
        }
      }
    } catch {
      // ignore filesystem errors
    }
    return null;
  }
}
