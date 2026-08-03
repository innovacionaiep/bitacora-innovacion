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
