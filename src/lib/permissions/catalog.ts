import type { Role } from '@/lib/auth-utils';
import { AVAILABLE_ROLES } from '@/lib/auth-utils';

export type PermissionGroup = 'visualizacion' | 'atribuciones';

export type PermissionKey =
  | 'view.inicio'
  | 'view.proyectos'
  | 'view.dashboard'
  | 'view.reportes'
  | 'view.ajustes'
  | 'view.novedades'
  | 'view.soporte'
  | 'projects.view_all'
  | 'projects.create'
  | 'compromisos.create_edit'
  | 'compromisos.mark_done'
  | 'novedades.manage'
  | 'soporte.admin'
  | 'convocatorias.manage';

export type PermissionDefinition = {
  key: PermissionKey;
  label: string;
  group: PermissionGroup;
  /** Roles with this permission ON by default (current code behavior). Admin always ON. */
  defaultOn: Role[];
};

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  {
    key: 'view.inicio',
    label: 'Inicio',
    group: 'visualizacion',
    defaultOn: [...AVAILABLE_ROLES],
  },
  {
    key: 'view.proyectos',
    label: 'Proyectos',
    group: 'visualizacion',
    defaultOn: [...AVAILABLE_ROLES],
  },
  {
    key: 'view.dashboard',
    label: 'Dashboard',
    group: 'visualizacion',
    defaultOn: ['Admin', 'Coordinador', 'Beneficiario'],
  },
  {
    key: 'view.reportes',
    label: 'Reportes',
    group: 'visualizacion',
    defaultOn: ['Admin', 'Coordinador', 'Beneficiario'],
  },
  {
    key: 'view.ajustes',
    label: 'Ajustes',
    group: 'visualizacion',
    defaultOn: ['Admin'],
  },
  {
    key: 'view.novedades',
    label: 'Novedades',
    group: 'visualizacion',
    defaultOn: ['Admin'],
  },
  {
    key: 'view.soporte',
    label: 'Soporte (panel)',
    group: 'visualizacion',
    defaultOn: ['Admin'],
  },
  {
    key: 'projects.view_all',
    label: 'Ver todos los proyectos',
    group: 'atribuciones',
    defaultOn: ['Admin'],
  },
  {
    key: 'projects.create',
    label: 'Crear proyecto',
    group: 'atribuciones',
    defaultOn: [...AVAILABLE_ROLES],
  },
  {
    key: 'compromisos.create_edit',
    label: 'Crear/editar compromisos',
    group: 'atribuciones',
    defaultOn: ['Admin', 'Coordinador'],
  },
  {
    key: 'compromisos.mark_done',
    label: 'Marcar compromiso realizado',
    group: 'atribuciones',
    defaultOn: ['Admin', 'Encargado'],
  },
  {
    key: 'novedades.manage',
    label: 'Gestionar Novedades',
    group: 'atribuciones',
    defaultOn: ['Admin'],
  },
  {
    key: 'soporte.admin',
    label: 'Administrar chat soporte',
    group: 'atribuciones',
    defaultOn: ['Admin'],
  },
  {
    key: 'convocatorias.manage',
    label: 'Crear/editar convocatorias',
    group: 'atribuciones',
    defaultOn: ['Admin'],
  },
];

export const PERMISSION_KEYS = PERMISSION_CATALOG.map((p) => p.key);

export const GROUP_LABELS: Record<PermissionGroup, string> = {
  visualizacion: 'Visualización',
  atribuciones: 'Atribuciones',
};

/** Admin column: all permissions always ON and non-editable. */
export function isAdminLocked(role: Role): boolean {
  return role === 'Admin';
}

/** view.ajustes: only Admin may have it ON. */
export function isAjustesCellLocked(role: Role, key: PermissionKey): boolean {
  return key === 'view.ajustes' && role !== 'Admin';
}

export function isCellDisabled(role: Role, key: PermissionKey): boolean {
  return isAdminLocked(role) || isAjustesCellLocked(role, key);
}

export function getDefaultEnabled(role: Role, key: PermissionKey): boolean {
  if (role === 'Admin') return true;
  if (key === 'view.ajustes') return false;
  const def = PERMISSION_CATALOG.find((p) => p.key === key);
  return def?.defaultOn.includes(role) ?? false;
}

/** Force invariants before persist. */
export function normalizeEnabled(
  role: Role,
  key: PermissionKey,
  enabled: boolean
): boolean {
  if (role === 'Admin') return true;
  if (key === 'view.ajustes') return false;
  return enabled;
}

/** Map pathname → view permission (null = no view gate). */
export function viewPermissionForPath(
  pathname: string
): PermissionKey | null {
  if (pathname === '/inicio' || pathname.startsWith('/inicio/')) {
    return 'view.inicio';
  }
  if (pathname.startsWith('/proyectos')) return 'view.proyectos';
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return 'view.dashboard';
  }
  if (pathname.startsWith('/reportes')) return 'view.reportes';
  if (pathname.startsWith('/configuracion')) return 'view.ajustes';
  if (pathname.startsWith('/novedades')) return 'view.novedades';
  if (pathname.startsWith('/soporte')) return 'view.soporte';
  return null;
}

export type RolePermissionMap = Record<PermissionKey, boolean>;

export function emptyPermissionMap(allFalse = false): RolePermissionMap {
  const map = {} as RolePermissionMap;
  for (const key of PERMISSION_KEYS) {
    map[key] = allFalse ? false : false;
  }
  return map;
}

export function defaultsForRole(role: Role): RolePermissionMap {
  const map = {} as RolePermissionMap;
  for (const key of PERMISSION_KEYS) {
    map[key] = getDefaultEnabled(role, key);
  }
  return map;
}
