export const SELECT_NONE_VALUE = '__none__';
export const NEW_PERSONA_VALUE = '__new_persona__';

export const ROLES: { value: string; label: string }[] = [
  { value: 'Encargado', label: 'Encargado' },
  { value: 'Coordinador', label: 'Coordinador' },
  { value: 'Colaborador', label: 'Colaborador' },
  { value: 'Docente', label: 'Docente' },
  { value: 'Estudiante', label: 'Estudiante' },
  { value: 'Beneficiario', label: 'Beneficiario' },
];

/** Roles con selector de persona existente + sync a User (no Beneficiario). */
export const SYNCABLE_PARTICIPANTE_ROLES = [
  'Encargado',
  'Coordinador',
  'Colaborador',
  'Docente',
  'Estudiante',
] as const;

export type SyncableParticipanteRol =
  (typeof SYNCABLE_PARTICIPANTE_ROLES)[number];

export function isSyncableParticipanteRol(
  rol: string
): rol is SyncableParticipanteRol {
  return (SYNCABLE_PARTICIPANTE_ROLES as readonly string[]).includes(rol);
}

/** Colores por rol según docs/SISTEMA-ROLES.md */
export const ROLE_COLORS: Record<string, string> = {
  Encargado: 'bg-orange-100 text-orange-800 border-orange-200',
  Coordinador: 'bg-blue-100 text-blue-800 border-blue-200',
  Colaborador: 'bg-violet-100 text-violet-800 border-violet-200',
  Docente: 'bg-green-100 text-green-800 border-green-200',
  Estudiante: 'bg-red-100 text-red-800 border-red-200',
  Beneficiario: 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

export type NewParticipanteForm = {
  rol: 'Encargado' | 'Coordinador' | 'Colaborador' | 'Docente' | 'Estudiante' | 'Beneficiario';
  nombre: string;
  rut: string;
  email: string;
  cargo: string;
  laborEnProyecto: string;
  socioComunitarioId: string;
  sedeId: string;
  escuelaId: string;
  carreraId: string;
  asignaturaId: string;
};

export const emptyNewParticipanteData = (): NewParticipanteForm => ({
  rol: 'Colaborador',
  nombre: '',
  rut: '',
  email: '',
  cargo: '',
  laborEnProyecto: '',
  socioComunitarioId: '',
  sedeId: '',
  escuelaId: '',
  carreraId: '',
  asignaturaId: '',
});

/** Valida campos obligatorios según rol. Devuelve mensaje de error o null. */
export function validateParticipanteForm(data: {
  rol: string;
  nombre?: string;
  email?: string;
  rut?: string;
  socioComunitarioId?: string;
  carreraId?: string;
  asignaturaId?: string;
}): string | null {
  if (!data.nombre?.trim()) {
    return 'El nombre es obligatorio.';
  }
  if (!data.email?.trim()) {
    return 'El correo es obligatorio.';
  }
  if (
    (data.rol === 'Docente' || data.rol === 'Estudiante') &&
    !data.rut?.trim()
  ) {
    return 'El RUT es obligatorio para docentes y estudiantes.';
  }
  if (data.rol === 'Estudiante' && !data.carreraId) {
    return 'La carrera es obligatoria para estudiantes.';
  }
  if (data.rol === 'Estudiante' && !data.asignaturaId) {
    return 'La asignatura es obligatoria para estudiantes.';
  }
  if (data.rol === 'Beneficiario' && !data.socioComunitarioId) {
    return 'El socio comunitario es obligatorio para beneficiarios.';
  }
  return null;
}
