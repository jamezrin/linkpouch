import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../services/accountApi';
import { useAccount } from '../contexts/account';

interface Props {
  onClose: () => void;
  prefillStashId?: string;
  prefillSignature?: string;
}

export default function ClaimStashModal({ onClose, prefillStashId, prefillSignature }: Props) {
  const { accountToken } = useAccount();
  const queryClient = useQueryClient();
  const [stashId, setStashId] = useState(prefillStashId ?? '');
  const [signature, setSignature] = useState(prefillSignature ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const claimMutation = useMutation({
    mutationFn: () =>
      accountApi.claimStash(accountToken!, {
        stashId,
        signature,
        password: password || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Failed to claim pouch. Check the signature and try again.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-6 w-full max-w-sm flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white">Claim a pouch</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-[13px] text-slate-500 dark:text-slate-400">
          Paste the signed URL or enter the stash ID and signature separately.
        </p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Pouch ID
            </label>
            <input
              type="text"
              value={stashId}
              onChange={(e) => setStashId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Signature (from signed URL)
            </label>
            <input
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Signature from /s/{id}/{signature}"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>

          <div>
            <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400 mb-1">
              Password <span className="text-slate-400">(only if the pouch is password-protected)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank if no password"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[13px] text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
        </div>

        {error && (
          <p className="text-[13px] text-red-500">{error}</p>
        )}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => claimMutation.mutate()}
            disabled={!stashId || !signature || claimMutation.isPending}
            className="px-4 py-2 rounded-lg text-[13px] font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {claimMutation.isPending ? 'Claiming…' : 'Claim pouch'}
          </button>
        </div>
      </div>
    </div>
  );
}
