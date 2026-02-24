import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import { NovedadesPasswordGate } from '@/components/novedades/NovedadesPasswordGate';

/**
 * Novedades: solo Admin puede acceder por URL.
 * La contraseña se pide cada vez que se entra a la página (no se guarda).
 */
export default async function NovedadesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect('/inicio');
  }

  if (session.user.activeRole !== 'Admin') {
    redirect('/inicio');
  }

  return <NovedadesPasswordGate />;
}
