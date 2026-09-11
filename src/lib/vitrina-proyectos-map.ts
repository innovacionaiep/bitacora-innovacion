import type { VitrinaProyecto, VitrinaProyectoFoto } from '@/lib/vitrina-proyectos';
import {
  VITRINA_COVER_OFFSET_DEFAULT,
  VITRINA_COVER_ZOOM_DEFAULT,
  VITRINA_DESCRIPCION_FONT_DEFAULT,
  clampCoverOffset,
  clampCoverZoom,
  clampDescripcionFontSize,
} from '@/lib/vitrina-proyectos';
import { parseIgipScoreFields } from '@/lib/vitrina-igip-scores';

type NamedRef = { id: string; nombre: string };

export type VitrinaProyectoDbRow = {
  id: string;
  nombre: string;
  descripcion: string;
  encargadoNombre: string;
  encargadoCorreo: string;
  encargadoCargo: string;
  videoUrl: string | null;
  coverOffsetX: number;
  coverOffsetY: number;
  coverZoom: number;
  descripcionFontSize: number;
  igipInicial: unknown;
  igipInicialComentario: string;
  igipProyeccion: unknown;
  igipFinal: unknown;
  igipFinalComentario: string;
  igipInicialOriginalidad?: number | null;
  igipInicialEstadoDelArte?: number | null;
  igipInicialContribucionSocial?: number | null;
  igipInicialContribucionConocimiento?: number | null;
  igipInicialPotencialExpansion?: number | null;
  igipInicialTransferenciaTecnologica?: number | null;
  igipProyeccionOriginalidad?: number | null;
  igipProyeccionEstadoDelArte?: number | null;
  igipProyeccionContribucionSocial?: number | null;
  igipProyeccionContribucionConocimiento?: number | null;
  igipProyeccionPotencialExpansion?: number | null;
  igipProyeccionTransferenciaTecnologica?: number | null;
  igipFinalOriginalidad?: number | null;
  igipFinalEstadoDelArte?: number | null;
  igipFinalContribucionSocial?: number | null;
  igipFinalContribucionConocimiento?: number | null;
  igipFinalPotencialExpansion?: number | null;
  igipFinalTransferenciaTecnologica?: number | null;
  trlInicial: number | null;
  trlInicialComentario: string;
  trlProyeccion: number | null;
  trlFinal: number | null;
  trlFinalComentario: string;
  fotos: Array<{ url: string; publicId: string; orden?: number }>;
  fondos: Array<{ fondo: NamedRef }>;
  lineas: Array<{ linea: NamedRef }>;
  sedes: Array<{ sede: NamedRef }>;
  escuelas: Array<{ escuela: NamedRef }>;
  socios: Array<{ socio: NamedRef }>;
  comunas: Array<{ comuna: NamedRef }>;
  etiquetas: Array<{ etiqueta: NamedRef }>;
};

export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') {
    const n = Number(String(value));
    return Number.isFinite(n) ? n : null;
  }
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function pairFrom(
  items: Array<{ id: string; nombre: string }>,
): { ids: string[]; names: string[] } {
  return {
    ids: items.map((item) => item.id),
    names: items.map((item) => item.nombre),
  };
}

export function mapVitrinaProyectoRow(row: VitrinaProyectoDbRow): VitrinaProyecto {
  const fondos = pairFrom(row.fondos.map((item) => item.fondo));
  const lineas = pairFrom(row.lineas.map((item) => item.linea));
  const sedes = pairFrom(row.sedes.map((item) => item.sede));
  const escuelas = pairFrom(row.escuelas.map((item) => item.escuela));
  const socios = pairFrom(row.socios.map((item) => item.socio));
  const comunas = pairFrom((row.comunas ?? []).map((item) => item.comuna));
  const etiquetas = pairFrom(row.etiquetas.map((item) => item.etiqueta));
  const fotos: VitrinaProyectoFoto[] = [...row.fotos]
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((foto) => ({ url: foto.url, publicId: foto.publicId }));

  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    fondoIds: fondos.ids,
    fondos: fondos.names,
    lineaIds: lineas.ids,
    lineas: lineas.names,
    sedeIds: sedes.ids,
    sedes: sedes.names,
    escuelaIds: escuelas.ids,
    escuelas: escuelas.names,
    socioIds: socios.ids,
    socios: socios.names,
    comunaIds: comunas.ids,
    comunas: comunas.names,
    encargadoNombre: row.encargadoNombre ?? '',
    encargadoCorreo: row.encargadoCorreo ?? '',
    encargadoCargo: row.encargadoCargo ?? '',
    etiquetaIds: etiquetas.ids,
    etiquetas: etiquetas.names,
    videoUrl: row.videoUrl ?? '',
    fotos,
    coverOffsetX: clampCoverOffset(row.coverOffsetX ?? VITRINA_COVER_OFFSET_DEFAULT),
    coverOffsetY: clampCoverOffset(row.coverOffsetY ?? VITRINA_COVER_OFFSET_DEFAULT),
    coverZoom: clampCoverZoom(row.coverZoom ?? VITRINA_COVER_ZOOM_DEFAULT),
    descripcionFontSize: clampDescripcionFontSize(
      row.descripcionFontSize ?? VITRINA_DESCRIPCION_FONT_DEFAULT,
    ),
    igipInicial: decimalToNumber(row.igipInicial),
    igipInicialComentario: row.igipInicialComentario ?? '',
    igipProyeccion: decimalToNumber(row.igipProyeccion),
    igipFinal: decimalToNumber(row.igipFinal),
    igipFinalComentario: row.igipFinalComentario ?? '',
    ...parseIgipScoreFields(row as unknown as Record<string, unknown>),
    trlInicial: row.trlInicial,
    trlInicialComentario: row.trlInicialComentario ?? '',
    trlProyeccion: row.trlProyeccion,
    trlFinal: row.trlFinal,
    trlFinalComentario: row.trlFinalComentario ?? '',
  };
}
