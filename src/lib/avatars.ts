/** Avatar fijo de la aplicación. No es editable por el usuario. */
export const DEFAULT_AVATAR = '/avatar.png?v=20260720c';

/**
 * Retorna siempre el avatar fijo de la app.
 * Ignora cualquier valor guardado en BD o sesión.
 */
export function getUserAvatarUrl(_image?: string | null): string {
  return DEFAULT_AVATAR;
}
