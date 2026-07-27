/**
 * Modo mantenimiento (migración de infraestructura).
 * Activo por defecto. Desactivar con NEXT_PUBLIC_MAINTENANCE_MODE=false
 */
export const MAINTENANCE_MODE_ENABLED =
  process.env.NEXT_PUBLIC_MAINTENANCE_MODE !== 'false';

export const MAINTENANCE_PATH = '/mantenimiento';

export const MAINTENANCE_TITLE = 'Bitácora en mantenimiento';

export const MAINTENANCE_MESSAGE =
  'Estamos migrando la infraestructura de la plataforma. El acceso está temporalmente suspendido para proteger tus datos. Volveremos en breve.';
