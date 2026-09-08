/** 0% = arriba; el ángulo crece hacia la izquierda (antihorario). */
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((-angleDeg - 90) * Math.PI) / 180;
  return { x: roundSvg(cx + r * Math.cos(rad)), y: roundSvg(cy + r * Math.sin(rad)) };
}

function roundSvg(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function donutSlicePath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  startPct: number,
  endPct: number,
): string {
  const span = endPct - startPct;
  if (span <= 0) return '';
  if (span >= 99.95) {
    return [
      `M ${cx} ${cy - rOuter}`,
      `A ${rOuter} ${rOuter} 0 1 0 ${roundSvg(cx + 0.01)} ${cy - rOuter}`,
      `L ${roundSvg(cx + 0.01)} ${cy - rInner}`,
      `A ${rInner} ${rInner} 0 1 1 ${cx} ${cy - rInner}`,
      'Z',
    ].join(' ');
  }
  const start = (startPct / 100) * 360;
  const end = (endPct / 100) * 360;
  const outerStart = polarToCartesian(cx, cy, rOuter, start);
  const outerEnd = polarToCartesian(cx, cy, rOuter, end);
  const innerStart = polarToCartesian(cx, cy, rInner, start);
  const innerEnd = polarToCartesian(cx, cy, rInner, end);
  const large = end - start > 180 ? 1 : 0;
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}
