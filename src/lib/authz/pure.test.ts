import { describe, expect, it } from 'vitest';
import {
  allowsMultipleParticipationRoles,
  anyRoleHasPermission,
  canActOnProjectWithRole,
  canAssumeActiveRole,
  canEditPresupuestoAdjudicado,
  isRegisterableRole,
  MULTI_PARTICIPATION_EXCEPTION_EMAIL,
  resolveActiveRoleUpdate,
  userHasAdminEnabled,
  userHasEnabledRole,
} from '@/lib/authz/pure';
import type { PermissionKey } from '@/lib/permissions/catalog';

describe('isRegisterableRole', () => {
  it('allows non-Admin register roles', () => {
    expect(isRegisterableRole('Coordinador')).toBe(true);
    expect(isRegisterableRole('Estudiante')).toBe(true);
  });

  it('rejects Admin and unknown roles', () => {
    expect(isRegisterableRole('Admin')).toBe(false);
    expect(isRegisterableRole('SuperUser')).toBe(false);
    expect(isRegisterableRole('')).toBe(false);
  });
});

describe('userHasEnabledRole / userHasAdminEnabled', () => {
  it('detects enabled roles', () => {
    expect(userHasEnabledRole(['Coordinador', 'Encargado'], 'Encargado')).toBe(
      true
    );
    expect(userHasEnabledRole(['Coordinador'], 'Encargado')).toBe(false);
    expect(userHasEnabledRole(null, 'Admin')).toBe(false);
  });

  it('detects Admin among enabled roles', () => {
    expect(userHasAdminEnabled(['Admin', 'Coordinador'])).toBe(true);
    expect(userHasAdminEnabled(['Coordinador'])).toBe(false);
  });
});

describe('canEditPresupuestoAdjudicado', () => {
  it('allows Admin enabled', () => {
    expect(
      canEditPresupuestoAdjudicado({
        hasAdminEnabled: true,
        participationRole: 'Encargado',
      })
    ).toBe(true);
  });

  it('allows Coordinador participation', () => {
    expect(
      canEditPresupuestoAdjudicado({
        hasAdminEnabled: false,
        participationRole: 'Coordinador',
      })
    ).toBe(true);
    expect(
      canEditPresupuestoAdjudicado({
        hasAdminEnabled: false,
        participationRole: ' coordinador ',
      })
    ).toBe(true);
  });

  it('denies Encargado and missing role', () => {
    expect(
      canEditPresupuestoAdjudicado({
        hasAdminEnabled: false,
        participationRole: 'Encargado',
      })
    ).toBe(false);
    expect(
      canEditPresupuestoAdjudicado({
        hasAdminEnabled: false,
        participationRole: null,
      })
    ).toBe(false);
  });
});

describe('anyRoleHasPermission (union)', () => {
  const matrix: Record<string, PermissionKey[]> = {
    Coordinador: ['compromisos.create_edit', 'view.fondos'],
    Encargado: ['compromisos.mark_done'],
  };
  const roleHas = (role: string, key: PermissionKey) =>
    (matrix[role] ?? []).includes(key);

  it('returns true if any enabled role has the permission', () => {
    expect(
      anyRoleHasPermission(
        ['Coordinador', 'Encargado'],
        'compromisos.mark_done',
        roleHas
      )
    ).toBe(true);
    expect(
      anyRoleHasPermission(
        ['Coordinador', 'Encargado'],
        'compromisos.create_edit',
        roleHas
      )
    ).toBe(true);
    expect(
      anyRoleHasPermission(['Encargado'], 'view.fondos', roleHas)
    ).toBe(false);
  });

  it('short-circuits when Admin is enabled', () => {
    expect(
      anyRoleHasPermission(['Admin'], 'view.ajustes', () => false)
    ).toBe(true);
  });

  it('returns false for empty roles', () => {
    expect(anyRoleHasPermission([], 'view.inicio', roleHas)).toBe(false);
  });
});

describe('canActOnProjectWithRole', () => {
  const roleHas = (role: string, key: PermissionKey) =>
    role === 'Coordinador' && key === 'compromisos.create_edit';

  it('Admin-enabled bypasses participation role', () => {
    expect(
      canActOnProjectWithRole({
        hasAdminEnabled: true,
        participationRole: null,
        key: 'compromisos.create_edit',
        roleHas,
      })
    ).toBe(true);
  });

  it('uses participation role matrix when not Admin', () => {
    expect(
      canActOnProjectWithRole({
        hasAdminEnabled: false,
        participationRole: 'Coordinador',
        key: 'compromisos.create_edit',
        roleHas,
      })
    ).toBe(true);
    expect(
      canActOnProjectWithRole({
        hasAdminEnabled: false,
        participationRole: 'Encargado',
        key: 'compromisos.create_edit',
        roleHas,
      })
    ).toBe(false);
  });

  it('denies without participation role', () => {
    expect(
      canActOnProjectWithRole({
        hasAdminEnabled: false,
        participationRole: null,
        key: 'view.proyectos',
        roleHas: () => true,
      })
    ).toBe(false);
  });
});

describe('allowsMultipleParticipationRoles', () => {
  it('allows only the exception email', () => {
    expect(
      allowsMultipleParticipationRoles(MULTI_PARTICIPATION_EXCEPTION_EMAIL)
    ).toBe(true);
    expect(allowsMultipleParticipationRoles('Admin@Test.CL')).toBe(true);
    expect(allowsMultipleParticipationRoles('otro@test.cl')).toBe(false);
    expect(allowsMultipleParticipationRoles(null)).toBe(false);
  });
});

describe('canAssumeActiveRole / resolveActiveRoleUpdate (deprecated)', () => {
  const roles = ['Coordinador', 'Docente'];

  it('allows a role the user owns', () => {
    expect(canAssumeActiveRole('Docente', roles)).toBe(true);
    expect(resolveActiveRoleUpdate('Docente', roles)).toBe('Docente');
  });

  it('rejects privilege escalation to Admin when not owned', () => {
    expect(canAssumeActiveRole('Admin', roles)).toBe(false);
    expect(resolveActiveRoleUpdate('Admin', roles)).toBeNull();
  });

  it('rejects unknown or empty values', () => {
    expect(resolveActiveRoleUpdate('', roles)).toBeNull();
    expect(resolveActiveRoleUpdate(null, roles)).toBeNull();
    expect(resolveActiveRoleUpdate('Hacker', roles)).toBeNull();
  });

  it('allows Admin only when listed in availableRoles', () => {
    expect(resolveActiveRoleUpdate('Admin', ['Admin', 'Coordinador'])).toBe(
      'Admin'
    );
  });
});
