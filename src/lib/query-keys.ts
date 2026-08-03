/** Keys estables de React Query para /proyectos y tabs. */

export const proyectosListadoKey = (activeRole?: string | null) =>
  ['proyectos-listado', activeRole ?? null] as const;

export const proyectoBaseKey = (id: string) =>
  ['proyecto', id, 'base'] as const;

export const proyectoParticipantesKey = (id: string) =>
  ['proyecto', id, 'participantes'] as const;

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

export const resumenTabKey = (projectId: string) =>
  ['resumen-tab', projectId] as const;

export const historialKey = (
  projectId: string,
  filters?: Record<string, string | undefined>
) => ['historial', projectId, filters ?? {}] as const;

export const historialFiltrosKey = (projectId: string) =>
  ['historial-filtros', projectId] as const;
