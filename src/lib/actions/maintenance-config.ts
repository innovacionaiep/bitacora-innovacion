'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth-utils';
import { roleHasPermission } from '@/lib/permissions/check';
import { MAINTENANCE_SETTINGS_PATH } from '@/lib/maintenance';
import {
  readMaintenanceEnabled,
  writeMaintenanceEnabled,
} from '@/lib/maintenance-store';

async function assertCanManageMaintenance() {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false as const, error: 'No autorizado' };
  }
  const activeRole = (session.user as { activeRole?: string | null }).activeRole;
  if (activeRole !== 'Admin') {
    return { ok: false as const, error: 'Solo Admin puede gestionar el mantenimiento' };
  }
  const canAjustes = await roleHasPermission(activeRole, 'view.ajustes');
  if (!canAjustes) {
    return { ok: false as const, error: 'No autorizado' };
  }
  return { ok: true as const };
}

export async function getMaintenanceEnabled(): Promise<boolean> {
  return readMaintenanceEnabled();
}

export async function setMaintenanceEnabled(enabled: boolean): Promise<{
  success: boolean;
  error?: string;
  enabled?: boolean;
}> {
  const auth = await assertCanManageMaintenance();
  if (!auth.ok) {
    return { success: false, error: auth.error };
  }

  try {
    await writeMaintenanceEnabled(enabled);
    revalidatePath(MAINTENANCE_SETTINGS_PATH);
    revalidatePath('/mantenimiento');
    return { success: true, enabled };
  } catch (e) {
    console.error('[maintenance] setMaintenanceEnabled', e);
    return { success: false, error: 'No se pudo guardar la configuración' };
  }
}
