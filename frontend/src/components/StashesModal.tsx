import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from '../contexts/account';
import { accountApi } from '../services/accountApi';
import AccountStashCard from './AccountStashCard';
import { useScrollLock } from '../hooks/useScrollLock';

interface Props {
  onClose: () => void;
}

export default function StashesModal({ onClose }: Props) {
  const { accountToken, isSignedIn } = useAccount();
  const [visible, setVisible] = useState(false);
  useScrollLock();

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 250);
  }

  const { data: account, isLoading, error: fetchError } = useQuery({
    queryKey: ['account'],
    queryFn: () => accountApi.getAccount(accountToken!).then((r) => r.data),
    enabled: isSignedIn && !!accountToken,
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel — bottom sheet on mobile, centered dialog on desktop */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4 pointer-events-none">
        <div
          className={[
            'w-full md:max-w-lg pointer-events-auto',
            'bg-white dark:bg-slate-900',
            'rounded-t-2xl md:rounded-xl',
            'shadow-2xl',
            'border border-slate-200/80 dark:border-slate-800',
            'flex flex-col',
            'max-h-[88dvh] md:max-h-[80dvh]',
            'transition-all duration-300 ease-out',
            visible
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4 md:translate-y-2',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Your pouches</h2>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
            {isLoading && (
              <p className="text-[13px] text-slate-400 text-center py-10">Loading…</p>
            )}

            {fetchError && (
              <div className="px-4 py-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-[13px] text-red-700 dark:text-red-400">
                Failed to load your pouches.
              </div>
            )}

            {account && account.claimedStashes.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <svg className="w-8 h-8 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <p className="text-[13px] text-slate-400">No pouches claimed yet.</p>
                <p className="text-[12px] text-slate-400 max-w-xs">
                  Open a pouch with its signed URL and claim it from the settings panel.
                </p>
              </div>
            )}

            {account && account.claimedStashes.map((stash) => (
              <AccountStashCard key={stash.stashId} stash={stash} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
