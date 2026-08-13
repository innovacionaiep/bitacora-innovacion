/** Revelado del tab General: OG → OEs → video → secciones DT, una a una. */

export const GENERAL_CORE_SECTION_COUNT = 3;
export const GENERAL_SECTION_REVEAL_MS = 70;
/** Más lento que el core: si es corto, el DT parece aparecer de golpe. */
export const GENERAL_DT_SECTION_REVEAL_MS = 220;

export function initialGeneralReveal(
  isShell: boolean,
  hasDt: boolean
): { core: number; dt: number } {
  if (isShell) return { core: 0, dt: 0 };
  return {
    core: GENERAL_CORE_SECTION_COUNT,
    dt: hasDt ? Number.POSITIVE_INFINITY : 0,
  };
}

export function visibleDtSectionCount(
  dtRevealed: number,
  total: number
): number {
  if (total <= 0) return 0;
  if (!Number.isFinite(dtRevealed)) return total;
  return Math.max(0, Math.min(total, Math.floor(dtRevealed)));
}
