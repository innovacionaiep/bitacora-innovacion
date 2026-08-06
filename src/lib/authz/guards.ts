'use server';

import { getSession } from '@/lib/auth-utils';
import {
  userHasPermission,
  userCanOnProject,
} from '@/lib/permissions/check';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import type { PermissionKey } from '@/lib/permissions/catalog';

export type AuthzUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  availableRoles?: string[];
  /** @deprecated Prefer availableRoles; kept for transitional call sites */
  activeRole?: string | null;
};

export type AuthzOk = { ok: true; user: AuthzUser };
export type AuthzFail = { ok: false; error: string };
export type AuthzGate = AuthzOk | AuthzFail;

function toUser(sessionUser: {
  id: string;
  email?: string | null;
  name?: string | null;
  activeRole?: string | null;
  availableRoles?: string[];
}): AuthzUser {
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    name: sessionUser.name,
    availableRoles: sessionUser.availableRoles ?? [],
    activeRole: sessionUser.activeRole ?? null,
  };
}

export async function requireSession(): Promise<AuthzGate> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: 'No autenticado' };
  }
  return { ok: true, user: toUser(session.user) };
}

export async function requireAdmin(): Promise<AuthzGate> {
  const gate = await requireSession();
  if (!gate.ok) return gate;
  if (!userHasAdminEnabled(gate.user.availableRoles)) {
    return { ok: false, error: 'Solo Admin puede realizar esta acción' };
  }
  return gate;
}

export async function requirePermission(
  key: PermissionKey
): Promise<AuthzGate> {
  const gate = await requireSession();
  if (!gate.ok) return gate;
  const allowed = await userHasPermission(gate.user.availableRoles, key);
  if (!allowed) {
    return { ok: false, error: 'No tienes permiso para esta acción' };
  }
  return gate;
}

export async function requireProjectAccess(
  proyectoId: string,
  key: PermissionKey = 'view.proyectos'
): Promise<AuthzGate> {
  const gate = await requireSession();
  if (!gate.ok) return gate;
  if (!proyectoId) {
    return { ok: false, error: 'Proyecto no especificado' };
  }
  const allowed = await userCanOnProject({
    availableRoles: gate.user.availableRoles,
    email: gate.user.email,
    userId: gate.user.id,
    proyectoId,
    key,
  });
  if (!allowed) {
    return { ok: false, error: 'No tienes acceso a este proyecto' };
  }
  return gate;
}

/** Caller must be the target user or Admin (enabled role). */
export async function requireSelfOrAdmin(
  targetUserId: string
): Promise<AuthzGate> {
  const gate = await requireSession();
  if (!gate.ok) return gate;
  if (
    gate.user.id === targetUserId ||
    userHasAdminEnabled(gate.user.availableRoles)
  ) {
    return gate;
  }
  return { ok: false, error: 'No autorizado' };
}
