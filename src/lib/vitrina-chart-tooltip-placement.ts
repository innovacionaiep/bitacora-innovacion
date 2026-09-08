export const VITRINA_CHART_TOOLTIP_GAP = 14;
export const VITRINA_CHART_TOOLTIP_PAD = 8;

export function fitVitrinaChartTooltip({
  cursorX,
  cursorY,
  width,
  height,
  viewportWidth,
  viewportHeight,
  gap = VITRINA_CHART_TOOLTIP_GAP,
  pad = VITRINA_CHART_TOOLTIP_PAD,
}: {
  cursorX: number;
  cursorY: number;
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
  gap?: number;
  pad?: number;
}): { left: number; top: number } {
  const maxW = Math.max(1, viewportWidth - pad * 2);
  const maxH = Math.max(1, viewportHeight - pad * 2);
  const w = Math.min(Math.max(width, 0), maxW);
  const h = Math.min(Math.max(height, 0), maxH);

  const fitsRight = cursorX + gap + w <= viewportWidth - pad;
  const fitsLeft = cursorX - gap - w >= pad;
  let left = !fitsRight && fitsLeft ? cursorX - gap - w : cursorX + gap;
  left = Math.min(Math.max(pad, left), viewportWidth - w - pad);

  const fitsBelow = cursorY + gap + h <= viewportHeight - pad;
  const fitsAbove = cursorY - gap - h >= pad;
  let top = !fitsBelow && fitsAbove ? cursorY - gap - h : cursorY + gap;
  top = Math.min(Math.max(pad, top), viewportHeight - h - pad);

  return { left, top };
}
