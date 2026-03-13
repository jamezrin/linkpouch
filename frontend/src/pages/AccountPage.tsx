import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '../contexts/account';
import { accountApi } from '../services/accountApi';
import OAuthSignInButtons from '../components/OAuthSignInButtons';
import AccountStashCard from '../components/AccountStashCard';
import ClaimStashModal from '../components/ClaimStashModal';

export default function AccountPage() {
  const { accountToken, setAccountToken, clearAccountToken, isSignedIn } = useAccount();
  const [oauthError, setOauthError] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  // On mount: extract ?token= from URL and store; also check for ?error=oauth_failed
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      setAccountToken(token);
    }
    if (error === 'oauth_failed') {
      setOauthError(true);
    }
    if (token || error) {
      window.history.replaceState({}, '', '/account');
    }
  }, [setAccountToken]);

  const { data: account, isLoading, error: fetchError } = useQuery({
    queryKey: ['account'],
    queryFn: () => accountApi.getAccount(accountToken!).then((r) => r.data),
    enabled: isSignedIn,
  });

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white dark:bg-slate-950">
    <div className="max-w-xl mx-auto px-4 py-12 flex flex-col gap-8">
      {oauthError && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-[13px] text-red-700 dark:text-red-400">
          Sign-in failed. Please try again.
        </div>
      )}

      {!isSignedIn ? (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in</h1>
            <p className="text-[14px] text-slate-500 dark:text-slate-400 max-w-sm">
              Link your pouches to an account to recover them across devices. Your anonymous signed
              URLs still work — an account is optional.
            </p>
          </div>
          <OAuthSignInButtons />
        </div>
      ) : (
        <>
          {isLoading && (
            <div className="text-[13px] text-slate-400 text-center">Loading…</div>
          )}

          {fetchError && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-[13px] text-red-700 dark:text-red-400">
              Failed to load account. Your session may have expired.
              <button
                onClick={() => clearAccountToken()}
                className="ml-2 underline"
              >
                Sign out
              </button>
            </div>
          )}

          {account && (
            <>
              {/* Profile */}
              <div className="flex items-center gap-4">
                {account.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.displayName}
                    className="w-14 h-14 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[16px] font-semibold text-slate-900 dark:text-white truncate">
                    {account.displayName}
                  </p>
                  {account.email && (
                    <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">{account.email}</p>
                  )}
                  <div className="flex gap-1.5 mt-1 flex-wrap">
                    {account.providers.map((p) => (
                      <span
                        key={p.provider}
                        className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize"
                      >
                        {p.provider}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => clearAccountToken()}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Sign out
                </button>
              </div>

              {/* Claimed pouches */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">
                    Your pouches ({account.claimedStashes.length})
                  </h2>
                  <button
                    onClick={() => setClaimModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Claim a pouch
                  </button>
                </div>

                {account.claimedStashes.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-[13px] text-slate-400">No pouches claimed yet.</p>
                    <p className="text-[12px] text-slate-400 max-w-xs">
                      Open a pouch with its signed URL, then claim it here to keep it linked to your account.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {account.claimedStashes.map((stash) => (
                      <AccountStashCard key={stash.stashId} stash={stash} />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {claimModalOpen && (
        <ClaimStashModal onClose={() => setClaimModalOpen(false)} />
      )}
    </div>
    </div>
  );
}
