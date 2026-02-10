'use client';

import { createModel } from 'vosk-browser';

const VOSK_MODEL_URL =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_VOSK_MODEL_URL?.trim()
    ? process.env.NEXT_PUBLIC_VOSK_MODEL_URL
    : '/vosk-model/model.tar.gz';

let cachedModel: Awaited<ReturnType<typeof createModel>> | null = null;
let loadPromise: Promise<Awaited<ReturnType<typeof createModel>>> | null = null;

/**
 * Preloads the Vosk model in the background. Call when the user enters the
 * Seguimiento tab to avoid delay when they start a meeting with system audio.
 */
export function preloadVoskModel(): void {
  if (cachedModel || loadPromise) return;
  loadPromise = createModel(VOSK_MODEL_URL, -1).then((model) => {
    cachedModel = model;
    return model;
  });
}

/**
 * Returns the Vosk model, loading it if necessary.
 */
export async function getVoskModel(): Promise<
  Awaited<ReturnType<typeof createModel>>
> {
  if (cachedModel) return cachedModel;
  if (!loadPromise) loadPromise = createModel(VOSK_MODEL_URL, -1);
  const model = await loadPromise;
  cachedModel = model;
  return model;
}
