import type { VitrinaProjectCatalogs } from '@/lib/actions/vitrina-proyectos';
import {
  namesToCatalogSelection,
  type VitrinaProyecto,
} from '@/lib/vitrina-proyectos';

/** Igual que MULTI_VALUE_SEP en MultiSelectNombres. */
export const VITRINA_TABLE_NAMES_SEP = ' | ';

export type VitrinaTableCatalogField =
  | 'fondos'
  | 'lineas'
  | 'sedes'
  | 'escuelas'
  | 'socios'
  | 'etiquetas';

export type VitrinaTableRow = {
  id: string;
  nombre: string;
  fondos: string[];
  lineas: string[];
  sedes: string[];
  escuelas: string[];
  etiquetas: string[];
  socios: string[];
  encargadoNombre: string;
  encargadoCorreo: string;
  encargadoCargo: string;
  videoUrl: string;
};

export function vitrinaTableRowFromProyecto(
  proyecto: VitrinaProyecto,
): VitrinaTableRow {
  return {
    id: proyecto.id,
    nombre: proyecto.nombre,
    fondos: proyecto.fondos,
    lineas: proyecto.lineas,
    sedes: proyecto.sedes,
    escuelas: proyecto.escuelas,
    etiquetas: proyecto.etiquetas,
    socios: proyecto.socios,
    encargadoNombre: proyecto.encargadoNombre,
    encargadoCorreo: proyecto.encargadoCorreo,
    encargadoCargo: proyecto.encargadoCargo,
    videoUrl: proyecto.videoUrl,
  };
}

export function parseVitrinaTableNames(value: string): string[] {
  return value
    .split(VITRINA_TABLE_NAMES_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function formatVitrinaTableNames(names: string[]): string {
  return names.join(VITRINA_TABLE_NAMES_SEP);
}

export function applyVitrinaTableCatalog(
  draft: VitrinaProyecto,
  field: VitrinaTableCatalogField,
  value: string,
  catalogs: VitrinaProjectCatalogs,
): VitrinaProyecto {
  const options =
    field === 'fondos'
      ? catalogs.fondos
      : field === 'lineas'
        ? catalogs.lineas
        : field === 'sedes'
          ? catalogs.sedes
          : field === 'escuelas'
            ? catalogs.escuelas
            : field === 'socios'
              ? catalogs.socios
              : catalogs.etiquetas;
  const selected = namesToCatalogSelection(
    parseVitrinaTableNames(value),
    options,
  );

  if (field === 'fondos') {
    const nextLineas = namesToCatalogSelection(
      catalogs.lineas
        .filter(
          (linea) =>
            draft.lineaIds.includes(linea.id) &&
            selected.ids.includes(linea.fondoId),
        )
        .map((linea) => linea.nombre),
      catalogs.lineas,
    );
    return {
      ...draft,
      fondoIds: selected.ids,
      fondos: selected.names,
      lineaIds: nextLineas.ids,
      lineas: nextLineas.names,
    };
  }
  if (field === 'lineas') {
    return { ...draft, lineaIds: selected.ids, lineas: selected.names };
  }
  if (field === 'sedes') {
    return { ...draft, sedeIds: selected.ids, sedes: selected.names };
  }
  if (field === 'escuelas') {
    return { ...draft, escuelaIds: selected.ids, escuelas: selected.names };
  }
  if (field === 'etiquetas') {
    return { ...draft, etiquetaIds: selected.ids, etiquetas: selected.names };
  }
  return { ...draft, socioIds: selected.ids, socios: selected.names };
}
