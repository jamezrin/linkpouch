export type AiProvider = 'INCLUDED' | 'OPENROUTER' | 'OPENAI' | 'ANTHROPIC' | 'OPENCODE';
export type AiProviderOrNone = AiProvider | 'NONE';

export interface AiSettingsResponse {
  provider: AiProvider;
  model: string;
  enabled: boolean;
  hasApiKey: boolean;
  customPrompt?: string | null;
}

export interface UpsertAiSettingsRequest {
  provider: AiProvider;
  apiKey?: string | null;
  model: string;
  enabled: boolean;
  customPrompt?: string | null;
}
