'use server';

import { getSession } from '@/lib/auth-utils';
import { roleHasPermission } from '@/lib/permissions/check';

const NOVEDADES_PASSWORD = 'bitacora';

/**
 * Verifica la contraseña de acceso a Novedades / Soporte.
 * Requiere view.novedades o view.soporte según el contexto de la página.
 * No se persiste estado: la contraseña se pide cada vez que se entra.
 */
export async function verifyNovedadesPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }
  const canNovedades = await roleHasPermission(
    session.user.activeRole,
    'view.novedades'
  );
  const canSoporte = await roleHasPermission(
    session.user.activeRole,
    'view.soporte'
  );
  if (!canNovedades && !canSoporte) {
    return { success: false, error: 'Sin permisos' };
  }
  if (password !== NOVEDADES_PASSWORD) {
    return { success: false, error: 'Contraseña incorrecta' };
  }
  return { success: true };
}
