/** Revelado del tab General: OG → OEs → video → secciones DT, una a una. */

export const GENERAL_CORE_SECTION_COUNT = 3;
export const GENERAL_SECTION_REVEAL_MS = 70;

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
