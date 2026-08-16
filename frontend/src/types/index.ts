// ==================== API ОТВЕТЫ ====================

export interface SearchResult {
  type: 'ticket' | 'documentation';
  collection: string;
  // Для документации
  title?: string;
  h1?: string;
  url?: string;
  content?: string;
  // Для заявок ТП
  header?: string;
  question?: string;
  answer?: string;
  author?: string;
  source_date?: string;
  keywords?: string[];
  article_id?: string;
  filename?: string;
  // Общее
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
  tickets_count: number;
  docs_count: number;
}

export interface UsageInfo {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: number;
}

export interface Source {
  index: number;
  type: 'ticket' | 'documentation';
  title: string;
  url?: string;
  score: number;
  content_length: number;
  author?: string;
  date?: string;
  question?: string;
}

export interface ChatRequest {
  session_id?: string;
  message: string;
  provider?: string;
  model?: string;
}

export interface ChatResponse {
  session_id: string;
  answer: string;
  has_questions: boolean;
  suggestions: string[];
  sources: Source[];
  provider: string;
  model: string;
  truncated: boolean;
  usage: UsageInfo;
}

// ==================== ПРОВАЙДЕРЫ ====================

export interface Provider {
  id: string;
  name: string;
  api_type: 'ollama' | 'openai';
  models: string[];
  available: boolean;
  current: boolean;
}

export interface ProvidersResponse {
  providers: Provider[];
  current_provider: string;
  current_model: string;
}

// ==================== HEALTH ====================

export interface ProviderHealth {
  name: string;
  available: boolean;
  models_count: number;
  models: string[];
  enabled: boolean;
}

export interface HealthStatus {
  weaviate: boolean;
  qdrant: boolean;
  model: boolean;
  providers: Record<string, ProviderHealth>;
  current_provider: string;
  current_model: string;
  any_provider_enabled: boolean;
  warning?: string;
}

// ==================== АДМИНКА ====================

export interface LLMSettings {
  temperature: number;
  max_tokens: number;
  top_p: number;
  repeat_penalty: number;
  num_ctx: number;
  system_prompt_template: string;
}

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  models: string[];
  api_key_set: boolean;
  base_url: string;
}

export interface ProviderModels {
  name: string;
  all_models: string[];
  grouped: Record<string, string[]>;
}

export interface AdminSettingsResponse {
  settings: LLMSettings;
  allowed_models: string[];
  favorite_models: string[];
  providers_models: Record<string, ProviderModels>;
  providers: Record<string, ProviderConfig>;
  current_provider: string;
  current_model: string;
}

export interface LoginRequest {
  password: string;
}

export interface LoginResponse {
  token: string;
  success: boolean;
}

// ==================== ЧАТ ====================

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
  hasQuestions?: boolean;
  sources?: Source[];
  truncated?: boolean;
  usage?: UsageInfo;
  timestamp?: Date;
}

// ==================== СОСТОЯНИЕ ====================

export type PageMode = 'search' | 'chat';