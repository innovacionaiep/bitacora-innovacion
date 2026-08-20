export const VITRINA_AI_SETTING_KEY = 'vitrina_ai';
export const VITRINA_AI_DEFAULT_MODEL = 'openai/gpt-4o-mini';
export const VITRINA_AI_MAX_MESSAGE_CHARS = 500;
export const VITRINA_AI_MAX_HISTORY = 6;
export const VITRINA_AI_MAX_TOOL_ROUNDS = 4;
export const VITRINA_AI_MAX_TOKENS = 1024;

export type VitrinaAiStored = {
  enc: string;
  model: string;
};

const MODEL_RE = /^[a-zA-Z0-9_./:-]+$/;

export function normalizeVitrinaAiModel(value: unknown): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw || raw.length > 120 || !MODEL_RE.test(raw)) {
    return VITRINA_AI_DEFAULT_MODEL;
  }
  return raw;
}

export function maskOpenRouterKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return '';
  return `••••${trimmed.slice(-4)}`;
}

export function serializeVitrinaAiStored(stored: VitrinaAiStored): string {
  return JSON.stringify({
    enc: stored.enc,
    model: normalizeVitrinaAiModel(stored.model),
  });
}

export function parseStoredVitrinaAi(
  value: string | null | undefined,
): VitrinaAiStored | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const rec = parsed as { enc?: unknown; model?: unknown };
    if (typeof rec.enc !== 'string') return null;
    return {
      enc: rec.enc,
      model: normalizeVitrinaAiModel(rec.model),
    };
  } catch {
    return null;
  }
}

export function isVitrinaAiConfigured(stored: VitrinaAiStored | null): boolean {
  return Boolean(stored?.enc);
}
