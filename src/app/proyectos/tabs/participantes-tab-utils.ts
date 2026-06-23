export const SELECT_NONE_VALUE = '__none__';

export const ROLES: { value: string; label: string }[] = [
  { value: 'Encargado', label: 'Encargado' },
  { value: 'Coordinador', label: 'Coordinador' },
  { value: 'Colaborador', label: 'Colaborador' },
  { value: 'Docente', label: 'Docente' },
  { value: 'Estudiante', label: 'Estudiante' },
  { value: 'Beneficiario', label: 'Beneficiario' },
];

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
  email: string;
  cargo: string;
  socioComunitarioId: string;
  sedeId: string;
  escuelaId: string;
};

export const emptyNewParticipanteData = (): NewParticipanteForm => ({
  rol: 'Colaborador',
  nombre: '',
  email: '',
  cargo: '',
  socioComunitarioId: '',
  sedeId: '',
  escuelaId: '',
});
