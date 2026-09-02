export type CarreraConProyectos = {
  id: string;
  nombre: string;
  /** Nombres de proyectos (tab General) que tienen esta carrera seleccionada. */
  proyectosNombres: string[];
};

type CarreraRowWithProyectos = {
  id: string;
  nombre: string;
  proyectos: Array<{ proyecto: { proyecto: string } }>;
};

function uniqueSortedNames(names: string[]): string[] {
  const set = new Set(
    names.map((n) => n.trim()).filter((n) => n.length > 0)
  );
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Normaliza filas de Carrera+ProyectoCarrera a catálogo con nombres de proyecto. */
export function mapCarrerasConProyectos(
  rows: CarreraRowWithProyectos[]
): CarreraConProyectos[] {
  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    proyectosNombres: uniqueSortedNames(
      row.proyectos.map((pc) => pc.proyecto.proyecto)
    ),
  }));
}
