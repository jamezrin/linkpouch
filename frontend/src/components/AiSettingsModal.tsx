import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../services/api';
import { AiProvider, UpsertAiSettingsRequest } from '../types/aiSettings';
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
    fixedModel: 'openrouter/free',
  },
  OPENROUTER: {
    label: 'OpenRouter BYOK',
    description: 'Bring your own OpenRouter key to access hundreds of models.',
    requiresApiKey: true,
  },
  OPENAI: {
    label: 'OpenAI BYOK',
    description: 'Use your OpenAI API key (GPT-4o, etc.).',
    requiresApiKey: true,
  },
  ANTHROPIC: {
    label: 'Anthropic BYOK',
    description: 'Use your Anthropic API key (Claude models).',
    requiresApiKey: true,
  },
  OPENCODE: {
    label: 'OpenCode BYOK',
    description: 'Use your OpenCode API key.',
    requiresApiKey: true,
  },
};

const FALLBACK_MODELS: Record<Exclude<AiProvider, 'NONE'>, string[]> = {
  OPENROUTER_INCLUDED: ['openrouter/free'],
  OPENROUTER: ['google/gemini-flash-1.5', 'google/gemini-flash-2.0', 'mistralai/mistral-7b-instruct'],
  OPENAI: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  ANTHROPIC: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  OPENCODE: ['opencode/opencode-a1', 'opencode/opencode-a1-mini'],
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
    const initialModel = meta.fixedModel ?? settings?.model ?? FALLBACK_MODELS[provider][0];
    setWizard({
      provider,
      apiKey: '',
      useExistingKey: settings?.provider === provider && (settings?.hasApiKey ?? false),
      model: initialModel,
      useCustomPrompt: !!(settings?.provider === provider && settings?.customPrompt),
      customPrompt: (settings?.provider === provider ? settings?.customPrompt : null) ?? '',
    });
  };

  // Step 1 confirm button: disable AI for NONE, save immediately for no-key providers, advance wizard for BYOK
  const handleStep1Confirm = () => {
    if (!wizard.provider) return;
    if (wizard.provider === 'NONE') {
      upsertMutation.mutate({ provider: 'NONE', model: null, apiKey: null, customPrompt: null });
      return;
    }
    const meta = PROVIDER_META[wizard.provider];
    if (!meta.requiresApiKey) {
      upsertMutation.mutate({
        provider: wizard.provider,
        model: meta.fixedModel!,
        apiKey: null,
        customPrompt: null,
      });
      return;
    }
    if (settings?.provider === wizard.provider) {
      setStep(4);
    } else {
      setStep(2);
    }
  };

  // Step 2 → 3: fetch models with given key
  const apiKeyForFetch = wizard.useExistingKey ? null : wizard.apiKey;

  // wizard.provider is always a real AiProvider (not NONE) in steps 2-4
  const realProvider = wizard.provider as Exclude<AiProvider, 'NONE'>;

  const modelsQuery = useQuery({
    queryKey: ['ai-models', realProvider, apiKeyForFetch],
    queryFn: () =>
      accountApi
        .fetchAiModels(accountToken, realProvider, apiKeyForFetch)
        .then((r) => r.data.models),
    enabled: false, // triggered manually
    staleTime: Infinity,
  });

  const handleFetchModels = async () => {
    const result = await modelsQuery.refetch();
    const models = result.data ?? [];
    const fallback = FALLBACK_MODELS[realProvider];
    setWizard((prev) => ({
      ...prev,
      model: prev.model || models[0] || fallback[0],
    }));
    setStep(3);
  };

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
      customPrompt: wizard.useCustomPrompt ? wizard.customPrompt : null,
    };
    upsertMutation.mutate(payload);
  };

  const goBack = () => {
    if (step === 2) {
      // Reset all wizard state and return to provider list
      setWizard({ provider: null, apiKey: '', useExistingKey: false, model: '', useCustomPrompt: false, customPrompt: '' });
      setStep(1);
    } else if (step === 3) {
      // Reset model selection (it was based on the key entered in step 2)
      setWizard((prev) => ({ ...prev, model: '' }));
      setStep(2);
    } else if (step === 4) {
      // Reset custom prompt state before going back
      setWizard((prev) => ({
        ...prev,
        useCustomPrompt: !!(settings?.provider === wizard.provider && settings?.customPrompt),
        customPrompt: (settings?.provider === wizard.provider ? settings?.customPrompt : null) ?? '',
      }));
      // Already-active provider jumped directly from step 1 → 4, so go back to step 1
      if (settings?.provider === wizard.provider) {
        setStep(1);
      } else {
        setStep(3);
      }
    }
  };

  const providers: AiProvider[] = ['NONE', 'OPENROUTER_INCLUDED', 'OPENROUTER', 'OPENAI', 'ANTHROPIC', 'OPENCODE'];

  const availableModels =
    modelsQuery.data && modelsQuery.data.length > 0
      ? modelsQuery.data
      : (realProvider ? FALLBACK_MODELS[realProvider] : []);

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
                {wizard.provider === 'NONE' || (wizard.provider && !PROVIDER_META[wizard.provider].requiresApiKey)
                  ? 'Step 1 of 1'
                  : wizard.provider && settings?.provider === wizard.provider
                  ? `Step ${step === 4 ? 2 : 1} of 2`
                  : `Step ${step} of 4`}
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
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
                            {meta.label}
                          </span>
                          {isActive && (
                            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
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
                      : wizard.provider && !PROVIDER_META[wizard.provider].requiresApiKey
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
                    onClick={handleFetchModels}
                    disabled={!wizard.useExistingKey && !wizard.apiKey}
                    className="w-full text-[12px] font-medium py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                  >
                    {modelsQuery.isFetching ? 'Fetching models…' : 'Next — fetch models'}
                  </button>
                  {modelsQuery.isError && (
                    <p className="text-[11px] text-red-500">
                      Failed to fetch models. You can still type a model name manually on the next step.
                    </p>
                  )}
                </div>
              )}

              {/* Step 3 — Select model */}
              {step === 3 && wizard.provider && (
                <div className="space-y-4">
                  <h3 className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    Select model for {PROVIDER_META[wizard.provider].label}
                  </h3>

                  {modelsQuery.isFetching && (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

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

                  {availableModels.length > 0 && (
                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Suggestions:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableModels.slice(0, 12).map((m) => (
                          <button
                            key={m}
                            onClick={() => setWizard((prev) => ({ ...prev, model: m }))}
                            className={`text-[11px] px-2 py-1 rounded-md border transition-colors ${
                              wizard.model === m
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
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

                  {/* Custom prompt */}
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
