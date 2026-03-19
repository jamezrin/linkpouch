export type AiProvider = 'INCLUDED' | 'OPENROUTER' | 'OPENAI' | 'OPENCODE';

export interface AiSettingsResponse {
  provider: AiProvider;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
}

export interface UpsertAiSettingsRequest {
  provider: AiProvider;
  apiKey?: string | null;
  model: string;
  enabled: boolean;
}
