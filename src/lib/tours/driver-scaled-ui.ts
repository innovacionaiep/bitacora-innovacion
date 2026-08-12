import {
  driver,
  type Config,
  type Driver,
  type DriveStep,
} from 'driver.js';

export const TOUR_OVERLAY_HOST_ID = 'tour-overlay-host';
export const APP_SCALE_ROOT_ID = 'app-scale-root';

const POPOVER_OFFSET_PX = 10;

type TourSide = 'top' | 'right' | 'bottom' | 'left' | 'over';

/**
 * Driver.js monta overlay/popover en document.body y, en side=bottom/right,
 * positions with bottom/right using window.innerHeight/Width. Under the scaled shell (and body position:fixed) that misaligns the caret on every tour. Reubicamos las capas fuera del scale y forzamos top/left
 * desde getBoundingClientRect (coords visuales).
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

function readPopoverAlign(
  popover: HTMLElement
): 'start' | 'center' | 'end' {
  const alignClass = [...popover.classList].find((c) =>
    c.startsWith('driver-popover-align-')
  );
  const align = alignClass?.replace('driver-popover-align-', '') as
    | 'start'
    | 'center'
    | 'end'
    | undefined;
  return align ?? 'start';
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Recoloca el popover con top/left (nunca bottom/right) alineado al ancla.
 * Exportado para tests.
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
  const er = element.getBoundingClientRect();
  const pr = popover.getBoundingClientRect();
  const arrow = 5;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = pr.top;
  let left = pr.left;

  if (side === 'bottom') {
    top = er.bottom + offsetPx;
    left =
      align === 'center'
        ? er.left + er.width / 2 - pr.width / 2
        : align === 'end'
          ? er.right - pr.width
          : er.left;
  } else if (side === 'top') {
    top = er.top - pr.height - offsetPx;
    left =
      align === 'center'
        ? er.left + er.width / 2 - pr.width / 2
        : align === 'end'
          ? er.right - pr.width
          : er.left;
  } else if (side === 'left') {
    left = er.left - pr.width - offsetPx;
    top =
      align === 'center'
        ? er.top + er.height / 2 - pr.height / 2
        : align === 'end'
          ? er.bottom - pr.height
          : er.top;
  } else if (side === 'right') {
    left = er.right + offsetPx;
    top =
      align === 'center'
        ? er.top + er.height / 2 - pr.height / 2
        : align === 'end'
          ? er.bottom - pr.height
          : er.top;
  }

  left = clamp(left, arrow, vw - pr.width - arrow);
  top = clamp(top, arrow, vh - pr.height - arrow);

  popover.style.top = `${Math.round(top)}px`;
  popover.style.left = `${Math.round(left)}px`;
  popover.style.bottom = 'auto';
  popover.style.right = 'auto';
}

function scheduleTourLayoutSync(
  activeDriver: Driver,
  element: Element | undefined
): void {
  const run = () => {
    ensureDriverLayersOnTourHost();
    activeDriver.refresh();
    ensureDriverLayersOnTourHost();
    repositionDriverPopover(element);
  };
  // Double rAF: after scrollIntoView / scaled shell layout.
  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

export type CreateBitacoraTourConfig = Config & {
  steps: DriveStep[];
};

/**
 * Factory común para tours Bitácora bajo DesktopScaleCompensate.
 */
export function createBitacoraTourDriver(
  config: CreateBitacoraTourConfig
): Driver {
  const userOnHighlightStarted = config.onHighlightStarted;
  const userOnHighlighted = config.onHighlighted;

  return driver({
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 8,
    popoverOffset: POPOVER_OFFSET_PX,
    ...config,
    // After ...config: disable animate (fights refresh/scroll under scale).
    animate: false,
    onHighlightStarted: (element, step, opts) => {
      userOnHighlightStarted?.(element, step, opts);
      ensureDriverLayersOnTourHost();
      scheduleTourLayoutSync(opts.driver, element);
    },
    onHighlighted: (element, step, opts) => {
      ensureDriverLayersOnTourHost();
      repositionDriverPopover(element);
      userOnHighlighted?.(element, step, opts);
    },
  });
}
