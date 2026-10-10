import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipInTest?: boolean;
}

interface ClientRecord {
  count: number;
  resetAt: number;
}

/**
 * Lightweight, in-memory rate limiter for expensive AI routes.
 * Tracks requests per IP within a sliding time window.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please slow down and try again shortly.',
    skipInTest = true,
  } = options;

  const clients = new Map<string, ClientRecord>();

  // Periodic cleanup every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of clients.entries()) {
      if (now > record.resetAt) {
        clients.delete(ip);
      }
    }
  }, 120_000);

  // Unref interval so it does not block Node process exit
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return function rateLimiter(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    if (skipInTest && process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      next();
      return;
    }

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-client';

    const now = Date.now();
    let record = clients.get(ip);

    if (!record || now > record.resetAt) {
      record = {
        count: 1,
        resetAt: now + windowMs,
      };
      clients.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        error: message,
        retryAfter: retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

// Preset rate limiters
export const extractRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 extractions per minute per IP
  message: 'Extraction rate limit exceeded. Please wait a moment before extracting another resume.',
});

export const defenseRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 60, // 60 defense answers per minute per IP
  message: 'Defense evaluation rate limit exceeded. Please wait a moment before submitting your next answer.',
});
