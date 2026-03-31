import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '../contexts/account';
import { accountApi } from '../services/accountApi';
import { OAuthProviderName } from '../types/account';
import StashesModal from './StashesModal';
import SignInModal from './SignInModal';
import { AiSettingsModal } from './AiSettingsModal';
import { ProxySettingsModal } from './ProxySettingsModal';

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
  const [open, setOpen] = useState(false);
  const [stashesOpen, setStashesOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [proxySettingsOpen, setProxySettingsOpen] = useState(false);
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
      <>
        <button
          onClick={() => setSignInOpen(true)}
          className="flex items-center justify-center w-8 h-8 rounded-full transition-all ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 ring-transparent hover:ring-indigo-400/50 bg-slate-100 dark:bg-slate-800"
          title="Sign in"
        >
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
        {signInOpen && <SignInModal onClose={() => setSignInOpen(false)} />}
      </>
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
    <>
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
                onClick={() => { setStashesOpen(true); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Your pouches
              </button>
              <button
                onClick={() => { setAiSettingsOpen(true); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Settings
              </button>
              <button
                onClick={() => { setProxySettingsOpen(true); setOpen(false); }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Proxy Settings
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

    {stashesOpen && <StashesModal onClose={() => setStashesOpen(false)} />}
    {aiSettingsOpen && accountToken && (
      <AiSettingsModal accountToken={accountToken} onClose={() => setAiSettingsOpen(false)} />
    )}
    {proxySettingsOpen && accountToken && (
      <ProxySettingsModal accountToken={accountToken} onClose={() => setProxySettingsOpen(false)} />
    )}
    </>
  );
}
