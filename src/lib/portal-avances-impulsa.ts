import ExcelJS from 'exceljs';
import { cellStr, headerIndexMap, normKey } from '@/lib/excel-import/utils';
import {
  sortEscuelaNames,
  type PortalAvancesProyecto,
} from '@/lib/portal-avances';

export const PORTAL_AVANCES_IMPULSA_SETTING_KEY = 'portal_avances_impulsa';
export const PORTAL_AVANCES_IMPULSA_FONDO = 'Fondo Impulsa';
export const PORTAL_AVANCES_IMPULSA_DEFAULT_SHEET = 'IMPULSA';
export const PORTAL_AVANCES_IMPULSA_DEFAULT_PATH =
  'C:\\Users\\Paul\\OneDrive - Instituto profesional AIEP SPA\\InnoB - General\\Control y Seguimiento Proyectos DNIE.xlsx';

export const PORTAL_AVANCES_VCM_SETTING_KEY = 'portal_avances_vcm';
export const PORTAL_AVANCES_VCM_FONDO = 'Vinculación con el Medio';
export const PORTAL_AVANCES_VCM_DEFAULT_SHEET = 'Fondo VcM';
export const PORTAL_AVANCES_VCM_DEFAULT_PATH = PORTAL_AVANCES_IMPULSA_DEFAULT_PATH;

export const IMPULSA_REQUIRED_HEADERS = [
  'PROYECTO',
  'SEDES',
  'ESCUELAS',
  'ID VINCULAMOS',
  'ESTUDIANTES',
  'DOCENTES',
  'BENEFICIARIOS',
  'AVANCE GANTT',
  'AVANCE INDICADORES',
  'PRESUPUESTO',
  '% COMPRAS SOLICITADAS',
  '% COMPRAS RECEPCIONADAS',
  '% HONORARIOS PAGADOS',
  'DELTA',
] as const;

export type ImpulsaPct =
  | { kind: 'pct'; value: number }
  | { kind: 'na' };

export type ImpulsaHonorarios = ImpulsaPct;

export type PortalAvancesImpulsaRow = {
  rowNumber: number;
  proyecto: string;
  encargado: string;
  sede: string;
  escuelas: string[];
  carreras: string[];
  asignaturas: string[];
  idVinculamos: string;
  estudiantes: number | null;
  docentes: number | null;
  beneficiarios: number | null;
  avanceGantt: ImpulsaPct;
  avanceIndicadores: ImpulsaPct;
  presupuestoAdjudicado: number;
  avanceOperativoSolicitado: ImpulsaPct;
  avanceOperativoEjecutado: ImpulsaPct;
  honorarios: ImpulsaHonorarios;
  saldoPresupuesto: number;
};

export type PortalAvancesImpulsaStored = {
  filePath: string;
  sheetName: string;
  lastSyncedAt: string | null;
  fileOk: boolean;
  sheetOk: boolean;
  rows: PortalAvancesImpulsaRow[];
};

export const EMPTY_IMPULSA_STORED: PortalAvancesImpulsaStored = {
  filePath: PORTAL_AVANCES_IMPULSA_DEFAULT_PATH,
  sheetName: PORTAL_AVANCES_IMPULSA_DEFAULT_SHEET,
  lastSyncedAt: null,
  fileOk: false,
  sheetOk: false,
  rows: [],
};

export const EMPTY_VCM_STORED: PortalAvancesImpulsaStored = {
  filePath: PORTAL_AVANCES_VCM_DEFAULT_PATH,
  sheetName: PORTAL_AVANCES_VCM_DEFAULT_SHEET,
  lastSyncedAt: null,
  fileOk: false,
  sheetOk: false,
  rows: [],
};

function excelCellRaw(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v == null) return null;
  if (typeof v === 'object' && 'result' in v) {
    return (v as { result?: unknown }).result;
  }
  if (v && typeof v === 'object' && 'richText' in v) {
    return ((v as { richText: Array<{ text?: string }> }).richText ?? [])
      .map((part) => part.text ?? '')
      .join('');
  }
  if (v && typeof v === 'object' && 'text' in v) {
    return (v as { text: unknown }).text;
  }
  return v;
}

function isNoAplica(raw: unknown): boolean {
  const t = cellStr(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t === 'no aplica' || t === 'n/a' || t === 'na';
}

export function parseImpulsaPercent(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (Math.abs(raw) <= 1) return Math.round(raw * 100);
    return Math.round(raw);
  }
  const text = cellStr(raw).replace(/%/g, '').replace(/\s/g, '').replace(',', '.');
  const n = Number(text);
  if (!Number.isFinite(n)) return 0;
  if (Math.abs(n) <= 1) return Math.round(n * 100);
  return Math.round(n);
}

export function parseImpulsaPct(raw: unknown): ImpulsaPct {
  if (isNoAplica(raw)) return { kind: 'na' };
  return { kind: 'pct', value: parseImpulsaPercent(raw) };
}

export function coerceImpulsaPct(raw: unknown): ImpulsaPct {
  if (raw && typeof raw === 'object' && 'kind' in raw) {
    const kind = (raw as { kind?: unknown }).kind;
    if (kind === 'na') return { kind: 'na' };
    if (kind === 'pct') {
      const value = (raw as { value?: unknown }).value;
      return {
        kind: 'pct',
        value: typeof value === 'number' && Number.isFinite(value) ? value : 0,
      };
    }
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return { kind: 'pct', value: raw };
  }
  return parseImpulsaPct(raw);
}

function pctToAvances(raw: unknown): { value: number; noAplica: boolean } {
  const pct = coerceImpulsaPct(raw);
  return pct.kind === 'na'
    ? { value: 0, noAplica: true }
    : { value: pct.value, noAplica: false };
}

export function parseImpulsaHonorarios(raw: unknown): ImpulsaHonorarios {
  return parseImpulsaPct(raw);
}

export function parseImpulsaMoney(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw);
  const text = cellStr(raw);
  if (!text) return 0;
  const negative = /-\s*\d/.test(text) || text.trim().startsWith('-');
  const digits = text.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

export function parseImpulsaInt(raw: unknown): number | null {
  if (raw == null || raw === '') return null;
  if (isNoAplica(raw)) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.round(raw);
  const n = Number(cellStr(raw).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : null;
}

export function parseImpulsaEscuelas(raw: unknown): string[] {
  return parseImpulsaNameList(raw, false);
}

export function parseImpulsaCommaList(raw: unknown): string[] {
  return parseImpulsaNameList(raw, true);
}

function parseImpulsaNameList(raw: unknown, allowComma: boolean): string[] {
  const text = cellStr(raw);
  if (!text) return [];
  const parts = text
    .split(allowComma ? '|' : /[;|]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sortEscuelaNames(parts.length ? parts : [text]);
}

function headerRowValues(sheet: ExcelJS.Worksheet): unknown[] {
  const headerRow = sheet.getRow(1);
  const values: unknown[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    values[colNumber - 1] = excelCellRaw(cell);
  });
  return values;
}

export function findMissingImpulsaHeaders(sheet: ExcelJS.Worksheet): string[] {
  const idx = headerIndexMap(headerRowValues(sheet));
  return IMPULSA_REQUIRED_HEADERS.filter((h) => !idx.has(normKey(h)));
}

function cellByHeader(
  row: ExcelJS.Row,
  idx: Map<string, number>,
  header: string,
): unknown {
  const col = idx.get(normKey(header));
  if (col == null) return null;
  return excelCellRaw(row.getCell(col + 1));
}

export function parseImpulsaRowsFromSheet(
  sheet: ExcelJS.Worksheet,
): { missingHeaders: string[]; rows: PortalAvancesImpulsaRow[] } {
  const missingHeaders = findMissingImpulsaHeaders(sheet);
  if (missingHeaders.length > 0) {
    return { missingHeaders, rows: [] };
  }
  const idx = headerIndexMap(headerRowValues(sheet));
  const rows: PortalAvancesImpulsaRow[] = [];
  const lastRow = sheet.rowCount;
  for (let r = 2; r <= lastRow; r++) {
    const excelRow = sheet.getRow(r);
    const proyecto = cellStr(cellByHeader(excelRow, idx, 'PROYECTO'));
    if (!proyecto) continue;
    rows.push({
      rowNumber: r,
      proyecto,
      encargado: cellStr(cellByHeader(excelRow, idx, 'ENCARGADO/A')),
      sede: cellStr(cellByHeader(excelRow, idx, 'SEDES')),
      escuelas: parseImpulsaEscuelas(cellByHeader(excelRow, idx, 'ESCUELAS')),
      carreras: parseImpulsaCommaList(cellByHeader(excelRow, idx, 'CARRERAS')),
      asignaturas: parseImpulsaCommaList(
        cellByHeader(excelRow, idx, 'ASIGNATURAS'),
      ),
      idVinculamos: cellStr(cellByHeader(excelRow, idx, 'ID VINCULAMOS')),
      estudiantes: parseImpulsaInt(cellByHeader(excelRow, idx, 'ESTUDIANTES')),
      docentes: parseImpulsaInt(cellByHeader(excelRow, idx, 'DOCENTES')),
      beneficiarios: parseImpulsaInt(
        cellByHeader(excelRow, idx, 'BENEFICIARIOS'),
      ),
      avanceGantt: parseImpulsaPct(cellByHeader(excelRow, idx, 'AVANCE GANTT')),
      avanceIndicadores: parseImpulsaPct(
        cellByHeader(excelRow, idx, 'AVANCE INDICADORES'),
      ),
      presupuestoAdjudicado: parseImpulsaMoney(
        cellByHeader(excelRow, idx, 'PRESUPUESTO'),
      ),
      avanceOperativoSolicitado: parseImpulsaPct(
        cellByHeader(excelRow, idx, '% COMPRAS SOLICITADAS'),
      ),
      avanceOperativoEjecutado: parseImpulsaPct(
        cellByHeader(excelRow, idx, '% COMPRAS RECEPCIONADAS'),
      ),
      honorarios: parseImpulsaPct(
        cellByHeader(excelRow, idx, '% HONORARIOS PAGADOS'),
      ),
      saldoPresupuesto: parseImpulsaMoney(cellByHeader(excelRow, idx, 'DELTA')),
    });
  }
  return { missingHeaders: [], rows };
}

export async function loadImpulsaWorkbook(
  buffer: Buffer | ArrayBuffer,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ExcelJS.Buffer);
  return wb;
}

export function findImpulsaSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
): ExcelJS.Worksheet | undefined {
  const wanted = sheetName.trim().toLowerCase();
  return wb.worksheets.find((ws) => ws.name.trim().toLowerCase() === wanted);
}

export async function parseImpulsaWorkbook(
  buffer: Buffer | ArrayBuffer,
  sheetName: string,
): Promise<
  | { ok: true; rows: PortalAvancesImpulsaRow[] }
  | { ok: false; error: string }
> {
  let wb: ExcelJS.Workbook;
  try {
    wb = await loadImpulsaWorkbook(buffer);
  } catch {
    return { ok: false, error: 'No se pudo abrir el archivo Excel (.xlsx)' };
  }
  const sheet = findImpulsaSheet(wb, sheetName);
  if (!sheet) {
    return {
      ok: false,
      error: `No se encontró la hoja "${sheetName.trim() || PORTAL_AVANCES_IMPULSA_DEFAULT_SHEET}"`,
    };
  }
  const parsed = parseImpulsaRowsFromSheet(sheet);
  if (parsed.missingHeaders.length > 0) {
    return {
      ok: false,
      error: `Faltan columnas: ${parsed.missingHeaders.join(', ')}`,
    };
  }
  return { ok: true, rows: parsed.rows };
}

export function impulsaRowsToAvances(
  rows: PortalAvancesImpulsaRow[],
  opts?: { fondo?: string; idPrefix?: string },
): PortalAvancesProyecto[] {
  const fondo = opts?.fondo ?? PORTAL_AVANCES_IMPULSA_FONDO;
  const idPrefix = opts?.idPrefix ?? 'impulsa';
  return rows.map((row) => {
    const gantt = pctToAvances(row.avanceGantt);
    const indicadores = pctToAvances(row.avanceIndicadores);
    const operativoSolicitado = pctToAvances(row.avanceOperativoSolicitado);
    const operativoEjecutado = pctToAvances(row.avanceOperativoEjecutado);
    const honorarios = pctToAvances(row.honorarios);
    return {
      id: `${idPrefix}:${row.rowNumber}`,
      fondo,
      proyecto: row.proyecto,
      encargado: row.encargado ?? '',
      sede: row.sede,
      escuelas: row.escuelas,
      carreras: row.carreras ?? [],
      asignaturas: row.asignaturas ?? [],
      presupuestoAdjudicado: row.presupuestoAdjudicado,
      avanceGantt: gantt.value,
      ganttNoAplica: gantt.noAplica,
      avanceIndicadores: indicadores.value,
      indicadoresNoAplica: indicadores.noAplica,
      avancePresupuestoSolicitado: operativoSolicitado.value,
      avancePresupuestoEjecutado: operativoEjecutado.value,
      avanceHonorarios: honorarios.value,
      honorariosNoAplica: honorarios.noAplica,
      avanceOperativoSolicitado: operativoSolicitado.value,
      operativoSolicitadoNoAplica: operativoSolicitado.noAplica,
      avanceOperativoEjecutado: operativoEjecutado.value,
      operativoEjecutadoNoAplica: operativoEjecutado.noAplica,
      saldoPresupuesto: row.saldoPresupuesto,
      idVinculamos: row.idVinculamos,
      estudiantes: row.estudiantes,
      docentes: row.docentes,
      beneficiarios: row.beneficiarios,
    };
  });
}

export function serializeImpulsaStored(
  stored: PortalAvancesImpulsaStored,
): string {
  return JSON.stringify({
    filePath: stored.filePath,
    sheetName: stored.sheetName,
    lastSyncedAt: stored.lastSyncedAt,
    fileOk: Boolean(stored.fileOk),
    sheetOk: Boolean(stored.sheetOk),
    rows: stored.rows,
  });
}

export function parseStoredExcelAvances(
  value: string | null | undefined,
  empty: PortalAvancesImpulsaStored,
): PortalAvancesImpulsaStored {
  if (!value?.trim()) return { ...empty };
  try {
    const parsed = JSON.parse(value) as Partial<PortalAvancesImpulsaStored>;
    if (!parsed || typeof parsed !== 'object') return { ...empty };
    return {
      filePath:
        typeof parsed.filePath === 'string' && parsed.filePath.trim()
          ? parsed.filePath
          : empty.filePath,
      sheetName:
        typeof parsed.sheetName === 'string' && parsed.sheetName.trim()
          ? parsed.sheetName.trim()
          : empty.sheetName,
      lastSyncedAt:
        typeof parsed.lastSyncedAt === 'string' ? parsed.lastSyncedAt : null,
      fileOk: Boolean(parsed.fileOk),
      sheetOk: Boolean(parsed.sheetOk),
      rows: Array.isArray(parsed.rows) ? parsed.rows : [],
    };
  } catch {
    return { ...empty };
  }
}

export function parseStoredImpulsa(
  value: string | null | undefined,
): PortalAvancesImpulsaStored {
  return parseStoredExcelAvances(value, EMPTY_IMPULSA_STORED);
}

export function parseStoredVcm(
  value: string | null | undefined,
): PortalAvancesImpulsaStored {
  return parseStoredExcelAvances(value, EMPTY_VCM_STORED);
}
