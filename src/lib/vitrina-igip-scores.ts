import {
  IGIP_SUBDIMENSIONS,
  isIgipScore,
  type IgipSubdimensionKey,
} from '@/lib/igip-trl';

export const IGIP_STADIUMS = ['inicial', 'proyeccion', 'final'] as const;
export type IgipStadium = (typeof IGIP_STADIUMS)[number];

const KEY_SUFFIX: Record<IgipSubdimensionKey, string> = {
  originalidad: 'Originalidad',
  estadoDelArte: 'EstadoDelArte',
  contribucionSocial: 'ContribucionSocial',
  contribucionConocimiento: 'ContribucionConocimiento',
  potencialExpansion: 'PotencialExpansion',
  transferenciaTecnologica: 'TransferenciaTecnologica',
};

const STADIUM_PREFIX: Record<IgipStadium, string> = {
  inicial: 'igipInicial',
  proyeccion: 'igipProyeccion',
  final: 'igipFinal',
};

export const IGIP_SCORE_FIELDS = [
  'igipInicialOriginalidad',
  'igipInicialEstadoDelArte',
  'igipInicialContribucionSocial',
  'igipInicialContribucionConocimiento',
  'igipInicialPotencialExpansion',
  'igipInicialTransferenciaTecnologica',
  'igipProyeccionOriginalidad',
  'igipProyeccionEstadoDelArte',
  'igipProyeccionContribucionSocial',
  'igipProyeccionContribucionConocimiento',
  'igipProyeccionPotencialExpansion',
  'igipProyeccionTransferenciaTecnologica',
  'igipFinalOriginalidad',
  'igipFinalEstadoDelArte',
  'igipFinalContribucionSocial',
  'igipFinalContribucionConocimiento',
  'igipFinalPotencialExpansion',
  'igipFinalTransferenciaTecnologica',
] as const;

export type IgipScoreField = (typeof IGIP_SCORE_FIELDS)[number];

export function igipScoreField(
  stadium: IgipStadium,
  key: IgipSubdimensionKey,
): IgipScoreField {
  return `${STADIUM_PREFIX[stadium]}${KEY_SUFFIX[key]}` as IgipScoreField;
}

export const IGIP_SUBDIMENSION_SHORT_LABEL: Record<IgipSubdimensionKey, string> =
  {
    originalidad: 'Originalidad',
    estadoDelArte: 'Estado del Arte',
    contribucionSocial: 'Contrib. Social',
    contribucionConocimiento: 'Contrib. Conocimiento',
    potencialExpansion: 'Pot. Expansión',
    transferenciaTecnologica: 'Transf. Tecnológica',
  };

/** Entero 0–4 opcional; vacío o fuera de rango → null. */
export function asOptionalIgipScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return isIgipScore(rounded) ? rounded : null;
}

export function emptyIgipScoreFields(): Record<IgipScoreField, number | null> {
  return {
    igipInicialOriginalidad: null,
    igipInicialEstadoDelArte: null,
    igipInicialContribucionSocial: null,
    igipInicialContribucionConocimiento: null,
    igipInicialPotencialExpansion: null,
    igipInicialTransferenciaTecnologica: null,
    igipProyeccionOriginalidad: null,
    igipProyeccionEstadoDelArte: null,
    igipProyeccionContribucionSocial: null,
    igipProyeccionContribucionConocimiento: null,
    igipProyeccionPotencialExpansion: null,
    igipProyeccionTransferenciaTecnologica: null,
    igipFinalOriginalidad: null,
    igipFinalEstadoDelArte: null,
    igipFinalContribucionSocial: null,
    igipFinalContribucionConocimiento: null,
    igipFinalPotencialExpansion: null,
    igipFinalTransferenciaTecnologica: null,
  };
}

export function parseIgipScoreFields(
  rec: Record<string, unknown>,
): Record<IgipScoreField, number | null> {
  const next = emptyIgipScoreFields();
  for (const field of IGIP_SCORE_FIELDS) {
    next[field] = asOptionalIgipScore(rec[field]);
  }
  return next;
}
