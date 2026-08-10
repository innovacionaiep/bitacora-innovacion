/**
 * Shared optimistic mutation helpers.
 * Apply UI/cache patch first, await server, rollback on failure, optional merge on success.
 */

export type OptimisticMutationResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

/**
 * Run an optimistic mutation:
 * 1. apply() — update UI immediately
 * 2. await mutate() — server write
 * 3. on failure: rollback() + return error
 * 4. on success: optional commit(serverData) for silent merge
 */
export async function runOptimisticMutation<TServer, TPatch = void>(params: {
  apply: () => TPatch | void;
  mutate: () => Promise<{ success: boolean; data?: TServer; error?: string }>;
  rollback: (snapshot: TPatch | void) => void;
  commit?: (data: TServer) => void;
}): Promise<OptimisticMutationResult<TServer>> {
  const snapshot = params.apply();
  try {
    const result = await params.mutate();
    if (!result.success) {
      params.rollback(snapshot);
      return { ok: false, error: result.error ?? 'Error al guardar' };
    }
    if (result.data !== undefined && params.commit) {
      params.commit(result.data);
    }
    return { ok: true, data: result.data };
  } catch (err) {
    params.rollback(snapshot);
    const error = err instanceof Error ? err.message : 'Error al guardar';
    return { ok: false, error };
  }
}
