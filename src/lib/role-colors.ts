/** Colores de badge por rol (portal / participantes). */
export function getRoleColors(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'coordinador':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'colaborador':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'encargado':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'docente':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'estudiante':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'beneficiario':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/** Clases del badge de rol (mismo estilo que «Roles habilitados»). */
export const ROLE_BADGE_CLASS =
  'inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium';
