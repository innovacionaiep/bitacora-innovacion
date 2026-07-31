import ExcelJS from 'exceljs';
import {
  ACTIVIDAD_SHEET_HEADERS,
  ACTIVIDADES_HEADERS,
  INDICADORES_HEADERS,
  PARTICIPANTES_HEADERS,
  PRESUPUESTO_HEADERS,
  TAREA_SHEET_HEADERS,
  type ImportTemplateTipo,
} from './types';
import { cellStr, headerIndexMap } from './utils';

export type RawSheetRow = {
  rowNumber: number;
  cells: Record<string, string>;
  /** Origen de hoja (para mensajes de error) */
  sheetName?: string;
};

async function loadWorkbook(
  buffer: ArrayBuffer | Buffer
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ExcelJS.Buffer);
  return wb;
}

function sheetToRows(
  sheet: ExcelJS.Worksheet,
  expectedHeaders: readonly string[],
  opts?: { ignoreHeaders?: string[] }
): { rows: RawSheetRow[]; missingHeaders: string[] } {
  const ignore = new Set(
    (opts?.ignoreHeaders ?? []).map((h) => h.trim().toLowerCase())
  );
  const headerRow = sheet.getRow(1);
  const headerValues: unknown[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headerValues[colNumber - 1] = cell.value;
  });
  const maxCol = Math.max(
    headerValues.length,
    sheet.columnCount,
    expectedHeaders.length
  );
  for (let c = 0; c < maxCol; c++) {
    if (headerValues[c] === undefined) {
      headerValues[c] = headerRow.getCell(c + 1).value;
    }
  }

  const idx = headerIndexMap(headerValues);
  const missingHeaders = expectedHeaders.filter((h) => {
    const key = h.trim().toLowerCase();
    if (ignore.has(key)) return false;
    return !idx.has(key);
  });

  const rows: RawSheetRow[] = [];
  const lastRow = sheet.rowCount;
  for (let r = 2; r <= lastRow; r++) {
    const excelRow = sheet.getRow(r);
    const cells: Record<string, string> = {};
    let any = false;

    for (const h of expectedHeaders) {
      const key = h.trim().toLowerCase();
      if (ignore.has(key)) {
        cells[key] = '';
        continue;
      }
      const colIdx = idx.get(key);
      if (colIdx != null) {
        const raw = excelRow.getCell(colIdx + 1).value;
        // Fórmulas: usar result si ExcelJS lo expone
        let v = '';
        if (raw && typeof raw === 'object' && 'result' in (raw as object)) {
          v = cellStr((raw as { result?: unknown }).result);
        } else if (raw && typeof raw === 'object' && 'formula' in (raw as object)) {
          v = ''; // no contar fórmula como dato de usuario
        } else {
          v = cellStr(raw);
        }
        cells[key] = v;
        if (v) any = true;
      } else {
        cells[key] = '';
      }
    }

    // Capturar headers extra (compat)
    idx.forEach((colIdx, headerKey) => {
      if (headerKey in cells) return;
      const raw = excelRow.getCell(colIdx + 1).value;
      const v = cellStr(raw);
      cells[headerKey] = v;
      if (v) any = true;
    });

    if (!any) continue;
    rows.push({ rowNumber: r, cells, sheetName: sheet.name });
  }

  return { rows, missingHeaders };
}

const SHEET_NAME: Record<ImportTemplateTipo, string> = {
  proyectos: 'Proyectos',
  participantes: 'Participantes',
  actividades: 'Actividades',
  indicadores: 'Indicadores',
  presupuesto: 'Presupuesto',
};

const BASE_HEADERS: Record<ImportTemplateTipo, readonly string[]> = {
  proyectos: ['Nombre', 'Sedes', 'Escuelas', 'ObjetivoGeneral'],
  participantes: PARTICIPANTES_HEADERS,
  actividades: ACTIVIDADES_HEADERS,
  indicadores: INDICADORES_HEADERS,
  presupuesto: PRESUPUESTO_HEADERS,
};

function parseActividadesTwoSheets(
  wb: ExcelJS.Workbook
): { rows: RawSheetRow[]; error?: string } {
  const actSheet = wb.getWorksheet('Actividades');
  const taskSheet = wb.getWorksheet('Tareas');

  // Formato nuevo: dos hojas
  if (actSheet && taskSheet) {
    const actParsed = sheetToRows(actSheet, ACTIVIDAD_SHEET_HEADERS, {
      ignoreHeaders: ['Alerta'],
    });
    if (actParsed.missingHeaders.length > 0) {
      return {
        rows: [],
        error: `Hoja Actividades: faltan columnas ${actParsed.missingHeaders.join(', ')}`,
      };
    }
    const taskParsed = sheetToRows(taskSheet, TAREA_SHEET_HEADERS);
    if (taskParsed.missingHeaders.length > 0) {
      return {
        rows: [],
        error: `Hoja Tareas: faltan columnas ${taskParsed.missingHeaders.join(', ')}`,
      };
    }
    if (actParsed.rows.length === 0) {
      return { rows: [], error: 'No hay actividades en la hoja Actividades' };
    }

    const combined: RawSheetRow[] = [];
    for (const row of actParsed.rows) {
      // Ignorar filas que solo tenían fórmula Alerta sin Nombre
      if (!row.cells['nombre']?.trim()) continue;
      combined.push({
        rowNumber: row.rowNumber,
        sheetName: 'Actividades',
        cells: {
          ...row.cells,
          tipo: 'Actividad',
          actividad: '',
          fechainicio: '',
          fechafin: '',
        },
      });
    }
    for (const row of taskParsed.rows) {
      combined.push({
        rowNumber: row.rowNumber,
        sheetName: 'Tareas',
        cells: {
          ...row.cells,
          tipo: 'Tarea',
          orden: '',
        },
      });
    }
    if (combined.length === 0) {
      return { rows: [], error: 'No hay filas de datos en Actividades/Tareas' };
    }
    return { rows: combined };
  }

  // Compat: hoja única antigua con columna Tipo
  const legacy =
    wb.getWorksheet('Actividades') ??
    wb.worksheets.find((s) => s.state !== 'hidden');
  if (!legacy) {
    return {
      rows: [],
      error: 'Faltan las hojas Actividades y Tareas (o el formato antiguo)',
    };
  }
  const { rows, missingHeaders } = sheetToRows(legacy, ACTIVIDADES_HEADERS);
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      error: `Faltan columnas: ${missingHeaders.join(', ')}. Usa la plantilla nueva (hojas Actividades + Tareas).`,
    };
  }
  if (rows.length === 0) {
    return { rows: [], error: 'No hay filas de datos' };
  }
  return { rows };
}

export async function parseImportFile(
  tipo: ImportTemplateTipo,
  buffer: ArrayBuffer | Buffer
): Promise<{ rows: RawSheetRow[]; error?: string }> {
  try {
    const wb = await loadWorkbook(buffer);

    if (tipo === 'actividades') {
      return parseActividadesTwoSheets(wb);
    }

    const sheet =
      wb.getWorksheet(SHEET_NAME[tipo]) ??
      wb.worksheets.find((s) => s.state !== 'hidden') ??
      wb.worksheets[0];
    if (!sheet) {
      return { rows: [], error: 'El archivo no contiene hojas' };
    }
    const { rows, missingHeaders } = sheetToRows(sheet, BASE_HEADERS[tipo]);
    if (missingHeaders.length > 0) {
      return {
        rows: [],
        error: `Faltan columnas obligatorias: ${missingHeaders.join(', ')}`,
      };
    }
    if (rows.length === 0) {
      return { rows: [], error: 'No hay filas de datos en la plantilla' };
    }
    return { rows };
  } catch (e) {
    console.error('parseImportFile', e);
    return {
      rows: [],
      error: e instanceof Error ? e.message : 'No se pudo leer el Excel',
    };
  }
}

export function cell(row: RawSheetRow, header: string): string {
  return row.cells[header.trim().toLowerCase()] ?? '';
}

export function rowLabel(row: RawSheetRow): string {
  const sheet = row.sheetName ? `${row.sheetName} ` : '';
  return `${sheet}fila ${row.rowNumber}`;
}
