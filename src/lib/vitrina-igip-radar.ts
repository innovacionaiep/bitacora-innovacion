import {
  IGIP_SUBDIMENSIONS,
  isIgipScore,
  type IgipSubdimensionKey,
} from '@/lib/igip-trl';
import {
  igipScoreField,
  type IgipStadium,
} from '@/lib/vitrina-igip-scores';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';

export type VitrinaIgipRadarTarget = 'proyeccion' | 'final';

export const IGIP_RADAR_COLOR_INICIAL = {
  fill: 'rgba(5, 150, 105, 0.22)',
  stroke: '#059669',
} as const;

export const IGIP_RADAR_COLOR_DESTINO = {
  fill: 'rgba(220, 38, 38, 0.14)',
  stroke: '#dc2626',
} as const;

export const IGIP_RADAR_COLOR_PROMEDIO = {
  fill: 'rgba(37, 99, 235, 0.14)',
  stroke: '#2563eb',
} as const;

export type IgipRadarLayer = {
  id: 'destino' | 'inicial' | 'promedio';
  scores: number[];
  fill: string;
  stroke: string;
};

export function resolveRadarProjects(
  proyectos: VitrinaProyecto[],
  selectedIds: readonly string[],
): VitrinaProyecto[] {
  if (selectedIds.length === 0) return proyectos;
  const set = new Set(selectedIds);
  const picked = proyectos.filter((proyecto) => set.has(proyecto.id));
  return picked.length === 0 ? proyectos : picked;
}

export function averageStadiumScores(
  proyectos: VitrinaProyecto[],
  stadium: IgipStadium,
): number[] {
  return IGIP_SUBDIMENSIONS.map((dim) =>
    averageAxis(proyectos, stadium, dim.key),
  );
}

function averageAxis(
  proyectos: VitrinaProyecto[],
  stadium: IgipStadium,
  key: IgipSubdimensionKey,
): number {
  const field = igipScoreField(stadium, key);
  const values: number[] = [];
  for (const proyecto of proyectos) {
    const raw = proyecto[field];
    if (typeof raw === 'number' && isIgipScore(raw)) values.push(raw);
  }
  if (values.length === 0) return 0;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export function formatIgipRadarScore(
  value: number,
  asAverage: boolean,
): string {
  if (!asAverage) return String(Math.round(value));
  return value.toFixed(1);
}

export function buildVitrinaIgipRadar(opts: {
  proyectos: VitrinaProyecto[];
  selectedIds: readonly string[];
  target: VitrinaIgipRadarTarget;
  showPromedio: boolean;
}): {
  layers: IgipRadarLayer[];
  selected: VitrinaProyecto[];
  asAverage: boolean;
} {
  const selected = resolveRadarProjects(opts.proyectos, opts.selectedIds);
  const destinoStadium: IgipStadium =
    opts.target === 'final' ? 'final' : 'proyeccion';
  const layers: IgipRadarLayer[] = [
    {
      id: 'destino',
      scores: averageStadiumScores(selected, destinoStadium),
      ...IGIP_RADAR_COLOR_DESTINO,
    },
    {
      id: 'inicial',
      scores: averageStadiumScores(selected, 'inicial'),
      ...IGIP_RADAR_COLOR_INICIAL,
    },
  ];
  if (opts.showPromedio) {
    layers.push({
      id: 'promedio',
      scores: averageStadiumScores(opts.proyectos, 'inicial'),
      ...IGIP_RADAR_COLOR_PROMEDIO,
    });
  }
  return {
    layers,
    selected,
    asAverage: selected.length !== 1,
  };
}
