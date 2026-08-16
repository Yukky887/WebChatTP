export const DB_OPTIONS = [
  { value: 'qdrant', label: 'Qdrant' },
] as const;

export const PROVIDER_ICONS = {
  ollama: '🖥️',
  llamacpp: '⚡',
  routerai: '☁️',
} as const;

export const MESSAGE_LIMITS = {
  maxInputLength: 4000,
  maxOutputLength: 8000,
  maxContextSources: 10,
} as const;