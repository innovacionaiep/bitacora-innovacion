'use client';

import { useEffect, useRef } from 'react';
import { useTopLoader } from 'nextjs-toploader';

const SAFETY_MS = 4000;

type Options = {
  /** Si true, al montar ya sin loading cierra la barra (p. ej. cache tras click de tab). */
  completeOnReady?: boolean;
  /** Si false, no inicia la barra y cierra si estaba activa (tab oculto en keep-alive). */
  enabled?: boolean;
};

/**
 * Muestra la barra superior mientras `isLoading` es true.
 * Incluye timeout de seguridad para no dejar la barra pegada.
 */
export function usePageTopLoader(
  isLoading: boolean,
  completeOnReadyOrOptions: boolean | Options = false
) {
  const options: Options =
    typeof completeOnReadyOrOptions === 'boolean'
      ? { completeOnReady: completeOnReadyOrOptions, enabled: true }
      : {
          completeOnReady: completeOnReadyOrOptions.completeOnReady ?? false,
          enabled: completeOnReadyOrOptions.enabled ?? true,
        };

  const completeOnReady = options.completeOnReady ?? false;
  const enabled = options.enabled ?? true;
  const loader = useTopLoader();
  const wasLoadingRef = useRef(false);
  const initializedRef = useRef(false);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearSafety = () => {
      if (safetyRef.current != null) {
        clearTimeout(safetyRef.current);
        safetyRef.current = null;
      }
    };

    const finish = () => {
      clearSafety();
      loader.done(true);
      wasLoadingRef.current = false;
    };

    if (!enabled) {
      if (wasLoadingRef.current) finish();
      return clearSafety;
    }

    if (isLoading) {
      loader.start();
      wasLoadingRef.current = true;
      clearSafety();
      safetyRef.current = setTimeout(() => finish(), SAFETY_MS);
    } else if (wasLoadingRef.current) {
      finish();
    } else if (completeOnReady && !initializedRef.current) {
      finish();
    }
    initializedRef.current = true;

    return clearSafety;
  }, [isLoading, loader, completeOnReady, enabled]);

  useEffect(() => {
    return () => {
      if (safetyRef.current != null) {
        clearTimeout(safetyRef.current);
        safetyRef.current = null;
      }
      if (wasLoadingRef.current) {
        loader.done(true);
        wasLoadingRef.current = false;
      }
    };
  }, [loader]);
}
