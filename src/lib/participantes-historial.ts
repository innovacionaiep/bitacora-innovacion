export type ParticipanteHistorialSnapshot = {
  rol: string;
  nombre: string | null;
  rut: string | null;
  email: string | null;
  cargo: string | null;
  laborEnProyecto: string | null;
  socioNombre: string | null;
  sedeNombre: string | null;
  escuelaNombre: string | null;
  carreraNombre: string | null;
  asignaturaNombre: string | null;
};

const FIELDS: Array<{
  key: keyof ParticipanteHistorialSnapshot;
  label: string;
}> = [
  { key: 'rol', label: 'Rol' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'rut', label: 'RUT' },
  { key: 'email', label: 'Correo' },
  { key: 'cargo', label: 'Cargo' },
  { key: 'sedeNombre', label: 'Sede' },
  { key: 'escuelaNombre', label: 'Escuela' },
  { key: 'carreraNombre', label: 'Carrera' },
  { key: 'asignaturaNombre', label: 'Asignatura' },
  { key: 'socioNombre', label: 'Socio comunitario' },
  { key: 'laborEnProyecto', label: 'Labor en el proyecto' },
];

function norm(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function display(value: string | null | undefined): string {
  return norm(value) || '—';
}

/** Diff de campos para `cambioGenerado` del historial. Vacío si no hay cambios. */
export function buildParticipanteCambioGenerado(
  before: ParticipanteHistorialSnapshot,
  after: ParticipanteHistorialSnapshot
): string {
  const parts: string[] = [];
  for (const { key, label } of FIELDS) {
    if (norm(before[key]) === norm(after[key])) continue;
    parts.push(`${label}: ${display(before[key])} → ${display(after[key])}`);
  }
  return parts.join('; ');
}
