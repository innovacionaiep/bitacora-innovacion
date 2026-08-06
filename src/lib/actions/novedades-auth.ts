'use server';

import { getSession } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import {
  getNovedadesUnlockPassword,
  secretsMatch,
} from '@/lib/secrets/env-secrets';

/**
 * Verifica la contraseña de acceso a Novedades / Soporte.
 * Requiere view.novedades o view.soporte. Fail-closed si falta NOVEDADES_UNLOCK_PASSWORD.
 */
export async function verifyNovedadesPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }
  const availableRoles = session.user.availableRoles ?? [];
  const canNovedades = await userHasPermission(
    availableRoles,
    'view.novedades'
  );
  const canSoporte = await userHasPermission(
    availableRoles,
    'view.soporte'
  );
  if (!canNovedades && !canSoporte) {
    return { success: false, error: 'Sin permisos' };
  }

  const expected = getNovedadesUnlockPassword();
  if (!expected) {
    return {
      success: false,
      error: 'NOVEDADES_UNLOCK_PASSWORD no está configurada en el servidor',
    };
  }
  if (!secretsMatch(password, expected)) {
    return { success: false, error: 'Contraseña incorrecta' };
  }
  return { success: true };
}
