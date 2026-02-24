'use server';

import { getSession } from '@/lib/auth-utils';

const NOVEDADES_PASSWORD = 'bitacora';

/**
 * Verifica la contraseña de acceso a Novedades (solo Admin).
 * No se persiste estado: la contraseña se pide cada vez que se entra.
 */
export async function verifyNovedadesPassword(
  password: string
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }
  if (session.user.activeRole !== 'Admin') {
    return { success: false, error: 'Sin permisos' };
  }
  if (password !== NOVEDADES_PASSWORD) {
    return { success: false, error: 'Contraseña incorrecta' };
  }
  return { success: true };
}
