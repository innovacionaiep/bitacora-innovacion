import { portalAvancesColumnsForFondo } from '@/lib/portal-avances-columns';
import type {
  PortalAvancesFondo,
  PortalAvancesProyecto,
} from '@/lib/portal-avances';

export type VitrinaAvancesParticipanteTotals = {
  estudiantes: number;
  docentes: number;
  beneficiarios: number;
};

export function portalAvancesFondoHasColumn(
  fondoNombre: string,
  columnId: 'carreras' | 'asignaturas' | 'estudiantes',
): boolean {
  return portalAvancesColumnsForFondo(fondoNombre).some(
    (column) => column.id === columnId,
  );
}

export function portalAvancesFondoHasParticipanteCounts(
  fondoNombre: string,
): boolean {
  const ids = new Set(
    portalAvancesColumnsForFondo(fondoNombre).map((column) => column.id),
  );
  return (
    ids.has('estudiantes') && ids.has('docentes') && ids.has('beneficiarios')
  );
}

function foldFondoNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function allowedPortalAvancesAnalisisFondos(
  enabledFondos: readonly PortalAvancesFondo[],
  selectedFondoNombres: readonly string[] = [],
  columnId?: 'carreras' | 'asignaturas',
): Set<string> {
  let allowed = enabledFondos
    .filter((fondo) => fondo.source !== 'external')
    .map((fondo) => fondo.nombre)
    .filter((nombre) =>
      columnId
        ? portalAvancesFondoHasColumn(nombre, columnId)
        : portalAvancesFondoHasParticipanteCounts(nombre),
    );

  const selected = selectedFondoNombres.map(foldFondoNombre).filter(Boolean);
  if (selected.length > 0) {
    const selectedSet = new Set(selected);
    allowed = allowed.filter((nombre) =>
      selectedSet.has(foldFondoNombre(nombre)),
    );
  }
  return new Set(allowed);
}

export function sumVitrinaAvancesParticipantes(
  proyectos: PortalAvancesProyecto[],
  enabledFondos: readonly PortalAvancesFondo[],
  selectedFondoNombres: readonly string[] = [],
): VitrinaAvancesParticipanteTotals {
  const allowedSet = allowedPortalAvancesAnalisisFondos(
    enabledFondos,
    selectedFondoNombres,
  );
  const totals: VitrinaAvancesParticipanteTotals = {
    estudiantes: 0,
    docentes: 0,
    beneficiarios: 0,
  };
  for (const proyecto of proyectos) {
    if (!allowedSet.has(proyecto.fondo)) continue;
    totals.estudiantes += proyecto.estudiantes ?? 0;
    totals.docentes += proyecto.docentes ?? 0;
    totals.beneficiarios += proyecto.beneficiarios ?? 0;
  }
  return totals;
}
