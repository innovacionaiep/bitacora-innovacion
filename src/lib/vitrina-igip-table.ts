import {
  IGIP_SUBDIMENSIONS,
  type IgipSubdimensionKey,
} from '@/lib/igip-trl';
import {
  IGIP_STADIUMS,
  IGIP_SUBDIMENSION_SHORT_LABEL,
  igipScoreField,
  type IgipStadium,
} from '@/lib/vitrina-igip-scores';

export type IndicadoresFamily = 'igip' | 'trl';

export type IndicadoresColSize = 'A' | 'B';

export type IndicadoresTableColumn = {
  key: string;
  label: string;
  size: IndicadoresColSize;
  group: 'nombre' | IgipStadium | 'trl';
};

export const IGIP_STADIUM_LABEL: Record<IgipStadium, string> = {
  inicial: 'Inicial',
  proyeccion: 'Proyección',
  final: 'Final',
};

const TRL_COLUMNS: IndicadoresTableColumn[] = [
  { key: 'nombre', label: 'Nombre', size: 'B', group: 'nombre' },
  { key: 'trlInicial', label: 'TRL Inicial', size: 'A', group: 'trl' },
  {
    key: 'trlInicialComentario',
    label: 'TRL Inicial - Comentario',
    size: 'B',
    group: 'trl',
  },
  { key: 'trlProyeccion', label: 'TRL Proyección', size: 'A', group: 'trl' },
  { key: 'trlFinal', label: 'TRL Final', size: 'A', group: 'trl' },
  {
    key: 'trlFinalComentario',
    label: 'TRL Final - Comentario',
    size: 'B',
    group: 'trl',
  },
];

function stadiumIndexKey(stadium: IgipStadium): string {
  if (stadium === 'inicial') return 'igipInicial';
  if (stadium === 'proyeccion') return 'igipProyeccion';
  return 'igipFinal';
}

function stadiumIndexLabel(stadium: IgipStadium): string {
  if (stadium === 'inicial') return 'IGIP Inicial';
  if (stadium === 'proyeccion') return 'IGIP Proyección';
  return 'IGIP Final';
}

function stadiumColumns(
  stadium: IgipStadium,
  expandSubdimensions: boolean,
): IndicadoresTableColumn[] {
  const cols: IndicadoresTableColumn[] = [];
  if (expandSubdimensions) {
    for (const dim of IGIP_SUBDIMENSIONS) {
      const key = dim.key as IgipSubdimensionKey;
      cols.push({
        key: igipScoreField(stadium, key) as string,
        label: IGIP_SUBDIMENSION_SHORT_LABEL[key],
        size: 'A',
        group: stadium,
      });
    }
  }
  cols.push({
    key: stadiumIndexKey(stadium),
    label: stadiumIndexLabel(stadium),
    size: 'A',
    group: stadium,
  });
  if (stadium === 'inicial') {
    cols.push({
      key: 'igipInicialComentario',
      label: 'IGIP Inicial - Comentario',
      size: 'B',
      group: stadium,
    });
  }
  if (stadium === 'final') {
    cols.push({
      key: 'igipFinalComentario',
      label: 'IGIP Final - Comentario',
      size: 'B',
      group: stadium,
    });
  }
  return cols;
}

export function indicadoresTableColumns(opts: {
  family: IndicadoresFamily;
  stadiumVisible: Record<IgipStadium, boolean>;
  expandSubdimensions: boolean;
}): IndicadoresTableColumn[] {
  if (opts.family === 'trl') return TRL_COLUMNS;
  const cols: IndicadoresTableColumn[] = [
    { key: 'nombre', label: 'Nombre', size: 'B', group: 'nombre' },
  ];
  for (const stadium of IGIP_STADIUMS) {
    if (!opts.stadiumVisible[stadium]) continue;
    cols.push(...stadiumColumns(stadium, opts.expandSubdimensions));
  }
  return cols;
}

export function indicadoresHeaderGroups(
  columns: IndicadoresTableColumn[],
): Array<{ group: IndicadoresTableColumn['group']; span: number; label: string }> {
  const groups: Array<{
    group: IndicadoresTableColumn['group'];
    span: number;
    label: string;
  }> = [];
  for (const col of columns) {
    const last = groups[groups.length - 1];
    if (last && last.group === col.group) {
      last.span += 1;
      continue;
    }
    const label =
      col.group === 'nombre'
        ? ''
        : col.group === 'trl'
          ? 'TRL'
          : IGIP_STADIUM_LABEL[col.group];
    groups.push({ group: col.group, span: 1, label });
  }
  return groups;
}
