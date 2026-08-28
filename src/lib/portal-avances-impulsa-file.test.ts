import { describe, expect, it } from 'vitest';
import {
  IMPULSA_SYNC_LOCAL_ONLY,
  isImpulsaExcelCloudRuntime,
  validateImpulsaExcelPath,
} from '@/lib/portal-avances-impulsa-file';

describe('validateImpulsaExcelPath', () => {
  it('exige .xlsx', () => {
    const result = validateImpulsaExcelPath('C:\\docs\\plan.csv');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/xlsx/i);
  });

  it('acepta una ruta absoluta xlsx', () => {
    const result = validateImpulsaExcelPath(
      'C:\\Users\\Paul\\OneDrive\\archivo.xlsx',
    );
    expect(result.ok).toBe(true);
  });
});

describe('isImpulsaExcelCloudRuntime', () => {
  it('es false fuera de Vercel', () => {
    expect(isImpulsaExcelCloudRuntime()).toBe(process.env.VERCEL === '1');
    expect(IMPULSA_SYNC_LOCAL_ONLY).toMatch(/local/i);
  });
});
