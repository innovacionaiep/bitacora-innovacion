export const VITRINA_AI_RATE_MAX = 10;
export const VITRINA_AI_RATE_WINDOW_MS = 60_000;

export function nextRateLimitWindow(
  timestamps: number[],
  now: number,
  max: number,
  windowMs: number,
): { allowed: boolean; timestamps: number[] } {
  const kept = timestamps.filter((t) => now - t < windowMs);
  if (kept.length >= max) {
    return { allowed: false, timestamps: kept };
  }
  return { allowed: true, timestamps: [...kept, now] };
}

const hitsByKey = new Map<string, number[]>();

export function allowVitrinaAiHit(
  key: string,
  now = Date.now(),
  max = VITRINA_AI_RATE_MAX,
  windowMs = VITRINA_AI_RATE_WINDOW_MS,
): boolean {
  const current = hitsByKey.get(key) ?? [];
  const next = nextRateLimitWindow(current, now, max, windowMs);
  hitsByKey.set(key, next.timestamps);
  return next.allowed;
}
