import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '../contexts/account';
import { accountApi } from '../services/accountApi';
import AccountStashCard from '../components/AccountStashCard';

export default function StashesPage() {
  const { accountToken, isSignedIn } = useAccount();
  const navigate = useNavigate();

  const { data: account, isLoading, error: fetchError } = useQuery({
    queryKey: ['account'],
    queryFn: () => accountApi.getAccount(accountToken!).then((r) => r.data),
    enabled: isSignedIn,
  });

  if (!isSignedIn) {
    return (
      <div className="min-h-[calc(100dvh-3.5rem)] bg-white dark:bg-slate-950 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">You're not signed in</p>
        <button
          onClick={() => navigate('/account')}
          className="px-4 py-2 rounded-lg text-[13px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-white dark:bg-slate-950">
      <div className="max-w-xl mx-auto px-4 py-12 flex flex-col gap-6">
        <h1 className="text-[18px] font-bold text-slate-900 dark:text-white">Your pouches</h1>

        {fetchError && (
          <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-[13px] text-red-700 dark:text-red-400">
            Failed to load your pouches.
          </div>
        )}

        {isLoading && (
          <div className="text-[13px] text-slate-400 text-center py-10">Loading…</div>
        )}

        {account && account.claimedStashes.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-[13px] text-slate-400">No pouches claimed yet.</p>
            <p className="text-[12px] text-slate-400 max-w-xs">
              Open a pouch with its signed URL and claim it from the settings panel to keep it linked to your account.
            </p>
          </div>
        )}

        {account && account.claimedStashes.length > 0 && (
          <div className="flex flex-col gap-2">
            {account.claimedStashes.map((stash) => (
              <AccountStashCard key={stash.stashId} stash={stash} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
