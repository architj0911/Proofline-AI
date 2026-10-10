import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * Checks if Supabase credentials are validly supplied via environment variables.
 * Disables authentication features gracefully if values are missing or placeholders.
 */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
    supabasePublishableKey &&
    supabaseUrl.trim() !== '' &&
    supabasePublishableKey.trim() !== '' &&
    !supabaseUrl.includes('your-project-id') &&
    !supabasePublishableKey.includes('your-supabase-publishable-key')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Initiates Google OAuth Sign-in using Supabase Auth.
 * Redirects back to the current browser origin.
 */
export async function signInWithGoogle(): Promise<{ provider: string; url: string | null }> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.'
    );
  }

  const redirectTo = `${window.location.origin}/`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    console.error('[Supabase Auth Error]:', error);
    throw error;
  }

  return data;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Returns true when registration creates a session immediately; otherwise email confirmation is required. */
export async function signUpWithEmail(email: string, password: string): Promise<boolean> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Provide VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
  return Boolean(data.session);
}

/**
 * Signs out the currently authenticated user.
 */
export async function signOut(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[Supabase SignOut Error]:', error);
    throw error;
  }
}

/**
 * Retrieves the current session if one exists.
 */
export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error('[Supabase Session Error]:', error);
    return null;
  }
  return data.session;
}

export type { User, Session };
