export const VITRINA_ANIM_MS = 500;

export const VITRINA_PANEL_MOTION =
  'transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]';

export type VitrinaScene = 'hero' | 'projects';

export function vitrinaTypewriterPaused(
  scene: VitrinaScene,
  busy: boolean,
): boolean {
  return scene === 'projects' || busy;
}

export function vitrinaCarouselLive(
  scene: VitrinaScene,
  busy: boolean,
): boolean {
  return scene === 'hero' && !busy;
}

export function vitrinaGridMounted(hasVisitedProjects: boolean): boolean {
  return hasVisitedProjects;
}

export function canGoToProjects(busy: boolean, scene: VitrinaScene): boolean {
  return !busy && scene === 'hero';
}

export function canGoToHero(busy: boolean, scene: VitrinaScene): boolean {
  return !busy && scene === 'projects';
}

/** Factor visual/layout (p. ej. getBoundingClientRect().width / offsetWidth). */
export function layoutScaleFromSizes(
  visualWidth: number,
  layoutWidth: number,
): number {
  if (!(layoutWidth > 0) || !(visualWidth > 0)) return 1;
  return visualWidth / layoutWidth;
}

/** Pasa un rect visual (post-transform) a coords del canvas interno. */
export function unscaleRelativeRect(
  parent: { left: number; top: number },
  child: { left: number; top: number; width: number; height: number },
  scale: number,
): { left: number; top: number; width: number; height: number } {
  const s = scale > 0 ? scale : 1;
  return {
    left: (child.left - parent.left) / s,
    top: (child.top - parent.top) / s,
    width: child.width / s,
    height: child.height / s,
  };
}

export function heroBandFromRects(
  mainTop: number,
  heroTop: number,
  heroHeight: number,
  scale = 1,
): { top: number; height: number } {
  const s = scale > 0 ? scale : 1;
  return { top: (heroTop - mainTop) / s, height: heroHeight / s };
}
