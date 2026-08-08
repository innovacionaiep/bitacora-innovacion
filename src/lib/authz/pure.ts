import {
  AVAILABLE_ROLES,
  REGISTER_ROLES,
  type Role,
} from '@/lib/auth-utils';
import type { PermissionKey } from '@/lib/permissions/catalog';

/**
 * Pure authz helpers (unit-testable without Prisma/NextAuth).
 */

/** Only this account may hold multiple participation roles in one project. */
export const MULTI_PARTICIPATION_EXCEPTION_EMAIL = 'admin@test.cl';

export function isRegisterableRole(role: string): role is Exclude<Role, 'Admin'> {
  return (REGISTER_ROLES as readonly string[]).includes(role);
}

export function isKnownRole(role: string): role is Role {
  return (AVAILABLE_ROLES as readonly string[]).includes(role);
}

export function userHasEnabledRole(
  availableRoles: readonly string[] | null | undefined,
  role: string
): boolean {
  if (!availableRoles?.length) return false;
  return availableRoles.includes(role);
}

export function userHasAdminEnabled(
  availableRoles: readonly string[] | null | undefined
): boolean {
  return userHasEnabledRole(availableRoles, 'Admin');
}

/** Participation role string is Coordinador (case-insensitive). */
export function isCoordinatorParticipationRole(
  role: string | null | undefined
): boolean {
  return role?.trim().toLowerCase() === 'coordinador';
}

/**
 * Edit presupuesto adjudicado: Admin enabled OR project Coordinador.
 */
export function canEditPresupuestoAdjudicado(params: {
  hasAdminEnabled: boolean;
  participationRole: string | null | undefined;
}): boolean {
  if (params.hasAdminEnabled) return true;
  return isCoordinatorParticipationRole(params.participationRole);
}

/**
 * Union of enabled roles: true if ANY role grants the permission.
 * Admin in the list short-circuits to true (caller may also short-circuit earlier).
 */
export function anyRoleHasPermission(
  availableRoles: readonly string[] | null | undefined,
  key: PermissionKey,
  roleHas: (role: string, key: PermissionKey) => boolean
): boolean {
  if (!availableRoles?.length) return false;
  if (availableRoles.includes('Admin')) return true;
  return availableRoles.some((role) => roleHas(role, key));
}

/**
 * Project-scoped action: Admin-enabled bypasses; otherwise use participation role matrix.
 */
export function canActOnProjectWithRole(params: {
  hasAdminEnabled: boolean;
  participationRole: string | null | undefined;
  key: PermissionKey;
  roleHas: (role: string, key: PermissionKey) => boolean;
}): boolean {
  if (params.hasAdminEnabled) return true;
  const role = params.participationRole?.trim();
  if (!role) return false;
  return params.roleHas(role, params.key);
}

export function normalizeEmail(
  email: string | null | undefined
): string | null {
  const t = email?.trim().toLowerCase();
  return t || null;
}

export function allowsMultipleParticipationRoles(
  email: string | null | undefined
): boolean {
  return normalizeEmail(email) === MULTI_PARTICIPATION_EXCEPTION_EMAIL;
}

/**
 * @deprecated Active role is removed from the product model.
 * Kept only for transitional JWT code paths; prefer availableRoles.
 */
export function canAssumeActiveRole(
  requested: unknown,
  availableRoles: readonly string[]
): requested is string {
  if (typeof requested !== 'string' || !requested.trim()) return false;
  if (!isKnownRole(requested)) return false;
  return availableRoles.includes(requested);
}

/**
 * @deprecated Active role updates are no longer used for authorization.
 */
export function resolveActiveRoleUpdate(
  requested: unknown,
  availableRoles: readonly string[]
): string | null {
  if (!canAssumeActiveRole(requested, availableRoles)) return null;
  return requested;
}
