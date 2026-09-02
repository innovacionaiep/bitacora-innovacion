export type CatalogoConProyectos = {
  id: string;
  nombre: string;
  /** Nombres de proyectos que usan este ítem (catálogo y/o participantes). */
  proyectosNombres: string[];
};

type ProyectoNombreLink = { proyecto: { proyecto: string } };

type CatalogoRowWithProyectos = {
  id: string;
  nombre: string;
  proyectos: ProyectoNombreLink[];
  /** Usos vía participantes (p. ej. asignaturaId / carreraId). */
  proyectoParticipantes?: ProyectoNombreLink[];
};

function uniqueSortedNames(names: string[]): string[] {
  const set = new Set(
    names.map((n) => n.trim()).filter((n) => n.length > 0)
  );
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Normaliza filas de catálogo + joins a ítems con nombres de proyecto. */
export function mapCatalogoConProyectos(
  rows: CatalogoRowWithProyectos[]
): CatalogoConProyectos[] {
  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    proyectosNombres: uniqueSortedNames([
      ...row.proyectos.map((pc) => pc.proyecto.proyecto),
      ...(row.proyectoParticipantes ?? []).map((pp) => pp.proyecto.proyecto),
    ]),
  }));
}
