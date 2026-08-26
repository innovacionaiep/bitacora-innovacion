/** Roles canónicos de participación en proyecto (tab Participantes / Fondos). */
export const FONDO_PARTICIPANTE_ROLES = [
  'Encargado',
  'Coordinador',
  'Colaborador',
  'Docente',
  'Estudiante',
  'Beneficiario',
] as const;

export type FondoParticipanteRol = (typeof FONDO_PARTICIPANTE_ROLES)[number];

export type FondoParticipanteRaw = {
  proyectoId: string;
  rol: string;
  nombre: string | null;
  email: string | null;
  cargo: string | null;
  proyecto: { proyecto: string };
  user: { name: string | null; email: string | null } | null;
};

export type FondoParticipanteListadoRow = {
  proyecto: string;
  nombre: string;
  rol: string;
  cargo: string;
  email: string;
};

export type FondoParticipantePorRol = {
  rol: FondoParticipanteRol;
  count: number;
};

export type FondoParticipantesResumen = {
  porRol: FondoParticipantePorRol[];
  total: number;
  listado: FondoParticipanteListadoRow[];
};

function isCanonicalRol(rol: string): rol is FondoParticipanteRol {
  return (FONDO_PARTICIPANTE_ROLES as readonly string[]).includes(rol);
}

export function mapParticipanteToListadoRow(
  p: FondoParticipanteRaw
): FondoParticipanteListadoRow {
  const nombre =
    p.user?.name?.trim() || p.nombre?.trim() || 'Sin nombre';
  const email = p.user?.email?.trim() || p.email?.trim() || '—';
  const cargo = p.cargo?.trim() || '—';
  return {
    proyecto: p.proyecto.proyecto,
    nombre,
    rol: p.rol,
    cargo,
    email,
  };
}

/**
 * Agrega participantes del fondo: conteo por rol canónico (1 por participación)
 * y listado ordenado por proyecto + nombre. Roles desconocidos se omiten.
 */
export function aggregateFondoParticipantes(
  rows: FondoParticipanteRaw[]
): FondoParticipantesResumen {
  const counts = Object.fromEntries(
    FONDO_PARTICIPANTE_ROLES.map((rol) => [rol, 0])
  ) as Record<FondoParticipanteRol, number>;

  const listado: FondoParticipanteListadoRow[] = [];

  for (const row of rows) {
    if (!isCanonicalRol(row.rol)) continue;
    counts[row.rol] += 1;
    listado.push(mapParticipanteToListadoRow(row));
  }

  listado.sort((a, b) => {
    const byProyecto = a.proyecto.localeCompare(b.proyecto, 'es', {
      sensitivity: 'base',
    });
    if (byProyecto !== 0) return byProyecto;
    return a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
  });

  const porRol: FondoParticipantePorRol[] = FONDO_PARTICIPANTE_ROLES.map(
    (rol) => ({
      rol,
      count: counts[rol],
    })
  );

  return {
    porRol,
    total: listado.length,
    listado,
  };
}

/** Cabeceras del Excel del modal Participantes (Fondos). */
export const FONDO_PARTICIPANTES_EXCEL_HEADERS = [
  'Proyecto',
  'Nombre participante',
  'Rol',
  'Cargo',
  'Correo',
] as const;

/** Filas AOA (headers + datos) para exportar el listado del modal. */
export function buildFondoParticipantesExcelAoa(
  listado: FondoParticipanteListadoRow[]
): (string | number)[][] {
  return [
    [...FONDO_PARTICIPANTES_EXCEL_HEADERS],
    ...listado.map((row) => [
      row.proyecto,
      row.nombre,
      row.rol,
      row.cargo,
      row.email,
    ]),
  ];
}

/** Nombre de archivo seguro: participantes_<fondo>.xlsx */
export function fondoParticipantesExcelFilename(fondoNombre: string): string {
  const safe = (fondoNombre || 'fondo')
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .slice(0, 50)
    .replace(/\s+/g, '_');
  return `participantes_${safe || 'fondo'}.xlsx`;
}
