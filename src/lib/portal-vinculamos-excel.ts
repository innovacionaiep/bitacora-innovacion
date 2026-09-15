import {
  ESCUELAS_CARRERAS_SUBCOLUMNS,
  PARTICIPANTE_EXTERNO_SUBCOLUMNS,
  TERRITORIO_SUBCOLUMNS,
  isEscuelasCarrerasSubcolumn,
  isParticipanteExternoSubcolumn,
  isPreguntaChipColumn,
  isTerritorioSubcolumn,
  type EscuelaCarreraLine,
  type MideimpactoIniciativa,
  type MideimpactoIniciativaColumn,
  type MideimpactoIniciativaColumnKey,
  type ParticipanteExternoLine,
  type TerritorioLine,
} from '@/lib/mideimpacto-iniciativas';

export type VinculamosExcelMerge = {
  s: { r: number; c: number };
  e: { r: number; c: number };
};

export type VinculamosExcelSheet = {
  aoa: string[][];
  merges: VinculamosExcelMerge[];
};

const EMPTY_ESCUELA: EscuelaCarreraLine = {
  sedeNombre: '',
  escuNombre: '',
  painEstudiantes: '',
  painEstudiantesFinal: '',
  painDocentes: '',
  painDocentesFinal: '',
};

const EMPTY_TERRITORIO: TerritorioLine = {
  region: '',
  provincia: '',
  comuna: '',
};

const EMPTY_SOCIO: ParticipanteExternoLine = {
  socioComunitario: '',
  grupo: '',
  subgrupo: '',
  beneficiarios: '',
  beneficiariosFinal: '',
};

function cellText(value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  return trimmed || '—';
}

function hasVisibleKey(
  columns: readonly MideimpactoIniciativaColumn[],
  keys: readonly { key: MideimpactoIniciativaColumnKey }[],
): boolean {
  const set = new Set(keys.map((col) => col.key));
  return columns.some((col) => set.has(col.key));
}

function dimensionLines<T>(lines: T[], emptyLine: T, expand: boolean): T[] {
  if (!expand) return [emptyLine];
  if (lines.length === 0) return [emptyLine];
  return lines;
}

function combinations(
  row: MideimpactoIniciativa,
  expandEscuelas: boolean,
  expandTerritorios: boolean,
  expandSocios: boolean,
) {
  const escuelas = dimensionLines(
    row.escuelasCarreras,
    EMPTY_ESCUELA,
    expandEscuelas,
  );
  const territorios = dimensionLines(
    row.territorios,
    EMPTY_TERRITORIO,
    expandTerritorios,
  );
  const socios = dimensionLines(
    row.participantesExternos,
    EMPTY_SOCIO,
    expandSocios,
  );

  const out: {
    escuela: EscuelaCarreraLine;
    territorio: TerritorioLine;
    socio: ParticipanteExternoLine;
  }[] = [];
  for (const escuela of escuelas) {
    for (const territorio of territorios) {
      for (const socio of socios) {
        out.push({ escuela, territorio, socio });
      }
    }
  }
  return out;
}

function isTransversalKey(key: MideimpactoIniciativaColumnKey): boolean {
  return (
    !isEscuelasCarrerasSubcolumn(key) &&
    !isTerritorioSubcolumn(key) &&
    !isParticipanteExternoSubcolumn(key)
  );
}

function combinationCell(
  row: MideimpactoIniciativa,
  key: MideimpactoIniciativaColumnKey,
  combo: {
    escuela: EscuelaCarreraLine;
    territorio: TerritorioLine;
    socio: ParticipanteExternoLine;
  },
): string {
  if (isEscuelasCarrerasSubcolumn(key)) {
    return cellText(combo.escuela[key]);
  }
  if (isTerritorioSubcolumn(key)) {
    return cellText(combo.territorio[key]);
  }
  if (isParticipanteExternoSubcolumn(key)) {
    return cellText(combo.socio[key]);
  }
  if (isPreguntaChipColumn(key)) {
    return row[key].join(' | ') || '—';
  }
  return cellText(row[key]);
}

export function buildVinculamosExcelSheet(
  rows: MideimpactoIniciativa[],
  columns: readonly MideimpactoIniciativaColumn[],
): VinculamosExcelSheet {
  const expandEscuelas = hasVisibleKey(columns, ESCUELAS_CARRERAS_SUBCOLUMNS);
  const expandTerritorios = hasVisibleKey(columns, TERRITORIO_SUBCOLUMNS);
  const expandSocios = hasVisibleKey(columns, PARTICIPANTE_EXTERNO_SUBCOLUMNS);

  const aoa: string[][] = [columns.map((col) => col.label)];
  const merges: VinculamosExcelMerge[] = [];

  for (const row of rows) {
    const combos = combinations(
      row,
      expandEscuelas,
      expandTerritorios,
      expandSocios,
    );
    const start = aoa.length;
    combos.forEach((combo, index) => {
      const line = columns.map((col) => {
        if (index > 0 && isTransversalKey(col.key)) return '';
        return combinationCell(row, col.key, combo);
      });
      aoa.push(line);
    });
    const end = aoa.length - 1;
    if (end > start) {
      columns.forEach((col, colIndex) => {
        if (!isTransversalKey(col.key)) return;
        merges.push({
          s: { r: start, c: colIndex },
          e: { r: end, c: colIndex },
        });
      });
    }
  }

  return { aoa, merges };
}

export function vinculamosExcelFilename(now: Date = new Date()): string {
  return `vinculamos_${now.toISOString().split('T')[0]}.xlsx`;
}

export async function downloadVinculamosExcel(
  rows: MideimpactoIniciativa[],
  columns: readonly MideimpactoIniciativaColumn[],
): Promise<void> {
  const XLSX = await import('xlsx');
  const { aoa, merges } = buildVinculamosExcelSheet(rows, columns);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (merges.length > 0) {
    ws['!merges'] = merges;
  }
  XLSX.utils.book_append_sheet(wb, ws, 'Vinculamos');
  XLSX.writeFile(wb, vinculamosExcelFilename());
}
