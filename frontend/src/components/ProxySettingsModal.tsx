import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../services/api';
import { SUPPORTED_PROXY_COUNTRIES } from '../types/proxySettings';
import { useScrollLock } from '../hooks/useScrollLock';

interface ProxySettingsModalProps {
  accountToken: string;
  onClose: () => void;
}

export function ProxySettingsModal({ accountToken, onClose }: ProxySettingsModalProps) {
  useScrollLock();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['proxy-settings'],
    queryFn: () =>
      accountApi.getProxySettings(accountToken).then((r) => r.data).catch((err) => {
        if (err?.response?.status === 404) return null;
        throw err;
      }),
  });

  const [selectedCountry, setSelectedCountry] = useState<string>('');

  useEffect(() => {
    if (settings !== undefined) {
      setSelectedCountry(settings?.proxyCountry ?? '');
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: () =>
      accountApi.upsertProxySettings(accountToken, {
        proxyCountry: selectedCountry || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxy-settings'] });
      onClose();
    },
  });

  return (
    /* {/* Backdrop */}
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700">
        {/* {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-[15px] font-semibold text-slate-800 dark:text-slate-100">
              Proxy Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* {/* Warning callout */}
          <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 flex gap-3">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
              Free proxies are operated by third parties and are untrusted. Do not use this feature if your stash contains private or sensitive links. Traffic may be intercepted. Proxy availability is not guaranteed.
            </p>
          </div>

          {/* {/* Country selector */}
          <div className="space-y-2">
            <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300">
              Proxy country
            </label>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">
              When set, the indexer will route scraping traffic through a free proxy in the selected country. Leave empty to scrape directly.
            </p>
            {isLoading ? (
              <div className="h-9 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ) : (
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-[13px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No proxy (direct connection)</option>
                {SUPPORTED_PROXY_COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={isLoading || mutation.isPending}
            className="px-4 py-2 text-[13px] font-medium rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-colors"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
