/** Keys estables de React Query para /proyectos y tabs. */

export const proyectosListadoKey = (userId?: string | null) =>
  ['proyectos-listado', userId ?? null] as const;

export const proyectoBaseKey = (id: string) =>
  ['proyecto', id, 'base'] as const;

export const proyectoParticipantesKey = (id: string) =>
  ['proyecto', id, 'participantes'] as const;

export const proyectoDesarrolloTecnicoKey = (id: string) =>
  ['proyecto', id, 'desarrollo-tecnico'] as const;

export const proyectoActivitiesKey = (id: string) =>
  ['proyecto-activities', id] as const;

export const catalogosGeneralKey = ['catalogos-general'] as const;

export const desarrolloTecnicoConfigKey = [
  'desarrollo-tecnico-config',
] as const;

export const sedesKey = ['sedes'] as const;

export const escuelasConfigKey = ['escuelas-config'] as const;

export const carrerasConfigKey = ['carreras-config'] as const;

export const asignaturasConfigKey = ['asignaturas-config'] as const;

export const usersByAppRoleKey = (role: string) =>
  ['users-by-app-role', role] as const;

export const indicadoresKey = (projectId: string) =>
  ['indicadores', projectId] as const;

export const presupuestoKey = (projectId: string) =>
  ['presupuesto', projectId] as const;

export const compromisosKey = (projectId: string) =>
  ['compromisos', projectId] as const;

export const reunionesKey = (projectId: string) =>
  ['reuniones', projectId] as const;

export const escalamientoKey = (projectId: string) =>
  ['escalamiento', projectId] as const;

export const resumenTabKey = (projectId: string) =>
  ['resumen-tab', projectId] as const;

export const historialKey = (
  projectId: string,
  filters?: Record<string, string | undefined>
) => ['historial', projectId, filters ?? {}] as const;

export const historialFiltrosKey = (projectId: string) =>
  ['historial-filtros', projectId] as const;

export function proyectoTabDataPrefetchKeys(projectId: string) {
  return [
    proyectoActivitiesKey(projectId),
    indicadoresKey(projectId),
    presupuestoKey(projectId),
    proyectoParticipantesKey(projectId),
    reunionesKey(projectId),
    historialKey(projectId, {}),
    historialFiltrosKey(projectId),
    escalamientoKey(projectId),
  ] as const;
}

export const fondoGestionKey = (fondoNombre: string) =>
  ['fondo-gestion', fondoNombre] as const;

/** Prefixes used for per-project React Query entries (for eviction). */
export const proyectoDetailQueryFilters = (projectId: string) =>
  [
    { queryKey: ['proyecto', projectId] as const },
    { queryKey: ['proyecto-activities', projectId] as const },
    { queryKey: ['indicadores', projectId] as const },
    { queryKey: ['presupuesto', projectId] as const },
    { queryKey: ['compromisos', projectId] as const },
    { queryKey: ['reuniones', projectId] as const },
    { queryKey: ['resumen-tab', projectId] as const },
    { queryKey: ['historial', projectId] as const },
    { queryKey: ['historial-filtros', projectId] as const },
    { queryKey: ['escalamiento', projectId] as const },
  ] as const;

