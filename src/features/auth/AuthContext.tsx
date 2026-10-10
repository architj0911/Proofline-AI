import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithEmail as supabaseSignInWithEmail,
  signUpWithEmail as supabaseSignUpWithEmail,
  signOut as supabaseSignOut,
  User,
  Session,
} from '../../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isConfigured: false,
  isLoading: false,
  error: null,
  signIn: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => false,
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    // Check active session on initial load
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[Auth Init Error]:', error);
        setError(error.message);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes (e.g. OAuth callback, sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setError(null);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication failed';
      setError(message);
    }
  };

  const handleSignInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      await supabaseSignInWithEmail(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Email sign-in failed';
      setError(message);
      throw err;
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      return await supabaseSignUpWithEmail(email, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Account registration failed';
      setError(message);
      throw err;
    }
  };

  const handleSignOut = async () => {
    try {
      setError(null);
      await supabaseSignOut();
      setUser(null);
      setSession(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isConfigured: isSupabaseConfigured,
        isLoading,
        error,
        signIn: handleSignIn,
        signInWithEmail: handleSignInWithEmail,
        signUpWithEmail: handleSignUpWithEmail,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
