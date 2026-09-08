'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz/guards';
import { revalidatePortalPaths } from '@/lib/portal-guest-settings';
import {
  findImpulsaSheet,
  loadImpulsaWorkbook,
  parseImpulsaWorkbook,
  PORTAL_AVANCES_VCM_DEFAULT_PATH,
  PORTAL_AVANCES_VCM_DEFAULT_SHEET,
  findMissingImpulsaHeaders,
  type PortalAvancesImpulsaStored,
} from '@/lib/portal-avances-impulsa';
import { readImpulsaExcelFile } from '@/lib/portal-avances-impulsa-file';
import {
  readVcmStored,
  writeVcmStored,
} from '@/lib/portal-avances-impulsa-store';

export type VcmExcelSettingsView = {
  filePath: string;
  sheetName: string;
  lastSyncedAt: string | null;
  fileOk: boolean;
  sheetOk: boolean;
  rowCount: number;
};

function toView(stored: PortalAvancesImpulsaStored): VcmExcelSettingsView {
  return {
    filePath: stored.filePath || PORTAL_AVANCES_VCM_DEFAULT_PATH,
    sheetName: stored.sheetName || PORTAL_AVANCES_VCM_DEFAULT_SHEET,
    lastSyncedAt: stored.lastSyncedAt,
    fileOk: stored.fileOk,
    sheetOk: stored.sheetOk,
    rowCount: stored.rows.length,
  };
}

function revalidatePortal() {
  for (const path of revalidatePortalPaths()) {
    revalidatePath(path);
  }
}

export async function getVcmExcelSettings(): Promise<{
  success: boolean;
  data?: VcmExcelSettingsView;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const stored = await readVcmStored();
  return { success: true, data: toView(stored) };
}

export async function saveVcmExcelSettings(input: {
  filePath: string;
  sheetName: string;
}): Promise<{ success: boolean; data?: VcmExcelSettingsView; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const stored = await readVcmStored();
  const filePath = input.filePath.trim() || PORTAL_AVANCES_VCM_DEFAULT_PATH;
  const sheetName = input.sheetName.trim() || PORTAL_AVANCES_VCM_DEFAULT_SHEET;
  const pathChanged = filePath !== stored.filePath;
  const sheetChanged = sheetName !== stored.sheetName;
  const next: PortalAvancesImpulsaStored = {
    ...stored,
    filePath,
    sheetName,
    fileOk: pathChanged ? false : stored.fileOk,
    sheetOk: pathChanged || sheetChanged ? false : stored.sheetOk,
  };
  await writeVcmStored(next);
  return { success: true, data: toView(next) };
}

export async function testVcmExcelFile(): Promise<{
  success: boolean;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const stored = await readVcmStored();
  const read = await readImpulsaExcelFile(stored.filePath);
  if (!read.ok) return { success: false, error: read.error };
  try {
    await loadImpulsaWorkbook(read.buffer);
  } catch {
    return { success: false, error: 'No se pudo abrir el archivo Excel (.xlsx)' };
  }
  await writeVcmStored({ ...stored, fileOk: true });
  return { success: true };
}

export async function testVcmExcelSheet(): Promise<{
  success: boolean;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const stored = await readVcmStored();
  const read = await readImpulsaExcelFile(stored.filePath);
  if (!read.ok) return { success: false, error: read.error };
  let workbook;
  try {
    workbook = await loadImpulsaWorkbook(read.buffer);
  } catch {
    return { success: false, error: 'No se pudo abrir el archivo Excel (.xlsx)' };
  }
  const sheet = findImpulsaSheet(workbook, stored.sheetName);
  if (!sheet) {
    return {
      success: false,
      error: `No se encontró la hoja "${stored.sheetName}"`,
    };
  }
  const missing = findMissingImpulsaHeaders(sheet);
  if (missing.length > 0) {
    return {
      success: false,
      error: `Faltan columnas: ${missing.join(', ')}`,
    };
  }
  await writeVcmStored({ ...stored, fileOk: true, sheetOk: true });
  return { success: true };
}

export async function updateVcmExcelSnapshot(): Promise<{
  success: boolean;
  data?: VcmExcelSettingsView;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const stored = await readVcmStored();
  const read = await readImpulsaExcelFile(stored.filePath);
  if (!read.ok) return { success: false, error: read.error };
  const parsed = await parseImpulsaWorkbook(read.buffer, stored.sheetName);
  if (!parsed.ok) return { success: false, error: parsed.error };
  const next: PortalAvancesImpulsaStored = {
    ...stored,
    fileOk: true,
    sheetOk: true,
    lastSyncedAt: new Date().toISOString(),
    rows: parsed.rows,
  };
  await writeVcmStored(next);
  revalidatePortal();
  return { success: true, data: toView(next) };
}
