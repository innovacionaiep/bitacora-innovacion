/** Quita `tab` de la cola idle para que un click lo anteponga. */
export function dequeueTab<T>(queue: readonly T[], tab: T): T[] {
  return queue.filter((item) => item !== tab);
}

export function chunkInBursts<T>(items: readonly T[], size: number): T[][] {
  const n = Math.max(1, size);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) {
    out.push(items.slice(i, i + n) as T[]);
  }
  return out;
}

export async function runInBursts<T>(
  items: readonly T[],
  size: number,
  fn: (item: T) => Promise<unknown>,
  shouldAbort?: () => boolean
): Promise<void> {
  for (const burst of chunkInBursts(items, size)) {
    if (shouldAbort?.()) return;
    await Promise.all(burst.map((item) => fn(item)));
  }
}

export function runWhenIdle(fn: () => void, timeoutMs = 2000): () => void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const id = window.requestIdleCallback(fn, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const t = setTimeout(fn, 300);
  return () => clearTimeout(t);
}
