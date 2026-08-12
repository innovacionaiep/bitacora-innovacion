import {
  driver,
  type Config,
  type Driver,
  type DriveStep,
} from 'driver.js';

export const TOUR_OVERLAY_HOST_ID = 'tour-overlay-host';
export const APP_SCALE_ROOT_ID = 'app-scale-root';

const POPOVER_OFFSET_PX = 10;
const ARROW_SIZE_PX = 5;

type TourSide = 'top' | 'right' | 'bottom' | 'left' | 'over';
type TourAlign = 'start' | 'center' | 'end';

/**
 * Scroll minimo para revelar el ancla. Evita block:'center' que en viewports
 * bajos (720p) deja un hueco enorme debajo del target.
 */
export function scrollTourAnchorIntoView(element: HTMLElement): void {
  element.scrollIntoView({
    block: 'nearest',
    inline: 'nearest',
    behavior: 'instant',
  });
}

/**
 * Driver.js monta overlay/popover en document.body. Bajo DesktopScaleCompensate
 * hay que reubicar capas fuera del transform y forzar top/left + flecha.
 */
export function ensureDriverLayersOnTourHost(): void {
  const host = document.getElementById(TOUR_OVERLAY_HOST_ID);
  if (!host) return;
  for (const el of document.querySelectorAll(
    '.driver-overlay, .driver-popover, #driver-dummy-element'
  )) {
    if (el.parentElement !== host) {
      host.appendChild(el);
    }
  }
}

function readPopoverSide(popover: HTMLElement): TourSide {
  const sideClass = [...popover.classList].find((c) =>
    c.startsWith('driver-popover-side-')
  );
  const side = sideClass?.replace('driver-popover-side-', '') as
    | TourSide
    | undefined;
  return side ?? 'bottom';
}

function readPopoverAlign(popover: HTMLElement): TourAlign {
  const alignClass = [...popover.classList].find((c) =>
    c.startsWith('driver-popover-align-')
  );
  const align = alignClass?.replace('driver-popover-align-', '') as
    | TourAlign
    | undefined;
  return align ?? 'center';
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function readUiScale(): number {
  const root = document.getElementById(APP_SCALE_ROOT_ID);
  const raw = root?.getAttribute('data-ui-scale');
  const n = raw ? Number.parseFloat(raw) : NaN;
  if (Number.isFinite(n) && n > 0.01) return n;
  const t = root ? getComputedStyle(root).transform : '';
  if (t && t !== 'none') {
    try {
      const m = new DOMMatrixReadOnly(t);
      if (Number.isFinite(m.a) && Math.abs(m.a) > 0.01) return Math.abs(m.a);
    } catch {
      /* ignore */
    }
  }
  return 1;
}

function alignAxis(
  align: TourAlign,
  start: number,
  size: number,
  popoverSize: number
): number {
  if (align === 'center') return start + size / 2 - popoverSize / 2;
  if (align === 'end') return start + size - popoverSize;
  return start;
}

/**
 * Caret al centro del solape ancla/popover.
 * Con popover escalado (transform), style.left/top estan en coords de LAYOUT;
 * getBoundingClientRect esta en coords VISUALES => convertir / uiScale.
 */
export function repositionDriverArrow(
  element: HTMLElement,
  popover: HTMLElement,
  side: TourSide,
  uiScale: number = 1,
  align: TourAlign = 'center'
): void {
  if (side === 'over') return;
  const arrow = popover.querySelector(
    '.driver-popover-arrow'
  ) as HTMLElement | null;
  if (!arrow) return;

  const er = element.getBoundingClientRect();
  const pr = popover.getBoundingClientRect();
  const arrowSizeLayout = ARROW_SIZE_PX * 2;
  const layoutW = popover.offsetWidth || pr.width / uiScale || 280;
  const layoutH = popover.offsetHeight || pr.height / uiScale || 120;

  arrow.style.top = '';
  arrow.style.right = '';
  arrow.style.bottom = '';
  arrow.style.left = '';

  const overlapCenterVisual = (
    elStart: number,
    elEnd: number,
    popStart: number,
    popEnd: number
  ): number => {
    const popSize = popEnd - popStart;
    if (elStart <= popStart + 0.5 && elEnd >= popEnd - 0.5) {
      const padVisual = (15 + arrowSizeLayout / 2) * uiScale;
      if (align === 'start') return padVisual;
      if (align === 'end') return popSize - padVisual;
      return popSize / 2;
    }
    const a = Math.min(Math.max(elStart, popStart), popEnd);
    const b = Math.min(Math.max(elEnd, popStart), popEnd);
    return (a + b) / 2 - popStart;
  };

  const clampArrow = (centerLayout: number, layoutSize: number): number => {
    const max = layoutSize - 15 - arrowSizeLayout;
    if (max < 15) return Math.max(0, (layoutSize - arrowSizeLayout) / 2);
    const left = centerLayout - arrowSizeLayout / 2;
    return Math.min(Math.max(left, 15), max);
  };

  if (side === 'left' || side === 'right') {
    const visualCenter = overlapCenterVisual(
      er.top,
      er.bottom,
      pr.top,
      pr.bottom
    );
    arrow.style.top = `${clampArrow(visualCenter / uiScale, layoutH)}px`;
  } else {
    const visualCenter = overlapCenterVisual(
      er.left,
      er.right,
      pr.left,
      pr.right
    );
    arrow.style.left = `${clampArrow(visualCenter / uiScale, layoutW)}px`;
  }
}

/**
 * Recoloca el popover con top/left (nunca bottom/right) y realinea el caret.
 * Escala el popover con la misma densidad que DesktopScaleCompensate.
 */
export function repositionDriverPopover(
  element: Element | undefined | null,
  offsetPx: number = POPOVER_OFFSET_PX
): void {
  if (!(element instanceof HTMLElement)) return;
  const popover = document.querySelector(
    '.driver-popover'
  ) as HTMLElement | null;
  if (!popover || popover.style.display === 'none') return;

  const side = readPopoverSide(popover);
  if (side === 'over') return;

  const align = readPopoverAlign(popover);
  const uiScale = readUiScale();
  const er = element.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const edge = ARROW_SIZE_PX;

  popover.style.transform = `scale(${uiScale})`;
  popover.style.transformOrigin = '0 0';

  const layoutW = popover.offsetWidth || 280;
  const layoutH = popover.offsetHeight || 120;
  const visualW = layoutW * uiScale;
  const visualH = layoutH * uiScale;

  let top = er.top;
  let left = er.left;

  if (side === 'bottom') {
    top = er.bottom + offsetPx;
    left = alignAxis(align, er.left, er.width, visualW);
  } else if (side === 'top') {
    top = er.top - visualH - offsetPx;
    left = alignAxis(align, er.left, er.width, visualW);
  } else if (side === 'left') {
    left = er.left - visualW - offsetPx;
    top = alignAxis(align, er.top, er.height, visualH);
  } else if (side === 'right') {
    left = er.right + offsetPx;
    top = alignAxis(align, er.top, er.height, visualH);
  }

  left = clamp(left, edge, Math.max(edge, vw - visualW - edge));
  top = clamp(top, edge, Math.max(edge, vh - visualH - edge));

  popover.style.top = `${top}px`;
  popover.style.left = `${left}px`;
  popover.style.bottom = 'auto';
  popover.style.right = 'auto';

  repositionDriverArrow(element, popover, side, uiScale, align);
}

function syncTourLayers(
  activeDriver: Driver,
  element?: Element | null
): void {
  const el =
    element ??
    (activeDriver.getActiveElement?.() as Element | undefined) ??
    null;
  ensureDriverLayersOnTourHost();
  activeDriver.refresh();
  ensureDriverLayersOnTourHost();
  repositionDriverPopover(el);
}

function scheduleTourLayoutSync(
  activeDriver: Driver,
  element: Element | undefined
): void {
  const run = () => syncTourLayers(activeDriver, element);
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
  window.setTimeout(run, 50);
  window.setTimeout(run, 150);
}

function attachTourViewportGuards(activeDriver: Driver): () => void {
  let frame = 0;
  const onChange = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      if (!activeDriver.isActive?.()) return;
      syncTourLayers(activeDriver);
    });
  };
  window.addEventListener('scroll', onChange, true);
  window.addEventListener('resize', onChange);
  window.visualViewport?.addEventListener('resize', onChange);
  window.visualViewport?.addEventListener('scroll', onChange);
  return () => {
    if (frame) window.cancelAnimationFrame(frame);
    window.removeEventListener('scroll', onChange, true);
    window.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('scroll', onChange);
  };
}

export type CreateBitacoraTourConfig = Config & {
  steps: DriveStep[];
};

/**
 * Factory comun para tours Bitacora bajo DesktopScaleCompensate.
 */
export function createBitacoraTourDriver(
  config: CreateBitacoraTourConfig
): Driver {
  const userOnHighlightStarted = config.onHighlightStarted;
  const userOnHighlighted = config.onHighlighted;
  const userOnDestroyed = config.onDestroyed;
  let detachGuards: (() => void) | null = null;

  const d = driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 8,
    popoverOffset: POPOVER_OFFSET_PX,
    ...config,
    animate: false,
    smoothScroll: false,
    onHighlightStarted: (element, step, opts) => {
      userOnHighlightStarted?.(element, step, opts);
      ensureDriverLayersOnTourHost();
      scheduleTourLayoutSync(opts.driver, element);
    },
    onHighlighted: (element, step, opts) => {
      ensureDriverLayersOnTourHost();
      repositionDriverPopover(element);
      window.setTimeout(() => {
        syncTourLayers(opts.driver, element);
      }, 0);
      userOnHighlighted?.(element, step, opts);
    },
    onDestroyed: (element, step, opts) => {
      detachGuards?.();
      detachGuards = null;
      userOnDestroyed?.(element, step, opts);
    },
  });

  const originalDrive = d.drive.bind(d);
  d.drive = (stepIndex?: number) => {
    detachGuards?.();
    detachGuards = attachTourViewportGuards(d);
    return originalDrive(stepIndex);
  };

  return d;
}
