import { describe, expect, it } from 'vitest';
import {
  buildRoleClaims,
  shouldRefreshJwtRoles,
  JWT_ROLES_REFRESH_INTERVAL_MS,
} from './sync-session-roles';

describe('shouldRefreshJwtRoles', () => {
  it('refreshes when never refreshed', () => {
    expect(shouldRefreshJwtRoles(undefined, 1000)).toBe(true);
  });

  it('skips when within interval', () => {
    const now = 100_000;
    expect(
      shouldRefreshJwtRoles(now - JWT_ROLES_REFRESH_INTERVAL_MS + 1, now)
    ).toBe(false);
  });

  it('refreshes when interval elapsed', () => {
    const now = 100_000;
    expect(
      shouldRefreshJwtRoles(now - JWT_ROLES_REFRESH_INTERVAL_MS, now)
    ).toBe(true);
  });
});

describe('buildRoleClaims', () => {
  it('dedupes roles and keeps valid activeRole', () => {
    expect(buildRoleClaims(['Docente', 'Docente', 'Encargado'], 'Docente')).toEqual({
      availableRoles: ['Docente', 'Encargado'],
      activeRole: 'Docente',
    });
  });

  it('falls back activeRole when removed from enabled roles', () => {
    expect(buildRoleClaims(['Encargado', 'Colaborador'], 'Docente')).toEqual({
      availableRoles: ['Encargado', 'Colaborador'],
      activeRole: 'Encargado',
    });
  });

  it('clears activeRole when user has no roles', () => {
    expect(buildRoleClaims([], 'Admin')).toEqual({
      availableRoles: [],
      activeRole: null,
    });
  });
});
