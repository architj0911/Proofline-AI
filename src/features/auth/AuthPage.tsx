import React, { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from './AuthContext';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (mode: 'login' | 'register') => void;
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ mode, onNavigate, onSuccess }) => {
  const { isConfigured, isLoading, error: authError, signIn, signInWithEmail, signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isRegister = mode === 'register';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegister) {
        const hasSession = await signUpWithEmail(email.trim(), password);
        if (hasSession) onSuccess();
        else setSuccess('Check your email for a confirmation link to finish creating your account.');
      } else {
        await signInWithEmail(email.trim(), password);
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    await signIn();
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={onSuccess}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Proofline AI
        </button>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-7 shadow-2xl sm:p-8">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-white">Proofline AI</p>
              <p className="text-xs text-slate-400">Resume Technical Claim Defense</p>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-white">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isRegister
              ? 'Save your place and get ready to defend your experience.'
              : 'Sign in to continue your interview preparation.'}
          </p>

          {!isConfigured && (
            <div className="mt-5 rounded-lg border border-amber-800/70 bg-amber-950/30 p-3 text-sm text-amber-200">
              Authentication is unavailable until Supabase is configured with VITE_SUPABASE_URL and
              VITE_SUPABASE_PUBLISHABLE_KEY.
            </div>
          )}

          {isConfigured && (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSubmitting || isLoading}
                className="mt-6 w-full inline-flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <GoogleMark /> Continue with Google
              </button>

              <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
                <span className="h-px flex-1 bg-slate-800" />
                or continue with email
                <span className="h-px flex-1 bg-slate-800" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-300">Email</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-300">Password</span>
              <input
                type="password"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isRegister ? 'At least 8 characters' : 'Enter your password'}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </label>

            {isRegister && (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-300">Confirm password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Enter your password again"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </label>
            )}

            {(error || authError) && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-800/70 bg-rose-950/30 p-3 text-sm text-rose-300">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error || authError}</span>
              </div>
            )}

            {success && (
              <div role="status" className="flex items-start gap-2 rounded-lg border border-emerald-800/70 bg-emerald-950/30 p-3 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!isConfigured || isSubmitting || isLoading}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            {isRegister ? 'Already have an account?' : 'New to Proofline AI?'}{' '}
            <button
              type="button"
              onClick={() => onNavigate(isRegister ? 'login' : 'register')}
              className="font-medium text-emerald-400 hover:text-emerald-300"
            >
              {isRegister ? 'Sign in' : 'Create account'}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
};

const GoogleMark: React.FC = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
  </svg>
);
