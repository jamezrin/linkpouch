export type AiProvider = 'NONE' | 'OPENROUTER_INCLUDED' | 'OPENROUTER' | 'OPENAI' | 'ANTHROPIC' | 'OPENCODE';

export interface AiModelInfo {
  id: string;
  name?: string | null;
  description?: string | null;
  contextLength?: number | null;
  pricingPrompt?: number | null;
  pricingCompletion?: number | null;
}

export interface AiModelsResponse {
  models: AiModelInfo[];
}

export interface AiSettingsResponse {
  provider: AiProvider;
  model?: string | null;
  hasApiKey: boolean;
  customPrompt?: string | null;
}

export type UpsertAiSettingsRequest =
  | { provider: 'NONE'; apiKey: null; model: null; customPrompt: null }
  | { provider: 'OPENROUTER_INCLUDED'; apiKey?: null; model: string; customPrompt?: null }
  | { provider: Exclude<AiProvider, 'NONE' | 'OPENROUTER_INCLUDED'>; apiKey: string | null; model: string; customPrompt?: string | null };
