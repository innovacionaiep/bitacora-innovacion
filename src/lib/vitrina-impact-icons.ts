export const VITRINA_IMPACT_ICONS: Record<
  string,
  { file: string; color: string }
> = {
  social: { file: 'social.svg', color: '#dc2626' },
  ambiental: { file: 'ambiental.svg', color: '#059669' },
  productivo: { file: 'productivo.svg', color: '#2563eb' },
  educativo: { file: 'educativo.svg', color: '#f97316' },
  innovador: { file: 'innovador.svg', color: '#7c3aed' },
  tecnológico: { file: 'tecnologico.svg', color: '#06b6d4' },
};

export type VitrinaIconDrawData = {
  viewBox: string;
  paths: string[];
};

export function vitrinaImpactIcon(word: string) {
  return VITRINA_IMPACT_ICONS[word] ?? VITRINA_IMPACT_ICONS.social;
}

export function extractSvgDrawData(svg: string): VitrinaIconDrawData {
  const viewBox = svg.match(/viewBox=["']([^"']+)["']/i)?.[1] ?? '0 0 24 24';
  const paths = [...svg.matchAll(/<path\b[^>]*\sd=["']([^"']+)["']/gi)].map(
    (match) => match[1],
  );
  return { viewBox, paths };
}

const TILE = 40;
const ICON = 24;

export function repeatingIconMaskUri(
  paths: string[],
  sourceViewBox = '0 0 24 24',
): string {
  const parts = sourceViewBox.trim().split(/[\s,]+/).map(Number);
  const width = parts[2] || ICON;
  const height = parts[3] || ICON;
  const padX = (TILE - width) / 2;
  const padY = (TILE - height) / 2;
  const inner = paths
    .map((d) => `<path d="${d}" fill="black"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${TILE} ${TILE}"><g transform="translate(${padX} ${padY})">${inner}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
