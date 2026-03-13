import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../services/accountApi';
import { useAccount } from '../contexts/account';
import { ClaimedStash } from '../types/account';

interface Props {
  stash: ClaimedStash;
}

export default function AccountStashCard({ stash }: Props) {
  const { accountToken } = useAccount();
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const disownMutation = useMutation({
    mutationFn: () => accountApi.disownStash(accountToken!, stash.stashId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account'] });
    },
  });

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-slate-900 dark:text-slate-100 truncate">
          {stash.stashName}
        </p>
        <p className="text-[12px] text-slate-400 font-mono truncate mt-0.5">{stash.stashId}</p>
      </div>

      <a
        href={`/s/${stash.stashId}`}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
      >
        Open
      </a>

      {confirming ? (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setConfirming(false)}
            className="px-2 py-1 rounded text-[12px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => disownMutation.mutate()}
            disabled={disownMutation.isPending}
            className="px-2 py-1 rounded text-[12px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50"
          >
            {disownMutation.isPending ? '…' : 'Disown'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          Disown
        </button>
      )}
    </div>
  );
}
