import { after } from 'next/server';
import { fetchMideimpactoSedesByIds } from '@/lib/mideimpacto-iniciativas';
import {
  prismaSedeCacheStore,
  type SedeCacheStore,
} from '@/lib/mideimpacto-sede-cache';

export const MIDEIMPACTO_SEDE_DRIP_DELAY_MS = 450;

const queue = new Set<string>();
let pumping = false;
let pauseUntil = 0;
let lastApiKey = '';

export function resetMideimpactoSedeDripForTests() {
  queue.clear();
  pumping = false;
  pauseUntil = 0;
  lastApiKey = '';
}

export type SedeDripResult = {
  rateLimited: boolean;
  pauseUntil: number;
};

export async function runSedeDrip(options: {
  ids: string[];
  apiKey: string;
  store?: SedeCacheStore;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}): Promise<SedeDripResult> {
  const store = options.store ?? prismaSedeCacheStore;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const ids = [...new Set(options.ids.map((id) => id.trim()).filter(Boolean))];
  let rateLimited = false;

  for (const id of ids) {
    if (now() < pauseUntil) {
      rateLimited = true;
      break;
    }
    const fetched = await fetchMideimpactoSedesByIds({
      apiKey: options.apiKey,
      ids: [id],
      delayMs: 0,
      sleep: async () => {},
    });
    if (fetched.rateLimited) {
      pauseUntil = now() + (fetched.retryAfterMs ?? 60_000);
      rateLimited = true;
      break;
    }
    await store.upsert(id, fetched.sedes[id] ?? '');
    await sleep(MIDEIMPACTO_SEDE_DRIP_DELAY_MS);
  }

  return { rateLimited, pauseUntil };
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.size > 0) {
      if (Date.now() < pauseUntil) break;
      const id = queue.values().next().value as string | undefined;
      if (!id) break;
      queue.delete(id);
      const result = await runSedeDrip({ ids: [id], apiKey: lastApiKey });
      if (result.rateLimited) {
        queue.add(id);
        break;
      }
    }
  } finally {
    pumping = false;
  }
}

export function scheduleSedeDrip(ids: string[], apiKey: string) {
  const next = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (next.length === 0 || !apiKey) return;
  for (const id of next) queue.add(id);
  lastApiKey = apiKey;
  const start = () => {
    void pump();
  };
  try {
    after(start);
  } catch {
    start();
  }
}
