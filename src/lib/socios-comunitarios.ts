const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Email opcional: vacío es válido; si hay valor, exige formato básico. */
export function isOptionalEmailValid(
  email: string | null | undefined
): boolean {
  const trimmed = (email ?? '').trim();
  if (!trimmed) return true;
  return EMAIL_RE.test(trimmed);
}

export function socioComunitarioIsInUse(counts: {
  proyectos: number;
  participantes: number;
}): boolean {
  return counts.proyectos > 0 || counts.participantes > 0;
}

export function normalizeSocioComunitarioFields(input: {
  nombre: string;
  descripcion?: string | null;
  nombreContacto?: string | null;
  email?: string | null;
}): {
  nombre: string;
  descripcion: string | null;
  nombreContacto: string | null;
  email: string | null;
} {
  return {
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || null,
    nombreContacto: input.nombreContacto?.trim() || null,
    email: input.email?.trim() || null,
  };
}
