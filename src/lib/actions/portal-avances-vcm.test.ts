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

async function vcmWorkbookBuffer(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Fondo VcM');
  ws.addRow(HEADERS);
  ws.addRow([
    'Iniciativa VcM',
    'Bellavista',
    'Salud',
    '10',
    1,
    1,
    0,
    0.1,
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

describe('portal-avances-vcm actions', () => {
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
    const { getVcmExcelSettings } = await import(
      '@/lib/actions/portal-avances-vcm'
    );
    const result = await getVcmExcelSettings();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No autorizado');
  });

  it('devuelve hoja default Fondo VcM', async () => {
    const { getVcmExcelSettings } = await import(
      '@/lib/actions/portal-avances-vcm'
    );
    const result = await getVcmExcelSettings();
    expect(result.success).toBe(true);
    expect(result.data?.sheetName).toBe('Fondo VcM');
  });

  it('actualiza snapshot desde la hoja Fondo VcM', async () => {
    const buffer = await vcmWorkbookBuffer();
    readImpulsaExcelFile.mockResolvedValue({ ok: true, buffer });
    findUnique.mockResolvedValue({
      value: JSON.stringify({
        filePath: 'C:\\x.xlsx',
        sheetName: 'Fondo VcM',
        lastSyncedAt: null,
        fileOk: true,
        sheetOk: true,
        rows: [],
      }),
    });
    const { updateVcmExcelSnapshot } = await import(
      '@/lib/actions/portal-avances-vcm'
    );
    const result = await updateVcmExcelSnapshot();
    expect(result.success).toBe(true);
    expect(result.data?.rowCount).toBe(1);
    expect(upsert).toHaveBeenCalled();
    const payload = JSON.parse(
      upsert.mock.calls[0][0].update.value as string,
    ) as { rows: Array<{ proyecto: string }> };
    expect(payload.rows[0]?.proyecto).toBe('Iniciativa VcM');
  });
});
