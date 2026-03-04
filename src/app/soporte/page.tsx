import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import { SoportePasswordGate } from '@/components/support-chat/SoportePasswordGate';

/**
 * Página oculta de administración del chat de soporte.
 * Solo Admin puede acceder por URL; misma contraseña que Novedades ("bitacora").
 */
export default async function SoportePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/inicio');
  }

  if (session.user.activeRole !== 'Admin') {
    redirect('/inicio');
  }

  return <SoportePasswordGate />;
}
