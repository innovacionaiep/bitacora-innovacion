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
  /** Densidad en DESIGN_WIDTH. Default 1.1 (app). Vitrina usa 1. */
  baseScale?: number;
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

function computeScale(viewportWidth: number, baseScale: number): number {
  return Math.max(0.01, (viewportWidth / DESIGN_WIDTH) * baseScale);
}

function boxFromViewport(
  width: number,
  height: number,
  baseScale: number,
): ScaleBox {
  const scale = computeScale(width, baseScale);
  // ceil + 1px: Math.round puede dejar el layer más corto que el viewport, y el
  // borde del transform se antialias contra el fondo blanco (franja de 1px bajo
  // el sidebar). El overflow extra lo recorta overflow-hidden del contenedor.
  return {
    scale,
    width: Math.ceil(width / scale) + 1,
    height: Math.ceil(height / scale) + 1,
  };
}

/**
 * Escala global del shell autenticado (y de vitrina con baseScale distinto).
 *
 * - Escala = (viewportWidth / 1920) × baseScale (default 1.1)
 * - El contenedor interno mide viewport/scale y se transforma para llenar la pantalla.
 * - SSR + hidratación usan el baseline 1920×1080 con el mismo baseScale; el
 *   viewport real solo se aplica después del mount.
 * - `#tour-overlay-host` queda FUERA del transform para que Driver.js alinee bien.
 */
export function DesktopScaleCompensate({
  children,
  baseScale = UI_BASE_SCALE,
}: DesktopScaleCompensateProps) {
  const [box, setBox] = useState<ScaleBox>(() =>
    boxFromViewport(DESIGN_WIDTH, DESIGN_HEIGHT, baseScale),
  );
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(
    null
  );

  useLayoutEffect(() => {
    const sync = () => {
      const vp = readViewport();
      setBox(boxFromViewport(vp.width, vp.height, baseScale));
    };
    sync();
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('resize', sync);
    };
  }, [baseScale]);

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
