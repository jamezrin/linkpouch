import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../services/api';
import { AiModelInfo, AiProvider, UpsertAiSettingsRequest } from '../types/aiSettings';
import { useScrollLock } from '../hooks/useScrollLock';

interface AiSettingsModalProps {
  accountToken: string;
  onClose: () => void;
}

interface ProviderMeta {
  label: string;
  description: string;
  requiresApiKey: boolean;
  fixedModel?: string;
  isNone?: boolean;
  tier?: 'included' | 'byok';
}

const PROVIDER_META: Record<AiProvider, ProviderMeta> = {
  NONE: {
    label: 'Disabled',
    description: 'AI features are turned off. No summaries will be generated for your links.',
    requiresApiKey: false,
    isNone: true,
  },
  OPENROUTER_INCLUDED: {
    label: 'OpenRouter (free models only)',
    description: 'Uses the Linkpouch-provided OpenRouter key. Limited to free-tier models. No API key required.',
    requiresApiKey: false,
    tier: 'included',
  },
  OPENROUTER: {
    label: 'OpenRouter',
    description: 'Bring your own OpenRouter key to access hundreds of models.',
    requiresApiKey: true,
    tier: 'byok',
  },
  OPENAI: {
    label: 'OpenAI',
    description: 'Use your OpenAI API key (GPT-4o, etc.).',
    requiresApiKey: true,
    tier: 'byok',
  },
  ANTHROPIC: {
    label: 'Anthropic',
    description: 'Use your Anthropic API key (Claude models).',
    requiresApiKey: true,
    tier: 'byok',
  },
  OPENCODE: {
    label: 'OpenCode',
    description: 'Use your OpenCode API key.',
    requiresApiKey: true,
    tier: 'byok',
  },
};

const FALLBACK_MODELS: Record<Exclude<AiProvider, 'NONE'>, AiModelInfo[]> = {
  OPENROUTER_INCLUDED: [
    { id: 'meta-llama/llama-3.1-8b-instruct:free' },
    { id: 'google/gemini-2.0-flash-exp:free' },
    { id: 'mistralai/mistral-7b-instruct:free' },
  ],
  OPENROUTER: [
    { id: 'google/gemini-flash-1.5' },
    { id: 'google/gemini-flash-2.0' },
    { id: 'mistralai/mistral-7b-instruct' },
  ],
  OPENAI: [
    { id: 'gpt-4o' },
    { id: 'gpt-4o-mini' },
    { id: 'gpt-4-turbo' },
  ],
  ANTHROPIC: [
    { id: 'claude-opus-4-6' },
    { id: 'claude-sonnet-4-6' },
    { id: 'claude-haiku-4-5-20251001' },
  ],
  OPENCODE: [
    { id: 'opencode/opencode-a1' },
    { id: 'opencode/opencode-a1-mini' },
  ],
};

type WizardStep = 1 | 2 | 3 | 4;

interface WizardState {
  provider: AiProvider | null;
  apiKey: string;
  useExistingKey: boolean;
  model: string;
  useCustomPrompt: boolean;
  customPrompt: string;
}

function formatPricing(model: AiModelInfo): string | null {
  if (model.pricingPrompt == null) return null;
  const inp = model.pricingPrompt * 1_000_000;
  const out = (model.pricingCompletion ?? 0) * 1_000_000;
  if (inp === 0 && out === 0) return 'Free';
  const fmt = (n: number) => (n < 0.01 ? n.toFixed(4) : n.toFixed(2));
  return `in: $${fmt(inp)} / out: $${fmt(out)} per 1M`;
}

function formatContext(tokens: number): string {
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K ctx`;
  return `${tokens} ctx`;
}

export function AiSettingsModal({ accountToken, onClose }: AiSettingsModalProps) {
  useScrollLock();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () =>
      accountApi.getAiSettings(accountToken).then((r) => r.data).catch((err) => {
        if (err?.response?.status === 404) return null;
        throw err;
      }),
  });

  const [step, setStep] = useState<WizardStep>(1);
  const [wizard, setWizard] = useState<WizardState>({
    provider: null,
    apiKey: '',
    useExistingKey: false,
    model: '',
    useCustomPrompt: false,
    customPrompt: '',
  });

  const [browserSearch, setBrowserSearch] = useState('');

  // Pre-select the currently active provider (or NONE) when settings load
  const [preselected, setPreselected] = useState(false);
  if (!isLoading && !preselected && !wizard.provider) {
    if (settings && settings.provider !== 'NONE') {
      const meta = PROVIDER_META[settings.provider];
      setWizard({
        provider: settings.provider,
        apiKey: '',
        useExistingKey: settings.hasApiKey,
        model: meta.fixedModel ?? settings.model ?? '',
        useCustomPrompt: !!(settings.customPrompt),
        customPrompt: settings.customPrompt ?? '',
      });
    } else {
      setWizard((prev) => ({ ...prev, provider: 'NONE' }));
    }
    setPreselected(true);
  }

  // Step 1: selecting a card only highlights it — does not navigate
  const handleSelectProvider = (provider: AiProvider) => {
    if (provider === 'NONE') {
      setWizard({ provider: 'NONE', apiKey: '', useExistingKey: false, model: '', useCustomPrompt: false, customPrompt: '' });
      return;
    }
    const meta = PROVIDER_META[provider];
    const initialModel = meta.fixedModel ?? settings?.model ?? FALLBACK_MODELS[provider][0].id;
    setWizard({
      provider,
      apiKey: '',
      useExistingKey: settings?.provider === provider && (settings?.hasApiKey ?? false),
      model: initialModel,
      useCustomPrompt: !!(settings?.provider === provider && settings?.customPrompt),
      customPrompt: (settings?.provider === provider ? settings?.customPrompt : null) ?? '',
    });
  };

  // Step 1 confirm button
  const handleStep1Confirm = () => {
    if (!wizard.provider) return;
    if (wizard.provider === 'NONE') {
      upsertMutation.mutate({ provider: 'NONE', model: null, apiKey: null, customPrompt: null });
      return;
    }
    const meta = PROVIDER_META[wizard.provider];
    if (!meta.requiresApiKey) {
      if (meta.fixedModel) {
        // Fixed model — save immediately with no further steps
        upsertMutation.mutate({ provider: wizard.provider, model: meta.fixedModel, apiKey: null, customPrompt: null });
      } else {
        // No API key but model selection required (e.g. OPENROUTER_INCLUDED)
        setStep(3);
      }
      return;
    }
    if (settings?.provider === wizard.provider) {
      setStep(4);
    } else {
      setStep(2);
    }
  };

  // wizard.provider is always a real AiProvider (not NONE) in steps 2-4
  const realProvider = wizard.provider as Exclude<AiProvider, 'NONE'>;

  const apiKeyForFetch = wizard.useExistingKey ? null : wizard.apiKey;

  const modelsQuery = useQuery({
    queryKey: ['ai-models', realProvider, apiKeyForFetch],
    queryFn: () =>
      accountApi
        .fetchAiModels(accountToken, realProvider, apiKeyForFetch)
        .then((r) => r.data.models),
    enabled: false,
    staleTime: Infinity,
  });

  // Auto-fetch models when entering step 3
  useEffect(() => {
    if (step === 3 && realProvider) {
      modelsQuery.refetch();
    }
  }, [step, realProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertAiSettingsRequest) =>
      accountApi.upsertAiSettings(accountToken, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      onClose();
    },
  });

  const handleSave = () => {
    if (!wizard.provider || wizard.provider === 'NONE') return;
    const payload: UpsertAiSettingsRequest = {
      provider: realProvider,
      model: wizard.model,
      apiKey: wizard.useExistingKey ? null : wizard.apiKey || null,
      customPrompt: wizard.provider !== 'OPENROUTER_INCLUDED' && wizard.useCustomPrompt ? wizard.customPrompt : null,
    };
    upsertMutation.mutate(payload);
  };

  const goBack = () => {
    if (step === 2) {
      setWizard({ provider: null, apiKey: '', useExistingKey: false, model: '', useCustomPrompt: false, customPrompt: '' });
      setStep(1);
    } else if (step === 3) {
      setWizard((prev) => ({ ...prev, model: '' }));
      setBrowserSearch('');
      // OPENROUTER_INCLUDED skips step 2, go straight back to step 1
      const meta = wizard.provider ? PROVIDER_META[wizard.provider] : null;
      if (meta && !meta.requiresApiKey) {
        setStep(1);
      } else {
        setStep(2);
      }
    } else if (step === 4) {
      setWizard((prev) => ({
        ...prev,
        useCustomPrompt: !!(settings?.provider === wizard.provider && settings?.customPrompt),
        customPrompt: (settings?.provider === wizard.provider ? settings?.customPrompt : null) ?? '',
      }));
      if (settings?.provider === wizard.provider) {
        setStep(1);
      } else {
        setStep(3);
      }
    }
  };

  const providers: AiProvider[] = ['NONE', 'OPENROUTER_INCLUDED', 'OPENROUTER', 'OPENAI', 'ANTHROPIC', 'OPENCODE'];

  const availableModels: AiModelInfo[] =
    modelsQuery.data && modelsQuery.data.length > 0
      ? modelsQuery.data
      : (realProvider ? FALLBACK_MODELS[realProvider] : []);

  const filteredModels = browserSearch.trim()
    ? availableModels.filter((m) => {
        const q = browserSearch.toLowerCase();
        return m.id.toLowerCase().includes(q) || (m.name ?? '').toLowerCase().includes(q);
      })
    : availableModels;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={goBack}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">AI Settings</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {(() => {
                  if (!wizard.provider || wizard.provider === 'NONE') return 'Step 1 of 1';
                  const meta = PROVIDER_META[wizard.provider];
                  if (meta.fixedModel) return 'Step 1 of 1';
                  if (!meta.requiresApiKey) {
                    // OPENROUTER_INCLUDED: steps 1 → 3 → 4, shown as 1/2/3 of 3
                    const display = step === 1 ? 1 : step === 3 ? 2 : 3;
                    return `Step ${display} of 3`;
                  }
                  if (settings?.provider === wizard.provider) {
                    return `Step ${step === 4 ? 2 : 1} of 2`;
                  }
                  return `Step ${step} of 4`;
                })()}
              </p>
            </div>
          </div>
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
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Step 1 — Select provider */}
              {step === 1 && (
                <div className="space-y-2">
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-3">
                    Choose which AI provider to use. Only one provider can be active at a time.
                  </p>
                  {providers.map((provider) => {
                    const meta = PROVIDER_META[provider];
                    const isActive = provider === 'NONE'
                      ? !settings || settings.provider === 'NONE'
                      : settings?.provider === provider;
                    const isSelected = wizard.provider === provider;
                    return (
                      <button
                        key={provider}
                        onClick={() => handleSelectProvider(provider)}
                        className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-1 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            {meta.label}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            {isActive && (
                              <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                            {meta.tier === 'included' && (
                              <span className="text-[10px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">
                                Included
                              </span>
                            )}
                            {meta.tier === 'byok' && (
                              <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                                API Key Required
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{meta.description}</p>
                      </button>
                    );
                  })}
                  <button
                    onClick={handleStep1Confirm}
                    disabled={!wizard.provider || upsertMutation.isPending}
                    className="w-full mt-2 text-[12px] font-medium py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40"
                  >
                    {upsertMutation.isPending
                      ? 'Saving…'
                      : wizard.provider === 'NONE'
                      ? 'Disable AI (no additional steps required)'
                      : wizard.provider && !PROVIDER_META[wizard.provider].requiresApiKey && PROVIDER_META[wizard.provider].fixedModel
                      ? 'Finish (no additional steps required)'
                      : 'Next →'}
                  </button>
                </div>
              )}

              {/* Step 2 — Enter API key */}
              {step === 2 && wizard.provider && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-1">
                      Enter API key for {PROVIDER_META[wizard.provider].label}
                    </h3>
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
                      This key will be sent to our server immediately to fetch the list of available models. It will not be stored at this point.
                    </p>
                  </div>

                  {settings?.provider === wizard.provider && settings?.hasApiKey && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="use-existing"
                        checked={wizard.useExistingKey}
                        onChange={(e) =>
                          setWizard((prev) => ({ ...prev, useExistingKey: e.target.checked, apiKey: '' }))
                        }
                        className="rounded"
                      />
                      <label htmlFor="use-existing" className="text-[12px] text-slate-600 dark:text-slate-300">
                        Use existing saved key
                      </label>
                    </div>
                  )}

                  {!wizard.useExistingKey && (
                    <input
                      type="password"
                      value={wizard.apiKey}
                      onChange={(e) => setWizard((prev) => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Enter API key"
                      className="w-full text-[12px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  )}

                  <button
                    onClick={() => setStep(3)}
                    disabled={!wizard.useExistingKey && !wizard.apiKey}
                    className="w-full text-[12px] font-medium py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Step 3 — Select model */}
              {step === 3 && wizard.provider && (
                <div className="space-y-3">
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    Select model for {PROVIDER_META[wizard.provider].label}
                  </h3>

                  <div>
                    <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-1 block">
                      Model ID (free-text allowed)
                    </label>
                    <input
                      type="text"
                      value={wizard.model}
                      onChange={(e) => setWizard((prev) => ({ ...prev, model: e.target.value }))}
                      placeholder="e.g. gpt-4o-mini"
                      className="w-full text-[12px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <input
                        type="text"
                        value={browserSearch}
                        onChange={(e) => setBrowserSearch(e.target.value)}
                        placeholder="Search models…"
                        className="flex-1 text-[12px] px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      {modelsQuery.isFetching && (
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {filteredModels.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-4">No models found</p>
                      ) : (
                        filteredModels.map((m) => {
                          const isSelected = wizard.model === m.id;
                          const pricing = formatPricing(m);
                          return (
                            <div
                              key={m.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => setWizard((prev) => ({ ...prev, model: m.id }))}
                              onKeyDown={(e) => e.key === 'Enter' && setWizard((prev) => ({ ...prev, model: m.id }))}
                              style={{ cursor: 'pointer' }}
                              className={`px-3 py-2 border-b border-slate-100 dark:border-slate-800 last:border-b-0 ${
                                isSelected
                                  ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              <div style={{ fontSize: '12px', fontWeight: 500, color: isSelected ? '#4f46e5' : 'inherit', wordBreak: 'break-all' }}>
                                {m.id}
                              </div>
                              {m.name && m.name !== m.id && (
                                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>{m.name}</div>
                              )}
                              {(pricing != null || m.contextLength != null) && (
                                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>
                                  {[pricing, m.contextLength != null ? formatContext(m.contextLength) : null]
                                    .filter(Boolean).join(' · ')}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {modelsQuery.isError && (
                    <p className="text-[11px] text-red-500">
                      Failed to fetch models. Using local suggestions — you can also type a model ID manually.
                    </p>
                  )}

                  <button
                    onClick={() => setStep(4)}
                    disabled={!wizard.model}
                    className="w-full text-[12px] font-medium py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}

              {/* Step 4 — Custom prompt + Save */}
              {step === 4 && wizard.provider && (
                <div className="space-y-4">
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    Confirm settings for {PROVIDER_META[wizard.provider].label}
                  </h3>

                  {/* Summary of choices */}
                  <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-1">
                    <div className="flex justify-between text-[12px]">
                      <span className="text-slate-500 dark:text-slate-400">Provider</span>
                      <span className="text-slate-900 dark:text-white font-medium">
                        {PROVIDER_META[wizard.provider].label}
                      </span>
                    </div>
                    {!PROVIDER_META[wizard.provider].fixedModel && (
                      <div className="flex justify-between text-[12px]">
                        <span className="text-slate-500 dark:text-slate-400">Model</span>
                        <span className="text-slate-900 dark:text-white font-medium">{wizard.model}</span>
                      </div>
                    )}
                    {PROVIDER_META[wizard.provider].requiresApiKey && (
                      <div className="flex justify-between text-[12px]">
                        <span className="text-slate-500 dark:text-slate-400">API Key</span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {wizard.useExistingKey ? 'Using existing key' : '••••••••'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Active provider warning */}
                  {settings != null && settings.provider !== 'NONE' && settings.provider !== wizard.provider && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-800">
                      Enabling this will deactivate {PROVIDER_META[settings.provider].label}.
                    </p>
                  )}

                  {/* Custom prompt — not available for OPENROUTER_INCLUDED */}
                  {wizard.provider !== 'OPENROUTER_INCLUDED' && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="custom-prompt"
                          checked={wizard.useCustomPrompt}
                          onChange={(e) =>
                            setWizard((prev) => ({ ...prev, useCustomPrompt: e.target.checked }))
                          }
                          className="rounded"
                        />
                        <label htmlFor="custom-prompt" className="text-[12px] text-slate-600 dark:text-slate-300">
                          Use a custom system prompt
                        </label>
                      </div>
                      {wizard.useCustomPrompt && (
                        <textarea
                          value={wizard.customPrompt}
                          onChange={(e) => setWizard((prev) => ({ ...prev, customPrompt: e.target.value }))}
                          rows={4}
                          placeholder="Enter your custom system prompt for AI summarization..."
                          className="w-full text-[12px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                        />
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={upsertMutation.isPending}
                    className="w-full text-[12px] font-medium py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                  >
                    {upsertMutation.isPending ? 'Saving…' : 'Enable & Save'}
                  </button>

                  {upsertMutation.isError && (
                    <p className="text-[11px] text-red-500">Failed to save settings. Please try again.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
