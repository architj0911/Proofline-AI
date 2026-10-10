import React from 'react';
import { useAuth } from './AuthContext';
import { LogOut, User as UserIcon, ShieldAlert, CloudOff } from 'lucide-react';

interface AuthButtonProps {
  onOpenAuth: (mode: 'login' | 'register') => void;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ onOpenAuth }) => {
  const { user, isConfigured, isLoading, error, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400">
        <span className="w-2 h-2 rounded-full bg-slate-500 animate-ping"></span>
        <span>Connecting Auth...</span>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-400"
          title="Supabase credentials are not configured. Authentication forms will be unavailable."
        >
          <CloudOff className="w-3.5 h-3.5 text-slate-500" />
          Local Mode
        </span>
        <button
          type="button"
          onClick={() => onOpenAuth('login')}
          className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-900 transition-colors"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => onOpenAuth('register')}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
        >
          Create account
        </button>
      </div>
    );
  }

  if (user) {
    const displayName =
      user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User';
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture;

    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-5 h-5 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center justify-center">
              <UserIcon className="w-3 h-3" />
            </div>
          )}
          <span className="text-slate-200 font-medium truncate max-w-[120px] sm:max-w-[180px]">
            {displayName}
          </span>
        </div>

        <button
          onClick={signOut}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
          title="Sign Out"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenAuth('login')}
          className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-medium text-slate-200 hover:bg-slate-900 transition-colors"
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => onOpenAuth('register')}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
        >
          Create account
        </button>
      </div>
      {error && (
        <span className="text-[10px] text-rose-400 flex items-center gap-1 mt-1">
          <ShieldAlert className="w-3 h-3" /> {error}
        </span>
      )}
    </div>
  );
};
