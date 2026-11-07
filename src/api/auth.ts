import type { Request, Response, NextFunction } from 'express';

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): void {
  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  });
}

const DEFAULT_OPERATOR_KEY = 'nexus-dev-operator-key';

export function getOperatorApiKey(): string {
  return process.env.OPERATOR_API_KEY || DEFAULT_OPERATOR_KEY;
}

/**
 * Middleware enforcing operator authentication for administrative and clearing operations.
 */
export function requireOperatorAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.header('X-Operator-Key') || req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  const expectedKey = getOperatorApiKey();

  if (!authHeader) {
    sendError(res, 401, 'UNAUTHORIZED', 'Missing operator authentication key.');
    return;
  }

  if (authHeader !== expectedKey) {
    sendError(res, 403, 'FORBIDDEN', 'Invalid operator authentication credentials.');
    return;
  }

  next();
}

/**
 * Middleware verifying request caller is either an authenticated operator or a declared registered agent.
 */
export function requireAgentOrOperatorAuth(req: Request, res: Response, next: NextFunction): void {
  const operatorKey = req.header('X-Operator-Key') || req.header('Authorization')?.replace(/^Bearer\s+/i, '');
  if (operatorKey && operatorKey === getOperatorApiKey()) {
    return next();
  }

  const agentId = req.header('X-Agent-ID');
  if (!agentId) {
    sendError(
      res,
      401,
      'UNAUTHORIZED',
      'Caller must provide either a valid X-Operator-Key or X-Agent-ID header.'
    );
    return;
  }

  next();
}
