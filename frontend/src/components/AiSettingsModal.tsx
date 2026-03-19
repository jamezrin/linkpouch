import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../services/api';
import { AiSettingsResponse, AiProvider, UpsertAiSettingsRequest } from '../types/aiSettings';
import { useScrollLock } from '../hooks/useScrollLock';

interface AiSettingsModalProps {
  accountToken: string;
  onClose: () => void;
}

const PROVIDER_INFO: Record<AiProvider, { label: string; description: string; showApiKey: boolean }> = {
  INCLUDED: {
    label: 'Included (free)',
    description: 'Uses the Linkpouch-provided OpenRouter key. No API key required.',
    showApiKey: false,
  },
  OPENROUTER: {
    label: 'OpenRouter',
    description: 'Bring your own OpenRouter key to access hundreds of models.',
    showApiKey: true,
  },
  OPENAI: {
    label: 'OpenAI',
    description: 'Use your OpenAI API key (GPT-4o, o1, etc.).',
    showApiKey: true,
  },
  OPENCODE: {
    label: 'OpenCode',
    description: 'Use your OpenCode API key.',
    showApiKey: true,
  },
};

const DEFAULT_MODELS: Record<AiProvider, string> = {
  INCLUDED: 'google/gemini-flash-1.5',
  OPENROUTER: 'google/gemini-flash-1.5',
  OPENAI: 'gpt-4o-mini',
  OPENCODE: 'claude-3-5-haiku',
};

interface ProviderFormState {
  model: string;
  apiKey: string;
  enabled: boolean;
  dirty: boolean;
}

export function AiSettingsModal({ accountToken, onClose }: AiSettingsModalProps) {
  useScrollLock();
  const queryClient = useQueryClient();

  const { data: settingsList, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => accountApi.getAiSettings(accountToken).then((r) => r.data),
  });

  const [formStates, setFormStates] = useState<Record<AiProvider, ProviderFormState>>(() => {
    const providers: AiProvider[] = ['INCLUDED', 'OPENROUTER', 'OPENAI', 'OPENCODE'];
    return Object.fromEntries(
      providers.map((p) => [p, { model: DEFAULT_MODELS[p], apiKey: '', enabled: false, dirty: false }]),
    ) as Record<AiProvider, ProviderFormState>;
  });

  // Sync form states from fetched settings
  useEffect(() => {
    if (!settingsList) return;
    setFormStates((prev) => {
      const next = { ...prev };
      for (const s of settingsList) {
        next[s.provider] = {
          model: s.model || DEFAULT_MODELS[s.provider],
          apiKey: '', // never pre-populate — hasApiKey flag drives placeholder
          enabled: s.enabled,
          dirty: false,
        };
      }
      return next;
    });
  }, [settingsList]);

  const upsertMutation = useMutation({
    mutationFn: ({ provider, data }: { provider: AiProvider; data: UpsertAiSettingsRequest }) =>
      accountApi.upsertAiSettings(accountToken, provider, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (provider: AiProvider) => accountApi.deleteAiSettings(accountToken, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
    },
  });

  const getExistingSettings = (provider: AiProvider): AiSettingsResponse | undefined =>
    settingsList?.find((s) => s.provider === provider);

  const handleSave = (provider: AiProvider) => {
    const form = formStates[provider];
    const data: UpsertAiSettingsRequest = {
      provider,
      // Pass null to preserve existing key when field is empty and key is already set
      apiKey: form.apiKey || (getExistingSettings(provider)?.hasApiKey ? null : undefined),
      model: form.model,
      enabled: form.enabled,
    };
    upsertMutation.mutate({ provider, data });
    setFormStates((prev) => ({ ...prev, [provider]: { ...prev[provider], dirty: false } }));
  };

  const updateField = (provider: AiProvider, field: keyof ProviderFormState, value: string | boolean) => {
    setFormStates((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [field]: value, dirty: true },
    }));
  };

  const providers: AiProvider[] = ['INCLUDED', 'OPENROUTER', 'OPENAI', 'OPENCODE'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            providers.map((provider) => {
              const info = PROVIDER_INFO[provider];
              const form = formStates[provider];
              const existing = getExistingSettings(provider);
              const isSaving = upsertMutation.isPending;

              return (
                <div
                  key={provider}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[13px] font-semibold text-slate-900 dark:text-white">{info.label}</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{info.description}</p>
                    </div>
                    {/* Enable toggle */}
                    <button
                      onClick={() => updateField(provider, 'enabled', !form.enabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${
                        form.enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          form.enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* API Key field */}
                  {info.showApiKey && (
                    <div className="mb-2">
                      <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1 block">
                        API Key
                      </label>
                      <input
                        type="password"
                        value={form.apiKey}
                        onChange={(e) => updateField(provider, 'apiKey', e.target.value)}
                        placeholder={existing?.hasApiKey ? '••••••••' : 'Enter API key'}
                        className="w-full text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  )}

                  {/* Model field */}
                  <div className="mb-3">
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1 block">
                      Model
                    </label>
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => updateField(provider, 'model', e.target.value)}
                      className="w-full text-[12px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  {/* Save / Delete */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSave(provider)}
                      disabled={isSaving}
                      className="flex-1 text-[12px] font-medium py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving…' : form.dirty ? 'Save changes' : 'Save'}
                    </button>
                    {existing && (
                      <button
                        onClick={() => deleteMutation.mutate(provider)}
                        disabled={deleteMutation.isPending}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
