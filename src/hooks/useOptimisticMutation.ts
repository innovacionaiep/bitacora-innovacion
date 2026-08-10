'use client';

import { useCallback } from 'react';
import {
  runOptimisticMutation,
  type OptimisticMutationResult,
} from '@/lib/ui/optimistic-mutation';

/**
 * Hook wrapper around runOptimisticMutation for client components.
 */
export function useOptimisticMutation() {
  return useCallback(
    <TServer, TPatch = void>(params: {
      apply: () => TPatch | void;
      mutate: () => Promise<{
        success: boolean;
        data?: TServer;
        error?: string;
      }>;
      rollback: (snapshot: TPatch | void) => void;
      commit?: (data: TServer) => void;
    }): Promise<OptimisticMutationResult<TServer>> =>
      runOptimisticMutation(params),
    []
  );
}
