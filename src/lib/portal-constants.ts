/** Roles del portal Inicio con el mismo panel de pendientes (alertas + compromisos). */
export const ROLES_ALERTAS_PORTAL = [
  'Coordinador',
  'Encargado',
  'Colaborador',
  'Docente',
  'Estudiante',
] as const;

/** @deprecated Preferir ROLES_ALERTAS_PORTAL; se mantiene por compatibilidad. */
export const ROLES_ALERTAS_OPERATIVAS = [
  'Encargado',
  'Colaborador',
  'Docente',
  'Estudiante',
] as const;

/** Roles de participación que pueden editar contenido de proyecto (Gantt, indicadores, etc.). */
export const ROLES_EDIT_PORTAL_PROJECT = ['Coordinador', 'Encargado'] as const;

/**
 * Admin (rol habilitado) o participación Coordinador/Encargado en el proyecto.
 */
export function canEditPortalProject(
  availableRoles: string[] | undefined | null,
  rolEnProyecto: string | null | undefined
): boolean {
  if (availableRoles?.includes('Admin')) return true;
  return (
    rolEnProyecto === 'Coordinador' || rolEnProyecto === 'Encargado'
  );
}
