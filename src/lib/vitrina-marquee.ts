/**
 * Tamaños de los tres tramos contiguos (izquierda, derecha, centro).
 * Con 26 videos: 9, 9 y 8 → 1–9, 10–18 y 19–26.
 */
export function vitrinaColumnChunkSizes(n: number): [number, number, number] {
  if (n <= 0) return [0, 0, 0];
  const base = Math.floor(n / 3);
  const rem = n % 3;
  return [
    base + (rem > 0 ? 1 : 0),
    base + (rem > 1 ? 1 : 0),
    base,
  ];
}

/**
 * Tres columnas del carrusel:
 * - izquierda: primer tramo (videos 1…)
 * - derecha: segundo tramo
 * - centro: el resto
 */
export function buildVitrinaColumnLists<T>(items: T[]): [T[], T[], T[]] {
  if (items.length === 0) return [[], [], []];
  const [leftN, rightN] = vitrinaColumnChunkSizes(items.length);
  const left = items.slice(0, leftN);
  const right = items.slice(leftN, leftN + rightN);
  const center = items.slice(leftN + rightN);
  return [left, center, right];
}

export const VITRINA_MARQUEE_MAX_REPEATS = 8;
export const VITRINA_MARQUEE_CARD_GAP_PX = 28;
export const VITRINA_MARQUEE_CARD_WIDTH_RATIO = 0.82;
/** Desfase visual de la columna derecha (~el antiguo pt-5.5rem), vía fase de animación. */
export const VITRINA_MARQUEE_STAGGER_PX = 5.5 * 16;

function vitrinaMarqueeSetHeightPx(colWidth: number, itemsInCol: number): number {
  const cardH = colWidth * VITRINA_MARQUEE_CARD_WIDTH_RATIO * (9 / 16);
  return Math.max(itemsInCol, 1) * (cardH + VITRINA_MARQUEE_CARD_GAP_PX);
}

/** Copias del set por mitad de loop: las justas para cubrir el viewport. */
export function vitrinaMarqueeRepeats(
  viewportH: number,
  colWidth: number,
  itemsInCol: number,
): number {
  const setH = vitrinaMarqueeSetHeightPx(colWidth, itemsInCol);
  if (setH <= 0) return 1;
  return Math.min(
    VITRINA_MARQUEE_MAX_REPEATS,
    Math.max(1, Math.ceil(viewportH / setH)),
  );
}

/** Delay negativo = misma distancia que 5.5rem, sin padding en el overflow. */
export function vitrinaMarqueeStaggerDelayS(
  durationS: number,
  colWidth: number,
  itemsInCol: number,
  repeats: number,
): number {
  const copyH =
    vitrinaMarqueeSetHeightPx(colWidth, itemsInCol) * Math.max(repeats, 1);
  if (colWidth <= 0 || copyH <= 0 || durationS <= 0) return 0;
  return -((VITRINA_MARQUEE_STAGGER_PX / copyH) * durationS);
}
