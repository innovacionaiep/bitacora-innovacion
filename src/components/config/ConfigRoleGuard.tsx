'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Redirige a dashboard si el rol activo deja de ser Admin mientras el usuario
 * está en una ruta de configuración (evita que sigan viendo la página tras cambiar de rol).
 */
export function ConfigRoleGuard() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (!pathname?.startsWith('/configuracion')) return;
    if (session?.user?.activeRole === 'Admin') return;
    router.replace('/');
  }, [status, pathname, session?.user?.activeRole, router]);

  return null;
}
