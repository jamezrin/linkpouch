export type AiProvider = 'NONE' | 'OPENROUTER_INCLUDED' | 'OPENROUTER' | 'OPENAI' | 'ANTHROPIC' | 'OPENCODE';

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
