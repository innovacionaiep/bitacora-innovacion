'use client';

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useFitScale } from '@/hooks/useFitScale';
import { cn } from '@/lib/utils';

interface IndicadoresFitScaleProps {
  children: ReactNode;
  /** Cabecera fija (Objetivo General); misma escala que el árbol, sin scroll. */
  header?: ReactNode;
  className?: string;
  /** Re-medir cuando cambia la forma del árbol (p. ej. cantidad de OE). */
  measureKey?: string | number;
}

/**
 * Escala el diagrama al ancho disponible.
 * El header (OG) queda fijo; solo scrollean objetivos específicos + indicadores.
 */
export function IndicadoresFitScale({
  children,
  header,
  className,
  measureKey,
}: IndicadoresFitScaleProps) {
  const listContainerRef = useRef<HTMLDivElement>(null);
  const listContentRef = useRef<HTMLDivElement>(null);
  const headerContentRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const { scale, naturalSize } = useFitScale(
    listContainerRef,
    listContentRef,
    [measureKey],
    { extraWidthRefs: [headerContentRef] }
  );

  const needsScale = scale < 0.999;
  const scaledListHeight =
    needsScale && naturalSize.height > 0
      ? naturalSize.height * scale
      : undefined;

  useLayoutEffect(() => {
    const el = headerContentRef.current;
    if (!el) {
      setHeaderHeight(0);
      return;
    }
    const measure = () => setHeaderHeight(el.scrollHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureKey, header]);

  const scaledHeaderHeight =
    headerHeight > 0 ? headerHeight * (needsScale ? scale : 1) : undefined;

  return (
    <div className={cn('flex h-full min-h-0 flex-col', className)}>
      {header != null && (
        <div
          className="relative w-full shrink-0 overflow-hidden"
          style={
            scaledHeaderHeight != null
              ? { height: scaledHeaderHeight }
              : undefined
          }
        >
          <div
            ref={headerContentRef}
            className="origin-top-left will-change-transform"
            style={{
              transform: needsScale ? `scale(${scale})` : undefined,
              width: 'max-content',
            }}
          >
            {header}
          </div>
        </div>
      )}

      <div
        ref={listContainerRef}
        id="tour-indicadores-lista-scroll"
        className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        <div
          className={cn('relative w-full', needsScale && 'overflow-hidden')}
          style={
            scaledListHeight != null ? { height: scaledListHeight } : undefined
          }
        >
          <div
            ref={listContentRef}
            className={cn(
              'origin-top-left will-change-transform',
              needsScale && 'absolute top-0 left-0'
            )}
            style={{
              transform: needsScale ? `scale(${scale})` : undefined,
              width: 'max-content',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
