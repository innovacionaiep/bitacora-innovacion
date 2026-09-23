import { beforeEach, describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';

const requireAdmin = vi.fn();
const findUnique = vi.fn();
const upsert = vi.fn();
const readImpulsaExcelFile = vi.fn();

vi.mock('@/lib/authz/guards', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    systemSetting: { findUnique, upsert },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/portal-avances-impulsa-file', () => ({
  readImpulsaExcelFile: (...args: unknown[]) => readImpulsaExcelFile(...args),
  IMPULSA_SYNC_LOCAL_ONLY:
    'La actualización del Excel solo está disponible en local (el archivo de OneDrive no existe en el servidor).',
}));

const HEADERS = [
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

async function aceleradoraWorkbookBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('ACELERADORA');
  ws.addRow(HEADERS);
  ws.addRow([
    'Proyecto Aceleradora Demo',
    'Bellavista',
    'Salud',
    'Sin registro',
    1,
    1,
    0,
    0.5,
    0,
    1000,
    0,
    0,
    0,
    0,
  ]);
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('portal-avances-aceleradora actions', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    findUnique.mockReset();
    upsert.mockReset();
    readImpulsaExcelFile.mockReset();
    requireAdmin.mockResolvedValue({ ok: true, user: { id: 'admin' } });
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({});
  });

  it('rechaza get si no es admin', async () => {
    requireAdmin.mockResolvedValue({ ok: false, error: 'No autorizado' });
    const { getAceleradoraExcelSettings } = await import(
      '@/lib/actions/portal-avances-aceleradora'
    );
    const result = await getAceleradoraExcelSettings();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No autorizado');
  });

  it('devuelve hoja default ACELERADORA', async () => {
    const { getAceleradoraExcelSettings } = await import(
      '@/lib/actions/portal-avances-aceleradora'
    );
    const result = await getAceleradoraExcelSettings();
    expect(result.success).toBe(true);
    expect(result.data?.sheetName).toBe('ACELERADORA');
  });

  it('actualiza snapshot desde la hoja ACELERADORA', async () => {
    const buffer = await aceleradoraWorkbookBuffer();
    readImpulsaExcelFile.mockResolvedValue({ ok: true, buffer });
    findUnique.mockResolvedValue({
      value: JSON.stringify({
        filePath: 'C:\\x.xlsx',
        sheetName: 'ACELERADORA',
        lastSyncedAt: null,
        fileOk: true,
        sheetOk: true,
        rows: [],
      }),
    });
    const { updateAceleradoraExcelSnapshot } = await import(
      '@/lib/actions/portal-avances-aceleradora'
    );
    const result = await updateAceleradoraExcelSnapshot();
    expect(result.success).toBe(true);
    expect(result.data?.rowCount).toBe(1);
    expect(upsert).toHaveBeenCalled();
    const payload = JSON.parse(
      upsert.mock.calls[0][0].update.value as string,
    ) as { rows: Array<{ proyecto: string }> };
    expect(payload.rows[0]?.proyecto).toBe('Proyecto Aceleradora Demo');
  });
});
