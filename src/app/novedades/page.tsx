import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import { NovedadesPasswordGate } from '@/components/novedades/NovedadesPasswordGate';

/**
 * Novedades: acceso según view.novedades del rol activo.
 * La contraseña se pide cada vez que se entra a la página (no se guarda).
 */
export default async function NovedadesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/inicio');
  }

  const canView = await userHasPermission(
    session.user.availableRoles ?? [],
    'view.novedades'
  );
  if (!canView) {
    redirect('/inicio');
  }

  return <NovedadesPasswordGate />;
}
