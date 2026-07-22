import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import { roleHasPermission } from '@/lib/permissions/check';
import { SoportePasswordGate } from '@/components/support-chat/SoportePasswordGate';

/**
 * Panel de administración del chat de soporte.
 * Acceso según view.soporte del rol activo; misma contraseña que Novedades.
 */
export default async function SoportePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/inicio');
  }

  const canView = await roleHasPermission(
    session.user.activeRole,
    'view.soporte'
  );
  if (!canView) {
    redirect('/inicio');
  }

  return <SoportePasswordGate />;
}
