/**
 * Modo mantenimiento — solo aplica en producción (Vercel production / NODE_ENV=production).
 * El flag persistido vive en SystemSetting (key: maintenance_enabled).
 */

export const MAINTENANCE_PATH = '/mantenimiento';
export const MAINTENANCE_SETTINGS_PATH = '/configuracion/mantenimiento';
export const MAINTENANCE_STATUS_API = '/api/maintenance-status';
export const MAINTENANCE_SETTING_KEY = 'maintenance_enabled';

export const MAINTENANCE_TITLE = 'Bitácora en mantenimiento';

export const MAINTENANCE_MESSAGE =
  'Estamos realizando tareas de mantenimiento en la plataforma. El acceso está temporalmente suspendido. Volveremos en breve.';

/** true solo en producción real (no preview, no `pnpm dev`). */
export function isProductionRuntime(): boolean {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === 'production';
  }
  return process.env.NODE_ENV === 'production';
}
