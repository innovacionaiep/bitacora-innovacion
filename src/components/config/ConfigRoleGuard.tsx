'use client';

import { useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';

/**
 * Redirige a /inicio si el rol activo pierde view.ajustes mientras está en configuración.
 */
export function ConfigRoleGuard() {
  const { status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const { can, loading } = useActiveRolePermissions();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (loading) return;
    if (!pathname?.startsWith('/configuracion')) return;
    if (can('view.ajustes')) return;
    router.replace('/inicio');
  }, [status, pathname, can, loading, router]);

  return null;
}
