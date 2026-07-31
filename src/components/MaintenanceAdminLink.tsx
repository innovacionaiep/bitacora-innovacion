'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { MAINTENANCE_SETTINGS_PATH } from '@/lib/maintenance';

/** Enlace discreto para que Admin pueda desactivar el modo desde /mantenimiento. */
export function MaintenanceAdminLink() {
  const { data: session, status } = useSession();
  const isAdmin =
    status === 'authenticated' &&
    (session?.user as { activeRole?: string | null } | undefined)?.activeRole ===
      'Admin';

  if (!isAdmin) return null;

  return (
    <p className="mt-10 text-sm text-gray-500">
      <Link
        href={MAINTENANCE_SETTINGS_PATH}
        className="font-medium text-gray-700 underline underline-offset-4 hover:text-gray-900"
      >
        Ir a Configuración → Mantenimiento
      </Link>
    </p>
  );
}
