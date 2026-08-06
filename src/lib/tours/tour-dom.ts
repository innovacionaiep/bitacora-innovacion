import type { DriveStep } from 'driver.js';

export function isTourElementVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  // Usar estilo computado: cubre keep-alive (`hidden`) y variantes
  // responsive (`hidden lg:flex`) sin falsos negativos por classList.
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  let parent: HTMLElement | null = el.parentElement;
  while (parent) {
    const parentStyle = window.getComputedStyle(parent);
    if (
      parentStyle.display === 'none' ||
      parentStyle.visibility === 'hidden'
    ) {
      return false;
    }
    parent = parent.parentElement;
  }
  return true;
}

/**
 * Filtra pasos cuyo ancla no exista o no sea visible (tabs keep-alive con `.hidden`,
 * duplicados móvil/desktop). Resuelve al Element visible para Driver.js.
 */
export function filterVisibleTourSteps(steps: DriveStep[]): DriveStep[] {
  return steps.flatMap((s) => {
    if (typeof s.element !== 'string') return [s];
    const nodes = document.querySelectorAll(s.element);
    for (const el of nodes) {
      if (isTourElementVisible(el)) {
        return [{ ...s, element: el }];
      }
    }
    return [];
  });
}
