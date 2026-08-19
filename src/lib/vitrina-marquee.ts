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
