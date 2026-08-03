'use server';

import prisma from '@/lib/prisma';
import { AVAILABLE_ROLES, type Role } from '@/lib/auth-utils';
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

export async function roleHasPermission(
  role: string | null | undefined,
  key: PermissionKey
): Promise<boolean> {
  if (!role) return false;
  if (role === 'Admin') return true;
  const map = await getPermissionsForRole(role);
  return map[key] === true;
}

/**
 * Participation: email (lowercase) + rol in ProyectoParticipante equals activeRole.
 * Admin has global participation (always true for project scope).
 */
export async function isParticipantWithActiveRole(params: {
  proyectoId: string;
  email: string | null | undefined;
  activeRole: string | null | undefined;
  userId?: string | null;
}): Promise<boolean> {
  const { proyectoId, email, activeRole, userId } = params;
  if (!activeRole) return false;
  if (activeRole === 'Admin') return true;

  const roleNorm = activeRole.trim();

  if (userId) {
    const byUser = await prisma.proyectoParticipante.findFirst({
      where: {
        proyectoId,
        userId,
        rol: roleNorm,
      },
      select: { id: true },
    });
    if (byUser) return true;
  }

  if (!email?.trim()) return false;
  const normalized = email.trim().toLowerCase();
  const byEmail = await prisma.proyectoParticipante.findMany({
    where: {
      proyectoId,
      email: { not: null },
      rol: roleNorm,
    },
    select: { email: true },
  });
  return byEmail.some((p) => p.email?.trim().toLowerCase() === normalized);
}

/**
 * Matrix permission ON + (Admin global OR participant with same role via email/userId).
 */
export async function userCanOnProject(params: {
  activeRole: string | null | undefined;
  email: string | null | undefined;
  userId?: string | null;
  proyectoId: string;
  key: PermissionKey;
}): Promise<boolean> {
  const { activeRole, email, userId, proyectoId, key } = params;
  const has = await roleHasPermission(activeRole, key);
  if (!has) return false;
  if (activeRole === 'Admin') return true;
  return isParticipantWithActiveRole({
    proyectoId,
    email,
    activeRole,
    userId,
  });
}
