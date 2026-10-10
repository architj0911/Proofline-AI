import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { MulterError } from 'multer';

/**
 * Sanitizes sensitive data from error strings before returning to client or logging:
 * - Redacts API keys (Google, OpenRouter, Groq)
 * - Redacts JWT / Bearer tokens
 * - Strips server internal file system paths
 */
export function sanitizeErrorMessage(raw: string): string {
  return raw
    .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
    .replace(/sk-[a-zA-Z0-9-_]{20,}/g, '[REDACTED_KEY]')
    .replace(/[A-Za-z]:\\[^:\s]+|\/[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+[^\s]*/g, '[redacted_path]');
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Sanitize message before logging
  const rawMsg = err instanceof Error ? err.stack || err.message : String(err);
  const cleanLog = sanitizeErrorMessage(rawMsg);
  console.error('[Proofline API Error]:', cleanLog);

  // 1. Zod Validation Errors -> 400
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // 2. Multer Upload Errors -> 413 or 400
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'File exceeds maximum upload size of 5 MB.',
      });
      return;
    }
    res.status(400).json({
      error: `File upload error: ${err.message}`,
    });
    return;
  }

  // 3. Custom / General Application Errors
  const status = (err as { status?: number })?.status || (err as { statusCode?: number })?.statusCode || 500;
  const rawMessage = err instanceof Error ? err.message : 'Internal server error';
  const cleanMessage = sanitizeErrorMessage(rawMessage);

  res.status(status).json({
    error: cleanMessage,
  });
}
