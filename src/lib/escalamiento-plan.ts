export const ESCALAMIENTO_ESTADOS = [
  'Pendiente',
  'En proceso',
  'Realizado',
] as const;

export type EscalamientoEstado = (typeof ESCALAMIENTO_ESTADOS)[number];

export type EscalamientoNumero = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type EscalamientoFilaEditable = {
  responsable: string;
  apoyoRequerido: string;
  fechaInicio: string | null;
  fechaCompromiso: string | null;
  evidencia: string;
  estado: EscalamientoEstado;
  avanceAcuerdos: string;
};

export type EscalamientoFilaStored = EscalamientoFilaEditable & {
  numero: EscalamientoNumero;
};

export type EscalamientoFila = EscalamientoFilaStored & {
  accionConcreta: string;
  propositoResultado: string;
};

export type EscalamientoFilaPatch = Partial<{
  responsable: string;
  apoyoRequerido: string;
  fechaInicio: string | null;
  fechaCompromiso: string | null;
  evidencia: string;
  estado: EscalamientoEstado;
  avanceAcuerdos: string;
}>;

type CatalogoItem = {
  numero: EscalamientoNumero;
  accionConcreta: string;
  propositoResultado: string;
  responsable: string;
  apoyoRequerido: string;
  evidencia: string;
};

const CATALOGO: readonly CatalogoItem[] = [
  {
    numero: 1,
    accionConcreta:
      'Sistematizar los resultados y aprendizajes de la ejecución',
    propositoResultado:
      'Definir qué funcionó, qué debe ajustarse y cuáles son los componentes esenciales para replicar el proyecto',
    responsable: 'Docente y Equipo',
    apoyoRequerido: 'Equipo Sede',
    evidencia: 'Informe de cierre del proyecto',
  },
  {
    numero: 2,
    accionConcreta:
      'Identificar al menos dos contextos potenciales de expansión',
    propositoResultado:
      'Priorizar asignaturas, carreras, sedes, escuelas o socios donde el proyecto podría implementarse',
    responsable: 'Docente y Equipo',
    apoyoRequerido: 'Equipo Sede',
    evidencia: 'Listado priorizado y criterios de selección',
  },
  {
    numero: 3,
    accionConcreta: 'Definir el escenario de escalamiento prioritario',
    propositoResultado:
      'Seleccionar dónde y cómo se realizará la siguiente implementación',
    responsable: '',
    apoyoRequerido: '',
    evidencia: 'Listado priorizado y criterios de selección',
  },
  {
    numero: 4,
    accionConcreta: 'Presentar el proyecto a las instancias potenciales',
    propositoResultado:
      'Validar interés y recoger requerimientos para una posible réplica',
    responsable: '',
    apoyoRequerido: '',
    evidencia: 'Presentaciones, correos y actas de reunión',
  },
  {
    numero: 5,
    accionConcreta: 'Estimar adaptaciones, recursos y costos',
    propositoResultado:
      'Determinar ajustes metodológicos, tecnológicos, operativos y presupuestarios',
    responsable: '',
    apoyoRequerido: '',
    evidencia: 'Presupuesto y matriz de adaptaciones',
  },
  {
    numero: 6,
    accionConcreta: 'Formalizar un compromiso de continuidad o expansión',
    propositoResultado:
      'Obtener interés concreto de al menos una unidad AIEP o socio',
    responsable: '',
    apoyoRequerido: '',
    evidencia: 'Carta, correo o acta de compromiso',
  },
  {
    numero: 7,
    accionConcreta: 'Programar el próximo hito de implementación',
    propositoResultado:
      'Dejar definida una acción, responsable y fecha para 2027',
    responsable: '',
    apoyoRequerido: '',
    evidencia: 'Cronograma o acuerdo de próximo hito',
  },
  {
    numero: 8,
    accionConcreta: 'Presentar resultados y ruta en el Demo Day',
    propositoResultado:
      'Validar la factibilidad del escalamiento y recibir retroalimentación',
    responsable: '',
    apoyoRequerido: '',
    evidencia: 'Presentación DEMO DAY',
  },
];

export const ESCALAMIENTO_FILA_CAMPO_LABELS: Record<
  keyof EscalamientoFilaEditable,
  string
> = {
  responsable: 'Responsable',
  apoyoRequerido: 'Apoyo requerido',
  fechaInicio: 'Fecha inicio',
  fechaCompromiso: 'Fecha compromiso',
  evidencia: 'Evidencia',
  estado: 'Estado',
  avanceAcuerdos: 'Avance / acuerdos',
};

export function isEscalamientoEstado(
  value: unknown
): value is EscalamientoEstado {
  return (
    typeof value === 'string' &&
    (ESCALAMIENTO_ESTADOS as readonly string[]).includes(value)
  );
}

export function isEscalamientoNumero(value: unknown): value is EscalamientoNumero {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 8
  );
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [ys, ms, ds] = value.split('-');
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function filaFromCatalog(item: CatalogoItem): EscalamientoFila {
  return {
    numero: item.numero,
    accionConcreta: item.accionConcreta,
    propositoResultado: item.propositoResultado,
    responsable: item.responsable,
    apoyoRequerido: item.apoyoRequerido,
    fechaInicio: null,
    fechaCompromiso: null,
    evidencia: item.evidencia,
    estado: 'Pendiente',
    avanceAcuerdos: '',
  };
}

export function buildDefaultPlanAccion(): EscalamientoFila[] {
  return CATALOGO.map(filaFromCatalog);
}

function asTrimmedString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

function asFecha(value: unknown): string | null | undefined {
  if (value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return isIsoDate(trimmed) ? trimmed : undefined;
}

function overlayEditable(
  base: EscalamientoFila,
  raw: Record<string, unknown>
): EscalamientoFila {
  const next: EscalamientoFila = { ...base };
  const responsable = asTrimmedString(raw.responsable);
  if (responsable !== undefined) next.responsable = responsable;
  const apoyo = asTrimmedString(raw.apoyoRequerido);
  if (apoyo !== undefined) next.apoyoRequerido = apoyo;
  const evidencia = asTrimmedString(raw.evidencia);
  if (evidencia !== undefined) next.evidencia = evidencia;
  const avance = asTrimmedString(raw.avanceAcuerdos);
  if (avance !== undefined) next.avanceAcuerdos = avance;
  if (isEscalamientoEstado(raw.estado)) next.estado = raw.estado;
  const fechaInicio = asFecha(raw.fechaInicio);
  if (fechaInicio !== undefined) next.fechaInicio = fechaInicio;
  const fechaCompromiso = asFecha(raw.fechaCompromiso);
  if (fechaCompromiso !== undefined) next.fechaCompromiso = fechaCompromiso;
  return next;
}

export function mergePlanAccion(stored: unknown): EscalamientoFila[] {
  const plan = buildDefaultPlanAccion();
  if (!Array.isArray(stored)) return plan;

  for (const item of stored) {
    if (!item || typeof item !== 'object') continue;
    const raw = item as Record<string, unknown>;
    if (!isEscalamientoNumero(raw.numero)) continue;
    plan[raw.numero - 1] = overlayEditable(plan[raw.numero - 1], raw);
  }
  return plan;
}

export function applyFilaPatch(
  filas: EscalamientoFila[],
  numero: number,
  patch: EscalamientoFilaPatch
): { ok: true; filas: EscalamientoFila[] } | { ok: false; error: string } {
  if (!isEscalamientoNumero(numero)) {
    return { ok: false, error: 'Número de acción inválido' };
  }
  if (patch.estado !== undefined && !isEscalamientoEstado(patch.estado)) {
    return { ok: false, error: 'Estado inválido' };
  }
  if (
    patch.fechaInicio !== undefined &&
    patch.fechaInicio !== null &&
    patch.fechaInicio !== '' &&
    !isIsoDate(patch.fechaInicio)
  ) {
    return { ok: false, error: 'Fecha de inicio inválida' };
  }
  if (
    patch.fechaCompromiso !== undefined &&
    patch.fechaCompromiso !== null &&
    patch.fechaCompromiso !== '' &&
    !isIsoDate(patch.fechaCompromiso)
  ) {
    return { ok: false, error: 'Fecha de compromiso inválida' };
  }

  const next = filas.map((fila) => ({ ...fila }));
  const target = next[numero - 1];
  const overlay: Record<string, unknown> = { ...patch };
  next[numero - 1] = overlayEditable(target, overlay);
  return { ok: true, filas: next };
}

export function serializePlanAccion(
  filas: EscalamientoFila[]
): EscalamientoFilaStored[] {
  return filas.map((fila) => ({
    numero: fila.numero,
    responsable: fila.responsable,
    apoyoRequerido: fila.apoyoRequerido,
    fechaInicio: fila.fechaInicio,
    fechaCompromiso: fila.fechaCompromiso,
    evidencia: fila.evidencia,
    estado: fila.estado,
    avanceAcuerdos: fila.avanceAcuerdos,
  }));
}

export function describeFilaCambio(
  numero: EscalamientoNumero,
  patch: EscalamientoFilaPatch
): { elemento: string; cambio: string } {
  const keys = Object.keys(patch) as (keyof EscalamientoFilaPatch)[];
  const first = keys[0];
  const label = first
    ? ESCALAMIENTO_FILA_CAMPO_LABELS[first]
    : 'Plan de acción';
  const raw = first ? patch[first] : '';
  const value =
    raw === null || raw === undefined || raw === ''
      ? 'contenido vaciado'
      : String(raw);
  const truncated =
    value.length > 120 ? `${value.slice(0, 120)}…` : value;
  return {
    elemento: `Acción ${numero} — ${label}`,
    cambio: truncated,
  };
}
