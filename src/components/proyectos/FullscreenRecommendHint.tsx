'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

const DELAY_AFTER_READY_MS = 2_000;
const VISIBLE_MS = 2_500;
const FADE_MS = 300;
/** Debe cubrir la transición de ancho del sidebar (~200ms). */
const SIDEBAR_LAYOUT_SYNC_MS = 250;

export type FullscreenHintSide = 'top' | 'right';

/**
 * Muestra un hint: 2s después de `ready`, visible 2,5s.
 * - `active`: tab visible (al salir se resetea para la próxima visita).
 * - `enabled`: p. ej. no estar en pantalla completa.
 */
export function useFullscreenRecommendHint(
  ready: boolean,
  { active, enabled }: { active: boolean; enabled: boolean }
) {
  const [show, setShow] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (!active) {
      setShow(false);
      shownRef.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (!active || !enabled) {
      setShow(false);
      return;
    }
    if (!ready || shownRef.current) return;

    let hideTimer: ReturnType<typeof setTimeout> | null = null;
    const showTimer = setTimeout(() => {
      shownRef.current = true;
      setShow(true);
      hideTimer = setTimeout(() => setShow(false), VISIBLE_MS);
    }, DELAY_AFTER_READY_MS);

    return () => {
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [ready, active, enabled]);

  return show;
}

export function FullscreenRecommendHint({
  show,
  side = 'top',
  children,
}: {
  show: boolean;
  /** `top` = encima del botón (default); `right` = a la derecha. */
  side?: FullscreenHintSide;
  children: ReactNode;
}) {
  const { state: sidebarState } = useSidebar();
  const anchorRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null
  );
  const [mounted, setMounted] = useState(false);
  const [renderHint, setRenderHint] = useState(false);
  const [opaque, setOpaque] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fade in / fade out manteniendo el nodo montado durante la salida.
  useEffect(() => {
    if (show) {
      setRenderHint(true);
      const id = requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpaque(true));
      });
      return () => cancelAnimationFrame(id);
    }

    setOpaque(false);
    const t = setTimeout(() => {
      setRenderHint(false);
      setCoords(null);
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [show]);

  useLayoutEffect(() => {
    if (!renderHint) return;

    const update = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (side === 'right') {
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.right + 8,
        });
      } else {
        // Alineado al borde izquierdo del botón (inicio del texto).
        setCoords({
          top: rect.top,
          left: rect.left,
        });
      }
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    const sidebarEl = document.querySelector<HTMLElement>('.peer[data-state]');
    const ro = new ResizeObserver(update);
    if (anchorRef.current) ro.observe(anchorRef.current);
    if (sidebarEl) ro.observe(sidebarEl);

    // Sidebar anima width sin window.resize: seguir el layout unos frames.
    let raf = 0;
    const endAt = performance.now() + SIDEBAR_LAYOUT_SYNC_MS;
    const tick = () => {
      update();
      if (performance.now() < endAt) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [renderHint, side, sidebarState]);

  const hintStyle =
    side === 'right'
      ? {
          top: coords?.top,
          left: coords?.left,
          transform: 'translateY(-50%)',
          transitionDuration: `${FADE_MS}ms`,
        }
      : {
          top: coords?.top,
          left: coords?.left,
          transform: 'translateY(calc(-100% - 8px))',
          transitionDuration: `${FADE_MS}ms`,
        };

  const hint =
    mounted && renderHint && coords
      ? createPortal(
          <div
            role="status"
            className={cn(
              'pointer-events-none fixed z-[200] whitespace-nowrap rounded-lg bg-gray-500 px-3 py-2 text-xs font-medium text-white shadow-lg transition-opacity ease-out',
              opaque ? 'opacity-100' : 'opacity-0'
            )}
            style={hintStyle}
          >
            Ver pantalla completa
            {side === 'right' ? (
              <span
                className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-500"
                aria-hidden
              />
            ) : (
              <span
                className="absolute left-3 top-full border-4 border-transparent border-t-gray-500"
                aria-hidden
              />
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={anchorRef} className="relative inline-flex shrink-0">
      {hint}
      {children}
    </div>
  );
}
