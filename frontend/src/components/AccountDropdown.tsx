import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '../contexts/account';
import { accountApi } from '../services/accountApi';
import { OAuthProviderName } from '../types/account';

const PROVIDER_LABELS: Record<OAuthProviderName, string> = {
  github: 'GitHub',
  google: 'Google',
  twitter: 'X',
  discord: 'Discord',
};

const PROVIDER_COLORS: Record<OAuthProviderName, string> = {
  github: 'bg-slate-800 text-white',
  google: 'bg-blue-500 text-white',
  twitter: 'bg-black text-white',
  discord: 'bg-indigo-500 text-white',
};

export default function AccountDropdown() {
  const { accountToken, isSignedIn, clearAccountToken } = useAccount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: () => accountApi.getAccount(accountToken!).then((r) => r.data),
    enabled: isSignedIn && !!accountToken,
  });

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!isSignedIn) {
    return (
      <button
        onClick={() => navigate('/account')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="hidden sm:inline">Sign in</span>
      </button>
    );
  }

  const avatarUrl = account?.avatarUrl;
  const displayName = account?.displayName ?? '…';
  const providers = account?.providers ?? [];

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase() || '?';

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={[
          'flex items-center justify-center w-8 h-8 rounded-full overflow-hidden transition-all',
          'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950',
          open ? 'ring-indigo-500' : 'ring-transparent hover:ring-indigo-400/50',
        ].join(' ')}
        title={displayName}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-[11px] font-bold text-white">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
            {/* User info */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-[12px] font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate leading-tight">
                    {displayName}
                  </p>
                  {providers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {providers.map((p) => (
                        <span
                          key={p.provider}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${PROVIDER_COLORS[p.provider]}`}
                        >
                          {PROVIDER_LABELS[p.provider]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="py-1">
              <button
                onClick={() => { navigate('/stashes'); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Your pouches
              </button>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 py-1">
              <button
                onClick={() => { clearAccountToken(); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
