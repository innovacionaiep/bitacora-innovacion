'use client';

import { useEffect, useRef } from 'react';
import { useTopLoader } from 'nextjs-toploader';

/** Último recurso si isLoading queda true para siempre; no debe cortar cargas normales. */
const SAFETY_MS = 30000;

type Options = {
  /** Si true, cierra la barra residual cuando el contenido ya está listo. */
  completeOnReady?: boolean;
  /** Si false, suelta ownership sin cerrar la barra (otro tab/padre puede haberla iniciado). */
  enabled?: boolean;
};

/**
 * Muestra la barra superior mientras `isLoading` es true.
 * Incluye timeout de seguridad largo para no dejar la barra pegada ante estados rotos.
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
      // No llamar done(): el tab activo o el padre pueden haber reiniciado la barra.
      clearSafety();
      wasLoadingRef.current = false;
      // Al reactivar, completeOnReady podrá cerrar una barra residual una vez.
      initializedRef.current = false;
      return clearSafety;
    }

    if (isLoading) {
      loader.start();
      wasLoadingRef.current = true;
      initializedRef.current = true;
      clearSafety();
      safetyRef.current = setTimeout(() => finish(), SAFETY_MS);
    } else if (wasLoadingRef.current) {
      finish();
      initializedRef.current = true;
    } else if (completeOnReady && !initializedRef.current) {
      // Cierra barra residual del click de tab / keep-alive previo cuando ya hay datos.
      finish();
      initializedRef.current = true;
    } else {
      initializedRef.current = true;
    }

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
