type LabeledValue = {
  label: string;
  before: string | null | undefined;
  after: string | null | undefined;
};

function norm(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function display(value: string | null | undefined, max = 80): string {
  const t = norm(value);
  if (!t) return '—';
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function joinLabeledDiffs(fields: LabeledValue[]): string {
  const parts: string[] = [];
  for (const field of fields) {
    if (norm(field.before) === norm(field.after)) continue;
    parts.push(
      `${field.label}: ${display(field.before)} → ${display(field.after)}`
    );
  }
  return parts.join('; ');
}

export function formatFechaSeguimiento(
  value: Date | string | null | undefined
): string | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}-${d.getFullYear()}`;
}

export function compromisoElementoHistorial(
  titulo: string | null | undefined,
  descripcion: string | null | undefined
): string {
  const text = titulo?.trim() || descripcion?.trim() || 'Compromiso';
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function buildCompromisoCambioGenerado(input: {
  before: {
    titulo: string | null;
    descripcion: string | null;
    fechaLimite: Date | string | null;
  };
  after: {
    titulo: string | null;
    descripcion: string | null;
    fechaLimite: Date | string | null;
  };
}): string {
  return joinLabeledDiffs([
    { label: 'Título', before: input.before.titulo, after: input.after.titulo },
    {
      label: 'Descripción',
      before: input.before.descripcion,
      after: input.after.descripcion,
    },
    {
      label: 'Fecha límite',
      before: formatFechaSeguimiento(input.before.fechaLimite),
      after: formatFechaSeguimiento(input.after.fechaLimite),
    },
  ]);
}

export function buildReunionCambioGenerado(input: {
  before: { numero: number; fecha: Date | string; resumen: string };
  after: { numero: number; fecha: Date | string; resumen: string };
}): string {
  return joinLabeledDiffs([
    {
      label: 'Número',
      before: String(input.before.numero),
      after: String(input.after.numero),
    },
    {
      label: 'Fecha',
      before: formatFechaSeguimiento(input.before.fecha),
      after: formatFechaSeguimiento(input.after.fecha),
    },
    {
      label: 'Resumen',
      before: input.before.resumen,
      after: input.after.resumen,
    },
  ]);
}
