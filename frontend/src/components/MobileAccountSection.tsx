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

interface MobileAccountSectionProps {
  onAction?: () => void;
  onSignIn?: () => void;
  onStashesOpen?: () => void;
}

export default function MobileAccountSection({ onAction, onSignIn, onStashesOpen }: MobileAccountSectionProps) {
  const { accountToken, isSignedIn, clearAccountToken } = useAccount();

  const { data: account } = useQuery({
    queryKey: ['account'],
    queryFn: () => accountApi.getAccount(accountToken!).then((r) => r.data),
    enabled: isSignedIn && !!accountToken,
  });

  if (!isSignedIn) {
    return (
      <button
        onClick={() => { onSignIn?.(); onAction?.(); }}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white w-full text-left"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Sign in
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
    <>
      {/* User info header */}
      <div className="flex items-center gap-3 px-2 py-1.5">
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

      {/* Your pouches */}
      <button
        onClick={() => { onStashesOpen?.(); onAction?.(); }}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white w-full text-left"
      >
        <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        Your pouches
      </button>

      {/* Sign out */}
      <button
        onClick={() => { clearAccountToken(); onAction?.(); }}
        className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] font-medium transition-colors text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 w-full text-left"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        Sign out
      </button>

    </>
  );
}
