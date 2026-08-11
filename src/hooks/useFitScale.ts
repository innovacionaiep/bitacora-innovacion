'use client';

import {
  useLayoutEffect,
  useState,
  type DependencyList,
  type RefObject,
} from 'react';

export type FitScaleSize = {
  width: number;
  height: number;
};

type UseFitScaleOptions = {
  /** Otros nodos cuyo scrollWidth entra en el cálculo del scale (p. ej. header OG). */
  extraWidthRefs?: RefObject<HTMLElement | null>[];
};

/**
 * Escala el contenido para que quepa en el ancho del contenedor sin recortar.
 * scale ∈ (0, 1]; transform no altera el layout box, por eso se expone
 * naturalSize para que el wrapper reserve height = naturalHeight * scale.
 */
export function useFitScale(
  containerRef: RefObject<HTMLElement | null>,
  contentRef: RefObject<HTMLElement | null>,
  deps: DependencyList = [],
  options: UseFitScaleOptions = {}
): { scale: number; naturalSize: FitScaleSize } {
  const { extraWidthRefs = [] } = options;
  const [scale, setScale] = useState(1);
  const [naturalSize, setNaturalSize] = useState<FitScaleSize>({
    width: 0,
    height: 0,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let frame = 0;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const available = container.clientWidth;
        const contentWidth = content.scrollWidth;
        const height = content.scrollHeight;
        let width = contentWidth;
        for (const ref of extraWidthRefs) {
          const extra = ref.current?.scrollWidth ?? 0;
          if (extra > width) width = extra;
        }
        const nextScale =
          width > 0 ? Math.min(1, Math.max(0.01, (available - 4) / width)) : 1;

        setScale((prev) =>
          Math.abs(prev - nextScale) < 0.001 ? prev : nextScale
        );
        setNaturalSize((prev) =>
          prev.width === contentWidth && prev.height === height
            ? prev
            : { width: contentWidth, height }
        );
      });
    };

    const ro = new ResizeObserver(measure);
    ro.observe(container);
    ro.observe(content);
    for (const ref of extraWidthRefs) {
      if (ref.current) ro.observe(ref.current);
    }
    measure();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps controlan re-measure al cambiar el árbol
  }, [containerRef, contentRef, ...deps, ...extraWidthRefs]);

  return { scale, naturalSize };
}
