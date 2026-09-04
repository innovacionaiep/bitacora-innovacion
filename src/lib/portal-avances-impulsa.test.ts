import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  parseImpulsaHonorarios,
  parseImpulsaPercent,
  parseImpulsaWorkbook,
  parseStoredImpulsa,
  impulsaRowsToAvances,
  PORTAL_AVANCES_IMPULSA_DEFAULT_SHEET,
} from '@/lib/portal-avances-impulsa';

const HEADERS = [
  'INICIATIVA',
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
];

async function workbookBuffer(opts?: {
  sheetName?: string;
  rows?: unknown[][];
  headers?: string[];
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(opts?.sheetName ?? 'IMPULSA');
  ws.addRow(opts?.headers ?? HEADERS);
  for (const row of opts?.rows ?? []) {
    ws.addRow(row);
  }
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('parseImpulsaPercent', () => {
  it('trata 0–1 como fracción de Excel', () => {
    expect(parseImpulsaPercent(0.97)).toBe(97);
    expect(parseImpulsaPercent(0)).toBe(0);
    expect(parseImpulsaPercent(1)).toBe(100);
  });

  it('deja enteros > 1 como porcentaje', () => {
    expect(parseImpulsaPercent(29)).toBe(29);
    expect(parseImpulsaPercent('7%')).toBe(7);
  });
});

describe('parseImpulsaHonorarios', () => {
  it('marca No aplica', () => {
    expect(parseImpulsaHonorarios('No aplica')).toEqual({ kind: 'na' });
  });
});

describe('parseImpulsaWorkbook', () => {
  it('omite filas sin PROYECTO y mapea columnas', async () => {
    const buffer = await workbookBuffer({
      rows: [
        [
          'Fondo Impulsa',
          'ClinicApp',
          'Bellavista',
          'Ingeniería, Energía y Tecnología',
          'Sin registro',
          10,
          2,
          5,
          0.07,
          0.1,
          2_000_000,
          0.97,
          0,
          'No aplica',
          -1000,
        ],
        ['Fondo Impulsa', '', 'Calama', '', '', '', '', '', '', '', '', '', '', '', ''],
      ],
    });
    const result = await parseImpulsaWorkbook(
      buffer,
      PORTAL_AVANCES_IMPULSA_DEFAULT_SHEET,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      proyecto: 'ClinicApp',
      encargado: '',
      sede: 'Bellavista',
      escuelas: ['Ingeniería, Energía y Tecnología'],
      carreras: [],
      asignaturas: [],
      idVinculamos: 'Sin registro',
      estudiantes: 10,
      docentes: 2,
      beneficiarios: 5,
      avanceGantt: 7,
      avanceIndicadores: 10,
      presupuestoAdjudicado: 2_000_000,
      avanceOperativoSolicitado: 97,
      avanceOperativoEjecutado: 0,
      honorarios: { kind: 'na' },
      saldoPresupuesto: -1000,
    });
    const mapped = impulsaRowsToAvances(result.rows);
    expect(mapped[0]?.honorariosNoAplica).toBe(true);
    expect(mapped[0]?.fondo).toBe('Fondo Impulsa');
    expect(mapped[0]?.carreras).toEqual([]);
    expect(mapped[0]?.asignaturas).toEqual([]);
  });

  it('lee Carreras y Asignaturas si existen en la hoja', async () => {
    const buffer = await workbookBuffer({
      headers: [
        'INICIATIVA',
        'PROYECTO',
        'SEDES',
        'ESCUELAS',
        'CARRERAS',
        'ASIGNATURAS',
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
      ],
      rows: [
        [
          'Fondo Impulsa',
          'ClinicApp',
          'Bellavista',
          'Ingeniería, Energía y Tecnología',
          'Ingeniería Comercial | Enfermería',
          'Matemáticas | Anatomía',
          'Sin registro',
          10,
          2,
          5,
          0.07,
          0.1,
          2_000_000,
          0.97,
          0,
          'No aplica',
          -1000,
        ],
      ],
    });
    const result = await parseImpulsaWorkbook(
      buffer,
      PORTAL_AVANCES_IMPULSA_DEFAULT_SHEET,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]).toMatchObject({
      carreras: ['Enfermería', 'Ingeniería Comercial'],
      asignaturas: ['Anatomía', 'Matemáticas'],
    });
    const mapped = impulsaRowsToAvances(result.rows);
    expect(mapped[0]?.carreras).toEqual(['Enfermería', 'Ingeniería Comercial']);
    expect(mapped[0]?.asignaturas).toEqual(['Anatomía', 'Matemáticas']);
  });

  it('lee Encargado/a si existe la columna ENCARGADO/A', async () => {
    const buffer = await workbookBuffer({
      headers: [
        'INICIATIVA',
        'PROYECTO',
        'ENCARGADO/A',
        'SEDES',
        'ESCUELAS',
        'CARRERAS',
        'ASIGNATURAS',
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
      ],
      rows: [
        [
          'Fondo Impulsa',
          'ClinicApp',
          'jeremy.torres@aiep.cl',
          'Bellavista',
          'Ingeniería, Energía y Tecnología',
          '',
          '',
          'Sin registro',
          10,
          2,
          5,
          0.07,
          0.1,
          2_000_000,
          0.97,
          0,
          'No aplica',
          -1000,
        ],
      ],
    });
    const result = await parseImpulsaWorkbook(
      buffer,
      PORTAL_AVANCES_IMPULSA_DEFAULT_SHEET,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.rows[0]?.encargado).toBe('jeremy.torres@aiep.cl');
    expect(impulsaRowsToAvances(result.rows)[0]?.encargado).toBe(
      'jeremy.torres@aiep.cl',
    );
  });

  it('falla si falta la hoja', async () => {
    const buffer = await workbookBuffer({ sheetName: 'OTRA' });
    const result = await parseImpulsaWorkbook(buffer, 'IMPULSA');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/hoja/i);
  });

  it('falla si faltan cabeceras', async () => {
    const buffer = await workbookBuffer({
      headers: ['PROYECTO', 'SEDES'],
      rows: [['x', 'Bellavista']],
    });
    const result = await parseImpulsaWorkbook(buffer, 'IMPULSA');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Faltan columnas/i);
  });
});

describe('parseStoredImpulsa', () => {
  it('usa defaults si el JSON está vacío', () => {
    const stored = parseStoredImpulsa(null);
    expect(stored.sheetName).toBe('IMPULSA');
    expect(stored.rows).toEqual([]);
    expect(stored.fileOk).toBe(false);
  });
});
