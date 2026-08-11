'use client';

import { useLayoutEffect, useState } from 'react';
import { ScalePortalProvider } from '@/contexts/ScalePortalContext';

/** Tamaño visual estándar ≈ zoom 110% del navegador a DPR 1. */
export const UI_BASE_SCALE = 1.1;

interface DesktopScaleCompensateProps {
  children: React.ReactNode;
}

/**
 * Escala global del shell autenticado:
 * - Base 110% (`UI_BASE_SCALE`) como tamaño estándar a zoom 100%.
 * - Compensa DPR del SO/navegador (>1) para mantener esa densidad relativa.
 * Proporciona el contenedor escalado al contexto para que dropdowns/sheets
 * se rendericen dentro y hereden la escala.
 *
 * SSR + primer paint del cliente usan siempre dprFactor=1 (misma fórmula) para
 * evitar mismatch de hidratación; el DPR real se aplica en useLayoutEffect.
 *
 * Usa `calc(100% / scale)` + `scale()` para que el tamaño visual coincida con el
 * viewport sin desborde por redondeo de floats (evita scrollbar fantasma).
 */
export function DesktopScaleCompensate({ children }: DesktopScaleCompensateProps) {
  const [mounted, setMounted] = useState(false);
  const [dpr, setDpr] = useState(1);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const sync = () => {
      const ratio = window.devicePixelRatio || 1;
      setDpr(ratio > 1 ? ratio : 1);
    };
    setMounted(true);
    sync();
    window.addEventListener('resize', sync);
    window.visualViewport?.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.visualViewport?.removeEventListener('resize', sync);
    };
  }, []);

  // Antes de montar: dprFactor fijo en 1 → HTML idéntico en server y cliente
  const dprFactor = mounted && dpr > 1 ? dpr : 1;
  const scale = UI_BASE_SCALE / dprFactor;

  return (
    <ScalePortalProvider container={portalContainer}>
      <div
        className="fixed inset-0 overflow-hidden overscroll-none"
        style={{ width: '100%', height: '100%' }}
      >
        <div
          ref={(el) => setPortalContainer(el)}
          className="bg-background text-foreground overflow-hidden overscroll-none"
          // Estilos dependen del DPR del dispositivo tras el mount
          suppressHydrationWarning
          style={{
            width: `calc(100% / ${scale})`,
            height: `calc(100% / ${scale})`,
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
          }}
        >
          {children}
        </div>
      </div>
    </ScalePortalProvider>
  );
}
