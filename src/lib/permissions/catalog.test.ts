import { describe, expect, it } from 'vitest';
import {
  defaultsForRole,
  getDefaultEnabled,
  normalizeEnabled,
  viewPermissionForPath,
} from '@/lib/permissions/catalog';

describe('permissions catalog', () => {
  it('Admin defaults all permissions ON', () => {
    const map = defaultsForRole('Admin');
    expect(map['view.ajustes']).toBe(true);
    expect(map['projects.view_all']).toBe(true);
    expect(map['projects.create']).toBe(true);
    expect(map['projects.edit']).toBe(true);
  });

  it('non-Admin never gets view.ajustes via normalizeEnabled', () => {
    expect(normalizeEnabled('Coordinador', 'view.ajustes', true)).toBe(false);
    expect(getDefaultEnabled('Coordinador', 'view.ajustes')).toBe(false);
  });

  it('maps key routes to view permissions', () => {
    expect(viewPermissionForPath('/inicio')).toBe('view.inicio');
    expect(viewPermissionForPath('/proyectos/abc')).toBe('view.proyectos');
    expect(viewPermissionForPath('/configuracion/usuarios')).toBe(
      'view.ajustes'
    );
    expect(viewPermissionForPath('/unknown')).toBeNull();
  });

  it('Beneficiario has create project default ON and view_all OFF', () => {
    expect(getDefaultEnabled('Beneficiario', 'projects.create')).toBe(true);
    expect(getDefaultEnabled('Beneficiario', 'projects.view_all')).toBe(false);
  });

  it('Editar proyecto defaults ON for all roles (scoped by participation)', () => {
    expect(getDefaultEnabled('Coordinador', 'projects.edit')).toBe(true);
    expect(getDefaultEnabled('Encargado', 'projects.edit')).toBe(true);
    expect(getDefaultEnabled('Colaborador', 'projects.edit')).toBe(true);
    expect(getDefaultEnabled('Docente', 'projects.edit')).toBe(true);
    expect(getDefaultEnabled('Estudiante', 'projects.edit')).toBe(true);
    expect(getDefaultEnabled('Beneficiario', 'projects.edit')).toBe(true);
  });
});
