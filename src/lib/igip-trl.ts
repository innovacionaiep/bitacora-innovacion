export const IGIP_RADAR_CX = 160;
export const IGIP_RADAR_CY = 160;
export const IGIP_RADAR_RADIUS = 148;
export const IGIP_RADAR_VIEW = 320;
export const IGIP_RADAR_FILL = 'rgba(5, 150, 105, 0.22)';
export const IGIP_RADAR_STROKE = '#059669';
export const IGIP_SCORE_MIN = 0;
export const IGIP_SCORE_MAX = 4;
export const TRL_MIN = 1;
export const TRL_MAX = 7;

export const IGIP_SUBDIMENSIONS = [
  { key: 'originalidad', label: 'Originalidad' },
  { key: 'estadoDelArte', label: 'Estado del Arte' },
  {
    key: 'contribucionSocial',
    label: 'Contribución Social, Ambiental o Productiva',
  },
  { key: 'contribucionConocimiento', label: 'Contribución al Conocimiento' },
  { key: 'potencialExpansion', label: 'Potencial de Expansión' },
  { key: 'transferenciaTecnologica', label: 'Transferencia Tecnológica' },
] as const;

export type IgipSubdimensionKey = (typeof IGIP_SUBDIMENSIONS)[number]['key'];

export const TRL_LEVELS = [
  { level: 1, description: 'Principios básicos e ideas iniciales' },
  { level: 2, description: 'Concepto tecnológico formulado' },
  { level: 3, description: 'Prueba de concepto experimental' },
  { level: 4, description: 'Validación de componentes en laboratorio' },
  { level: 5, description: 'Validación de prototipo en entorno real' },
  { level: 6, description: 'Demostración de prototipo en entorno real' },
  { level: 7, description: 'Demostración de sistema completo en entorno operativo' },
] as const;

export type IgipTrlData = {
  originalidad: number | null;
  estadoDelArte: number | null;
  contribucionSocial: number | null;
  contribucionConocimiento: number | null;
  potencialExpansion: number | null;
  transferenciaTecnologica: number | null;
  igip: number | null;
  trl: number | null;
};

export type IgipTrlPatch = Partial<IgipTrlData>;

export function emptyIgipTrlData(): IgipTrlData {
  return {
    originalidad: null,
    estadoDelArte: null,
    contribucionSocial: null,
    contribucionConocimiento: null,
    potencialExpansion: null,
    transferenciaTecnologica: null,
    igip: null,
    trl: null,
  };
}

export function isIgipScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= IGIP_SCORE_MIN &&
    value <= IGIP_SCORE_MAX
  );
}

export function isTrlLevel(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= TRL_MIN &&
    value <= TRL_MAX
  );
}

export function isFiniteDecimal(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateIgipTrlPatch(
  patch: IgipTrlPatch
): { ok: true } | { ok: false; error: string } {
  for (const dim of IGIP_SUBDIMENSIONS) {
    const value = patch[dim.key];
    if (value === undefined) continue;
    if (value !== null && !isIgipScore(value)) {
      return {
        ok: false,
        error: `${dim.label} debe ser un entero entre ${IGIP_SCORE_MIN} y ${IGIP_SCORE_MAX}`,
      };
    }
  }
  if (patch.igip !== undefined && patch.igip !== null && !isFiniteDecimal(patch.igip)) {
    return { ok: false, error: 'Índice IGIP inválido' };
  }
  if (patch.trl !== undefined && patch.trl !== null && !isTrlLevel(patch.trl)) {
    return {
      ok: false,
      error: `TRL debe ser un entero entre ${TRL_MIN} y ${TRL_MAX}`,
    };
  }
  return { ok: true };
}

export function radarValue(score: number | null): number {
  if (score == null || !Number.isFinite(score)) return 0;
  return Math.min(IGIP_SCORE_MAX, Math.max(IGIP_SCORE_MIN, score));
}

export function radarVertex(
  index: number,
  value: number | null,
  opts: { count: number; cx: number; cy: number; radius: number }
): { x: number; y: number } {
  const angle = -Math.PI / 2 + (index * 2 * Math.PI) / opts.count;
  const r = (radarValue(value) / IGIP_SCORE_MAX) * opts.radius;
  return {
    x: opts.cx + r * Math.cos(angle),
    y: opts.cy + r * Math.sin(angle),
  };
}

export function radarPolygonPoints(
  scores: Array<number | null>,
  opts: { cx: number; cy: number; radius: number }
): string {
  return scores
    .map((value, index) => {
      const p = radarVertex(index, value, {
        count: scores.length,
        cx: opts.cx,
        cy: opts.cy,
        radius: opts.radius,
      });
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(' ');
}

const RADAR_LABEL_ALIGNS = [
  'top',
  'topRight',
  'bottomRight',
  'bottom',
  'bottomLeft',
  'topLeft',
] as const;

export type RadarLabelAlign = (typeof RADAR_LABEL_ALIGNS)[number];

/** HTML overlay slot: center of the square is 50/50; labels sit outside the hexagon. */
export function radarLabelSlot(
  index: number,
  opts?: { cx?: number; cy?: number; radiusPct?: number }
): { align: RadarLabelAlign; xPct: number; yPct: number } {
  const cx = opts?.cx ?? 50;
  const cy = opts?.cy ?? 50;
  const radiusPct = opts?.radiusPct ?? 36;
  const p = radarVertex(index, IGIP_SCORE_MAX, {
    count: 6,
    cx,
    cy,
    radius: radiusPct,
  });
  return {
    align: RADAR_LABEL_ALIGNS[index] ?? 'top',
    xPct: p.x,
    yPct: p.y,
  };
}

export function trlBadgeWidthPx(level: number): number {
  const minWidth = 96;
  const step = 24;
  const n = isTrlLevel(level) ? level : TRL_MIN;
  return minWidth + (n - TRL_MIN) * step;
}

export type TrlRowAppearance = 'selected' | 'muted';

export function trlRowAppearance(
  level: number,
  selectedTrl: number | null
): TrlRowAppearance {
  if (selectedTrl != null && isTrlLevel(selectedTrl) && level === selectedTrl) {
    return 'selected';
  }
  return 'muted';
}

/** Clicking the already selected TRL clears it; otherwise it becomes the new selection. */
export function nextTrlOnClick(
  clickedLevel: number,
  selectedTrl: number | null
): number | null {
  if (!isTrlLevel(clickedLevel)) return selectedTrl;
  if (selectedTrl === clickedLevel) return null;
  return clickedLevel;
}

export function describeIgipTrlCambio(patch: IgipTrlPatch): {
  elemento: string;
  cambio: string;
} {
  const keys = (Object.keys(patch) as (keyof IgipTrlPatch)[]).filter(
    (key) => patch[key] !== undefined
  );
  if (keys.length === 1 && keys[0] === 'trl') {
    const trl = patch.trl;
    return {
      elemento: 'TRL',
      cambio: trl == null ? 'Quitó el nivel TRL' : `Asignó TRL ${trl}`,
    };
  }
  if (keys.length === 1 && keys[0] === 'igip') {
    const igip = patch.igip;
    return {
      elemento: 'Índice IGIP',
      cambio:
        igip == null ? 'Quitó el índice IGIP' : `Actualizó Índice IGIP a ${igip}`,
    };
  }
  if (keys.length === 1) {
    const key = keys[0] as IgipSubdimensionKey;
    const dim = IGIP_SUBDIMENSIONS.find((d) => d.key === key);
    const label = dim?.label ?? String(key);
    const value = patch[key];
    return {
      elemento: label,
      cambio:
        value == null
          ? `Quitó ${label}`
          : `Actualizó ${label} a ${value}`,
    };
  }
  return {
    elemento: 'Evaluación IGIP-TRL',
    cambio: 'Actualizó la evaluación IGIP-TRL',
  };
}
