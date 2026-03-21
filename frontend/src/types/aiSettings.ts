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

export interface UpsertAiSettingsRequest {
  provider: AiProvider;
  apiKey?: string | null;
  model?: string | null;
  customPrompt?: string | null;
}
