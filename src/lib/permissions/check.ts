'use server';

import prisma from '@/lib/prisma';
import { AVAILABLE_ROLES, type Role } from '@/lib/auth-utils';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import {
  defaultsForRole,
  getDefaultEnabled,
  normalizeEnabled,
  type PermissionKey,
  type RolePermissionMap,
  PERMISSION_KEYS,
} from './catalog';

/**
 * Ensure every role×permission cell exists in DB (upsert missing only).
 * Idempotent bootstrap — not a user/project seed.
 * Cached in-process with TTL so hot paths (listado) no re-scan all cells.
 */
let defaultsEnsuredAt = 0;
const DEFAULTS_TTL_MS = 5 * 60_000;
let ensureDefaultsPromise: Promise<void> | null = null;

export async function ensureRolePermissionDefaults(): Promise<void> {
  const now = Date.now();
  if (now - defaultsEnsuredAt < DEFAULTS_TTL_MS) return;
  if (ensureDefaultsPromise) return ensureDefaultsPromise;

  ensureDefaultsPromise = (async () => {
    try {
      const existing = await prisma.rolePermission.findMany({
        select: { role: true, permissionKey: true },
      });
      const have = new Set(
        existing.map((e) => `${e.role}::${e.permissionKey}`)
      );
      const missing: {
        role: string;
        permissionKey: string;
        enabled: boolean;
      }[] = [];

      for (const role of AVAILABLE_ROLES) {
        for (const key of PERMISSION_KEYS) {
          const id = `${role}::${key}`;
          if (have.has(id)) continue;
          missing.push({
            role,
            permissionKey: key,
            enabled: getDefaultEnabled(role, key),
          });
        }
      }

      if (missing.length > 0) {
        await prisma.rolePermission.createMany({
          data: missing,
          skipDuplicates: true,
        });
      }
      defaultsEnsuredAt = Date.now();
    } finally {
      ensureDefaultsPromise = null;
    }
  })();

  return ensureDefaultsPromise;
}

export async function getPermissionsForRole(
  role: string | null | undefined
): Promise<RolePermissionMap> {
  if (!role || !AVAILABLE_ROLES.includes(role as Role)) {
    return defaultsForRole('Beneficiario');
  }
  const r = role as Role;
  await ensureRolePermissionDefaults();
  const rows = await prisma.rolePermission.findMany({
    where: { role: r },
  });
  const map = defaultsForRole(r);
  for (const row of rows) {
    const key = row.permissionKey as PermissionKey;
    if (PERMISSION_KEYS.includes(key)) {
      map[key] = normalizeEnabled(r, key, row.enabled);
    }
  }
  return map;
}

/** Union of permission maps for multiple enabled roles (1 DB query for all roles). */
export async function getPermissionsForRoles(
  roles: readonly string[] | null | undefined
): Promise<RolePermissionMap> {
  const empty = defaultsForRole('Beneficiario');
  for (const k of PERMISSION_KEYS) empty[k] = false;

  if (!roles?.length) return empty;
  if (roles.includes('Admin')) {
    const all = defaultsForRole('Admin');
    for (const k of PERMISSION_KEYS) all[k] = true;
    return all;
  }

  const validRoles = roles.filter((r) =>
    AVAILABLE_ROLES.includes(r as Role)
  ) as Role[];
  if (validRoles.length === 0) return empty;

  await ensureRolePermissionDefaults();
  const rows = await prisma.rolePermission.findMany({
    where: { role: { in: validRoles } },
  });

  const result = { ...empty };
  for (const role of validRoles) {
    const map = defaultsForRole(role);
    for (const row of rows) {
      if (row.role !== role) continue;
      const key = row.permissionKey as PermissionKey;
      if (PERMISSION_KEYS.includes(key)) {
        map[key] = normalizeEnabled(role, key, row.enabled);
      }
    }
    for (const key of PERMISSION_KEYS) {
      if (map[key]) result[key] = true;
    }
  }
  return result;
}

export async function roleHasPermission(
  role: string | null | undefined,
  key: PermissionKey
): Promise<boolean> {
  if (!role) return false;
  if (role === 'Admin') return true;
  const map = await getPermissionsForRole(role);
  return map[key] === true;
}

/** True if any enabled role grants the permission (union). */
export async function userHasPermission(
  availableRoles: readonly string[] | null | undefined,
  key: PermissionKey
): Promise<boolean> {
  if (!availableRoles?.length) return false;
  if (availableRoles.includes('Admin')) return true;
  const map = await getPermissionsForRoles(availableRoles);
  return map[key] === true;
}

/**
 * Whether the user is a participant of the project (any role).
 * Admin-enabled accounts are treated as global participants.
 */
export async function isProjectParticipant(params: {
  proyectoId: string;
  email: string | null | undefined;
  userId?: string | null;
  hasAdminEnabled: boolean;
}): Promise<boolean> {
  const { proyectoId, email, userId, hasAdminEnabled } = params;
  if (hasAdminEnabled) return true;

  if (userId) {
    const byUser = await prisma.proyectoParticipante.findFirst({
      where: { proyectoId, userId },
      select: { id: true },
    });
    if (byUser) return true;
  }

  if (!email?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  const byEmail = await prisma.proyectoParticipante.findFirst({
    where: {
      proyectoId,
      email: { equals: normalized, mode: 'insensitive' },
    },
    select: { id: true },
  });
  return !!byEmail;
}

function preferCoordinatorRole(
  roles: Array<{ rol: string | null }>
): string | null {
  if (roles.length === 0) return null;
  const hasCoord = roles.some(
    (x) => x.rol?.trim().toLowerCase() === 'coordinador'
  );
  if (hasCoord) return 'Coordinador';
  return roles[0]?.rol ?? null;
}

/** Participation role for a user in a project (prefers Coordinador if multiple). */
export async function getParticipationRole(params: {
  proyectoId: string;
  email: string | null | undefined;
  userId?: string | null;
}): Promise<string | null> {
  const { proyectoId, email, userId } = params;

  if (userId) {
    const byUser = await prisma.proyectoParticipante.findMany({
      where: { proyectoId, userId },
      select: { rol: true },
      orderBy: { createdAt: 'asc' },
    });
    const preferred = preferCoordinatorRole(byUser);
    if (preferred) return preferred;
  }

  if (!email?.trim()) return null;
  const normalized = email.trim().toLowerCase();
  const byEmail = await prisma.proyectoParticipante.findMany({
    where: {
      proyectoId,
      email: { equals: normalized, mode: 'insensitive' },
    },
    select: { rol: true },
    orderBy: { createdAt: 'asc' },
  });
  return preferCoordinatorRole(byEmail);
}

/**
 * Matrix permission for participation role + membership (or Admin-enabled).
 */
export async function userCanOnProject(params: {
  availableRoles: readonly string[] | null | undefined;
  email: string | null | undefined;
  userId?: string | null;
  proyectoId: string;
  key: PermissionKey;
  /** @deprecated Ignored; kept for transitional call sites */
  activeRole?: string | null;
}): Promise<boolean> {
  const { availableRoles, email, userId, proyectoId, key } = params;
  if (userHasAdminEnabled(availableRoles)) return true;

  const participationRole = await getParticipationRole({
    proyectoId,
    email,
    userId,
  });
  if (!participationRole) return false;

  return roleHasPermission(participationRole, key);
}

/** @deprecated Use isProjectParticipant */
export async function isParticipantWithActiveRole(params: {
  proyectoId: string;
  email: string | null | undefined;
  activeRole: string | null | undefined;
  userId?: string | null;
  availableRoles?: readonly string[] | null;
}): Promise<boolean> {
  return isProjectParticipant({
    proyectoId: params.proyectoId,
    email: params.email,
    userId: params.userId,
    hasAdminEnabled: userHasAdminEnabled(
      params.availableRoles ??
        (params.activeRole === 'Admin' ? ['Admin'] : [])
    ),
  });
}

export async function getMyEnabledRolesPermissions(
  availableRoles: readonly string[] | null | undefined
): Promise<RolePermissionMap> {
  return getPermissionsForRoles(availableRoles);
}
