'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';
import type { PermissionKey } from '@/lib/permissions/catalog';
import type { ProyectoWithRelations } from '@/types/proyecto';

/**
 * Matriz de roles ON + (Admin o participante del proyecto con el rol activo).
 */
export function useCanProjectImport(
  key: PermissionKey,
  project: Pick<ProyectoWithRelations, 'participantes_rel'> | null | undefined
): boolean {
  const { can } = useActiveRolePermissions();
  const { data: session } = useSession();
  const activeRole = session?.user?.activeRole ?? null;
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  const userId = session?.user?.id ?? null;

  return useMemo(() => {
    if (!can(key)) return false;
    if (activeRole === 'Admin') return true;
    if (!project || !activeRole) return false;
    return project.participantes_rel.some((p) => {
      if (p.rol !== activeRole) return false;
      if (userId && p.userId === userId) return true;
      if (email && p.email?.trim().toLowerCase() === email) return true;
      return false;
    });
  }, [can, key, project, activeRole, email, userId]);
}
