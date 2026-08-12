'use client';

import { useLayoutEffect, useState } from 'react';
import { ScalePortalProvider } from '@/contexts/ScalePortalContext';
import {
  APP_SCALE_ROOT_ID,
  TOUR_OVERLAY_HOST_ID,
} from '@/lib/tours/driver-scaled-ui';

/** Ancho de diseño de referencia (la densidad 110% se define respecto a este ancho). */
export const DESIGN_WIDTH = 1920;

/** Alto de diseño solo para el baseline SSR/hidratación. */
const DESIGN_HEIGHT = 1080;

/** Densidad visual preferida cuando el viewport tiene DESIGN_WIDTH (≈ zoom 110%). */
export const UI_BASE_SCALE = 1.1;

interface DesktopScaleCompensateProps {
  children: React.ReactNode;
}

type ScaleBox = {
  scale: number;
  width: number;
  height: number;
};

function readViewport(): { width: number; height: number } {
  const vv = window.visualViewport;
  return {
    width: Math.max(1, Math.round(vv?.width ?? window.innerWidth)),
    height: Math.max(1, Math.round(vv?.height ?? window.innerHeight)),
  };
}

function computeScale(viewportWidth: number): number {
  return Math.max(0.01, (viewportWidth / DESIGN_WIDTH) * UI_BASE_SCALE);
}

function boxFromViewport(width: number, height: number): ScaleBox {
  const scale = computeScale(width);
  return {
    scale,
    width: Math.round(width / scale),
    height: Math.round(height / scale),
  };
}

/** Baseline idéntico en server y primer paint del cliente (sin leer window). */
const SSR_BOX: ScaleBox = boxFromViewport(DESIGN_WIDTH, DESIGN_HEIGHT);

/**
 * Escala global del shell autenticado.
 *
 * - Escala = (viewportWidth / 1920) × 1.1
 * - El contenedor interno mide viewport/scale y se transforma para llenar la pantalla.
 * - SSR + hidratación usan siempre SSR_BOX; el viewport real solo se aplica
 *   después del mount (evita mismatch en resoluciones chicas como 800×600).
 * - `#tour-overlay-host` queda FUERA del transform para que Driver.js alinee bien.
 */
export function DesktopScaleCompensate({ children }: DesktopScaleCompensateProps) {
  const [box, setBox] = useState<ScaleBox>(SSR_BOX);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );

  useLayoutEffect(() => {
    const sync = () => {
      const vp = readViewport();
      setBox(boxFromViewport(vp.width, vp.height));
    };
    sync();
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('resize', sync);
    };
  }, []);

  return (
    <ScalePortalProvider container={portalContainer}>
      <div
        className="fixed inset-0 overflow-hidden overscroll-none bg-background"
        style={{ width: '100%', height: '100%' }}
      >
        {/* Capas de Driver.js: hermana del scale root (sin transform). */}
        <div
          id={TOUR_OVERLAY_HOST_ID}
          className="pointer-events-none fixed inset-0 z-[1000000000] overflow-visible"
          aria-hidden
        />
        <div
          id={APP_SCALE_ROOT_ID}
          ref={(el) => setPortalContainer(el)}
          className="bg-background text-foreground overflow-hidden overscroll-none"
          data-ui-scale={box.scale}
          suppressHydrationWarning
          style={{
            width: box.width,
            height: box.height,
            transform: `scale(${box.scale})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>
    </ScalePortalProvider>
  );
}
