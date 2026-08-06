'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { getSession, AVAILABLE_ROLES, type Role } from '@/lib/auth-utils';
import {
  GROUP_LABELS,
  PERMISSION_CATALOG,
  getDefaultEnabled,
  isCellDisabled,
  normalizeEnabled,
  type PermissionKey,
  type PermissionGroup,
  type RolePermissionMap,
  defaultsForRole,
} from '@/lib/permissions/catalog';
import {
  ensureRolePermissionDefaults,
  getMyEnabledRolesPermissions,
} from '@/lib/permissions/check';
import { userHasAdminEnabled } from '@/lib/authz/pure';

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session?.user) {
    return { ok: false, error: 'No autenticado' };
  }
  if (!userHasAdminEnabled(session.user.availableRoles ?? [])) {
    return { ok: false, error: 'Solo Admin puede gestionar roles' };
  }
  return { ok: true };
}

export type RoleMatrixCell = {
  role: Role;
  permissionKey: PermissionKey;
  enabled: boolean;
  disabled: boolean;
};

export type RoleMatrixRow = {
  key: PermissionKey;
  label: string;
  group: PermissionGroup;
  groupLabel: string;
  cells: RoleMatrixCell[];
};

export type RoleMatrixResult = {
  success: boolean;
  data?: {
    roles: Role[];
    rows: RoleMatrixRow[];
  };
  error?: string;
};

export async function getRolePermissionsMatrix(): Promise<RoleMatrixResult> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    await ensureRolePermissionDefaults();
    const rowsDb = await prisma.rolePermission.findMany();
    const byKey = new Map<string, boolean>();
    for (const row of rowsDb) {
      byKey.set(`${row.role}::${row.permissionKey}`, row.enabled);
    }

    const matrixRows: RoleMatrixRow[] = PERMISSION_CATALOG.map((def) => ({
      key: def.key,
      label: def.label,
      group: def.group,
      groupLabel: GROUP_LABELS[def.group],
      cells: AVAILABLE_ROLES.map((role) => {
        const stored = byKey.get(`${role}::${def.key}`);
        const raw =
          stored !== undefined ? stored : getDefaultEnabled(role, def.key);
        const enabled = normalizeEnabled(role, def.key, raw);
        return {
          role,
          permissionKey: def.key,
          enabled,
          disabled: isCellDisabled(role, def.key),
        };
      }),
    }));

    return {
      success: true,
      data: { roles: [...AVAILABLE_ROLES], rows: matrixRows },
    };
  } catch (e) {
    console.error('getRolePermissionsMatrix', e);
    return { success: false, error: 'Error al cargar la matriz de roles' };
  }
}

export type SaveRoleMatrixInput = {
  cells: Array<{
    role: Role;
    permissionKey: PermissionKey;
    enabled: boolean;
  }>;
};

export async function saveRolePermissionsMatrix(
  input: SaveRoleMatrixInput
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    await ensureRolePermissionDefaults();

    const updates = input.cells.map((c) => ({
      role: c.role,
      permissionKey: c.permissionKey,
      enabled: normalizeEnabled(c.role, c.permissionKey, c.enabled),
    }));

    await prisma.$transaction(
      updates.map((u) =>
        prisma.rolePermission.upsert({
          where: {
            role_permissionKey: {
              role: u.role,
              permissionKey: u.permissionKey,
            },
          },
          create: {
            role: u.role,
            permissionKey: u.permissionKey,
            enabled: u.enabled,
          },
          update: { enabled: u.enabled },
        })
      )
    );

    revalidatePath('/configuracion/roles');
    revalidatePath('/configuracion');
    revalidatePath('/inicio');
    revalidatePath('/proyectos');
    revalidatePath('/dashboard');
    revalidatePath('/reportes');
    revalidatePath('/novedades');
    revalidatePath('/soporte');
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (e) {
    console.error('saveRolePermissionsMatrix', e);
    return { success: false, error: 'Error al guardar la matriz de roles' };
  }
}

/** Union of enabled roles' permissions (client sidebar / guards). */
export async function getMyActiveRolePermissions(): Promise<{
  success: boolean;
  activeRole: string | null;
  permissions: RolePermissionMap;
  error?: string;
}> {
  const session = await getSession();
  const availableRoles = session?.user?.availableRoles ?? [];
  if (!session?.user) {
    return {
      success: false,
      activeRole: null,
      permissions: defaultsForRole('Beneficiario'),
      error: 'No autenticado',
    };
  }
  try {
    const permissions = await getMyEnabledRolesPermissions(availableRoles);
    return {
      success: true,
      activeRole: availableRoles[0] ?? null,
      permissions,
    };
  } catch (e) {
    console.error('getMyActiveRolePermissions', e);
    return {
      success: false,
      activeRole: availableRoles[0] ?? null,
      permissions: defaultsForRole('Beneficiario'),
      error: 'Error al cargar permisos',
    };
  }
}
