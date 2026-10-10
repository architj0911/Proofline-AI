import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Extend Express Request interface to include optional authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
      } | null;
    }
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

export const isServerSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
    supabaseKey &&
    supabaseUrl.trim() !== '' &&
    supabaseKey.trim() !== '' &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseKey.includes('your-supabase-publishable-key')
);

// Server-side Supabase client for token validation
export const serverSupabase: SupabaseClient | null = isServerSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

/**
 * Middleware that inspects Authorization: Bearer <token>.
 * - If valid token: attaches req.user = { id, email }.
 * - If invalid or expired token: returns 401 Unauthorized.
 * - If no token: sets req.user = null and permits guest demo access.
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    next();
    return;
  }

  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: 'Invalid authorization format. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    res.status(401).json({
      error: 'Authentication token is empty.',
    });
    return;
  }

  if (!serverSupabase) {
    // Supabase credentials not configured on server
    // Reject invalid tokens safely
    res.status(401).json({
      error: 'Authentication service is not configured on this server.',
    });
    return;
  }

  try {
    const { data, error } = await serverSupabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        error: 'Invalid, malformed, or expired authentication token.',
      });
      return;
    }

    req.user = {
      id: data.user.id,
      email: data.user.email,
    };
    next();
  } catch (err: unknown) {
    res.status(401).json({
      error: 'Authentication verification failed.',
    });
  }
}

/**
 * Strict authentication middleware for routes that strictly mandate a signed-in user.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await authenticateToken(req, res, () => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required. Please sign in to access this resource.',
      });
      return;
    }
    next();
  });
}
