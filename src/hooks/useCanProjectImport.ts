'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import { getPermissionsForRole } from '@/lib/permissions/check';
import type { PermissionKey, RolePermissionMap } from '@/lib/permissions/catalog';
import type { ProyectoWithRelations } from '@/types/proyecto';

function findParticipationRole(
  project: Pick<ProyectoWithRelations, 'participantes_rel'> | null | undefined,
  email: string | null,
  userId: string | null
): string | null {
  if (!project) return null;
  for (const p of project.participantes_rel ?? []) {
    if (userId && p.userId === userId) return p.rol;
    if (email && p.email?.trim().toLowerCase() === email) return p.rol;
  }
  return null;
}

/**
 * Admin habilitado O participante del proyecto con permiso del rol de participación.
 */
export function useCanProjectImport(
  key: PermissionKey,
  project: Pick<ProyectoWithRelations, 'participantes_rel'> | null | undefined
): boolean {
  const { data: session } = useSession();
  const availableRoles = session?.user?.availableRoles ?? [];
  const email = session?.user?.email?.trim().toLowerCase() ?? null;
  const userId = session?.user?.id ?? null;

  const rolEnProyecto = useMemo(
    () => findParticipationRole(project, email, userId),
    [project, email, userId]
  );

  const [partPerms, setPartPerms] = useState<RolePermissionMap | null>(null);

  useEffect(() => {
    if (!rolEnProyecto) {
      setPartPerms(null);
      return;
    }
    let cancelled = false;
    getPermissionsForRole(rolEnProyecto).then((map) => {
      if (!cancelled) setPartPerms(map);
    });
    return () => {
      cancelled = true;
    };
  }, [rolEnProyecto]);

  return useMemo(() => {
    if (userHasAdminEnabled(availableRoles)) return true;
    if (!project || !rolEnProyecto || !partPerms) return false;
    return partPerms[key] === true;
  }, [availableRoles, key, project, rolEnProyecto, partPerms]);
}
