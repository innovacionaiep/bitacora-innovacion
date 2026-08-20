import { parseVideoUrl } from '@/lib/video-url';

export const VITRINA_PROYECTOS_SETTING_KEY = 'vitrina_proyectos';
export const VITRINA_PROYECTOS_MAX = 24;
export const VITRINA_PROYECTOS_MAX_FOTOS = 4;
export const VITRINA_COVER_OFFSET_DEFAULT = 50;
export const VITRINA_COVER_ZOOM_DEFAULT = 1;
export const VITRINA_COVER_ZOOM_MIN = 1;
export const VITRINA_COVER_ZOOM_MAX = 3;
export const VITRINA_DESCRIPCION_FONT_DEFAULT = 15;
export const VITRINA_DESCRIPCION_FONT_MIN = 12;
export const VITRINA_DESCRIPCION_FONT_MAX = 28;

export type VitrinaCatalogOption = { id: string; nombre: string };

export type VitrinaProyectoFoto = {
  url: string;
  publicId: string;
};

export type VitrinaProyecto = {
  id: string;
  nombre: string;
  descripcion: string;
  fondoIds: string[];
  fondos: string[];
  lineaIds: string[];
  lineas: string[];
  sedeIds: string[];
  sedes: string[];
  escuelaIds: string[];
  escuelas: string[];
  socioIds: string[];
  socios: string[];
  encargadoNombre: string;
  encargadoCorreo: string;
  encargadoCargo: string;
  etiquetaIds: string[];
  etiquetas: string[];
  videoUrl: string;
  fotos: VitrinaProyectoFoto[];
  /** 0 = recorte izquierda, 50 = centro, 100 = recorte derecha. */
  coverOffsetX: number;
  /** 0 = recorte arriba, 50 = centro, 100 = recorte abajo. */
  coverOffsetY: number;
  /** 1 = encuadre base, hasta 3 = zoom. */
  coverZoom: number;
  /** Tamaño de letra de la descripción en px, por proyecto. */
  descripcionFontSize: number;
};

export type NormalizeVitrinaProyectosResult =
  | { ok: true; proyectos: VitrinaProyecto[] }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `vp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function asFotos(value: unknown): VitrinaProyectoFoto[] {
  if (!Array.isArray(value)) return [];
  const fotos: VitrinaProyectoFoto[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as { url?: unknown; publicId?: unknown };
    const url = asString(rec.url);
    const publicId = asString(rec.publicId);
    if (!url || !publicId) continue;
    if (!/^https:\/\//i.test(url)) continue;
    fotos.push({ url, publicId });
    if (fotos.length >= VITRINA_PROYECTOS_MAX_FOTOS) break;
  }
  return fotos;
}

export function clampCoverOffset(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return VITRINA_COVER_OFFSET_DEFAULT;
  return Math.min(100, Math.max(0, Math.round(n)));
}

export const clampCoverOffsetY = clampCoverOffset;

export function clampCoverZoom(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return VITRINA_COVER_ZOOM_DEFAULT;
  const rounded = Math.round(n * 100) / 100;
  return Math.min(
    VITRINA_COVER_ZOOM_MAX,
    Math.max(VITRINA_COVER_ZOOM_MIN, rounded),
  );
}

export function clampDescripcionFontSize(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return VITRINA_DESCRIPCION_FONT_DEFAULT;
  return Math.min(
    VITRINA_DESCRIPCION_FONT_MAX,
    Math.max(VITRINA_DESCRIPCION_FONT_MIN, Math.round(n)),
  );
}

export function vitrinaCoverImageStyle(
  offsetX: number,
  offsetY: number,
  zoom: number,
): { objectPosition: string; transform: string; transformOrigin: string } {
  const x = clampCoverOffset(offsetX);
  const y = clampCoverOffset(offsetY);
  const z = clampCoverZoom(zoom);
  return {
    objectPosition: `${x}% ${y}%`,
    transform: `scale(${z})`,
    transformOrigin: `${x}% ${y}%`,
  };
}

export function namesToCatalogSelection(
  names: string[],
  options: VitrinaCatalogOption[],
): { ids: string[]; names: string[] } {
  const byName = new Map(
    options.map((o) => [o.nombre.trim().toLowerCase(), o]),
  );
  const ids: string[] = [];
  const frozen: string[] = [];
  const seen = new Set<string>();
  for (const raw of names) {
    const key = raw.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    const opt = byName.get(key);
    if (!opt) continue;
    seen.add(key);
    ids.push(opt.id);
    frozen.push(opt.nombre);
  }
  return { ids, names: frozen };
}

/** Actualiza el nombre denormalizado de un socio en fichas de vitrina. */
export function applySocioNombreToVitrinaProyectos(
  proyectos: VitrinaProyecto[],
  socioId: string,
  nuevoNombre: string,
): { proyectos: VitrinaProyecto[]; changed: boolean } {
  const id = socioId.trim();
  const nombre = nuevoNombre.trim();
  if (!id || !nombre) {
    return { proyectos, changed: false };
  }
  let changed = false;
  const next = proyectos.map((p) => {
    if (!p.socioIds.includes(id)) return p;
    const socios = p.socioIds.map((sid, i) =>
      sid === id ? nombre : (p.socios[i] ?? ''),
    );
    const same =
      socios.length === p.socios.length &&
      socios.every((n, i) => n === p.socios[i]);
    if (same) return p;
    changed = true;
    return { ...p, socios };
  });
  return { proyectos: next, changed };
}

/** Prefiere ids del catálogo; si no hay, resuelve por nombre. */
export function freezeCatalogPair(
  ids: string[],
  names: string[],
  options: VitrinaCatalogOption[],
): { ids: string[]; names: string[] } {
  if (ids.length > 0) {
    const byId = new Map(options.map((o) => [o.id, o]));
    const outIds: string[] = [];
    const outNames: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (!id || seen.has(id)) continue;
      const opt = byId.get(id);
      if (!opt) continue;
      seen.add(id);
      outIds.push(opt.id);
      outNames.push(opt.nombre);
    }
    return { ids: outIds, names: outNames };
  }
  return namesToCatalogSelection(names, options);
}

function pairIdsAndNames(
  idsRaw: unknown,
  namesRaw: unknown,
): { ids: string[]; names: string[] } {
  return {
    ids: asStringArray(idsRaw),
    names: asStringArray(namesRaw),
  };
}

function validateOptionalVideo(url: string, index: number): string | null {
  if (!url) return null;
  const parsed = parseVideoUrl(url);
  if (!parsed) {
    return `El video del proyecto ${index + 1} debe ser un enlace de YouTube, Vimeo o SharePoint`;
  }
  if (
    parsed.provider !== 'youtube' &&
    parsed.provider !== 'vimeo' &&
    parsed.provider !== 'sharepoint'
  ) {
    return `El video del proyecto ${index + 1} debe ser un enlace de YouTube, Vimeo o SharePoint`;
  }
  return null;
}

function emptyProyecto(id?: string): VitrinaProyecto {
  return {
    id: id || newId(),
    nombre: '',
    descripcion: '',
    fondoIds: [],
    fondos: [],
    lineaIds: [],
    lineas: [],
    sedeIds: [],
    sedes: [],
    escuelaIds: [],
    escuelas: [],
    socioIds: [],
    socios: [],
    encargadoNombre: '',
    encargadoCorreo: '',
    encargadoCargo: '',
    etiquetaIds: [],
    etiquetas: [],
    videoUrl: '',
    fotos: [],
    coverOffsetX: VITRINA_COVER_OFFSET_DEFAULT,
    coverOffsetY: VITRINA_COVER_OFFSET_DEFAULT,
    coverZoom: VITRINA_COVER_ZOOM_DEFAULT,
    descripcionFontSize: VITRINA_DESCRIPCION_FONT_DEFAULT,
  };
}

export function createEmptyVitrinaProyecto(): VitrinaProyecto {
  return emptyProyecto();
}

/**
 * Acepta lista de objetos de marketing. Omite filas sin nombre.
 * Congela nombres de catálogo tal como vienen (el editor resuelve ids+nombres).
 */
export function normalizeVitrinaProyectos(
  input: unknown,
): NormalizeVitrinaProyectosResult {
  if (!Array.isArray(input)) {
    return { ok: false, error: 'La lista de proyectos no es válida' };
  }
  if (input.length > VITRINA_PROYECTOS_MAX) {
    return {
      ok: false,
      error: `Máximo ${VITRINA_PROYECTOS_MAX} proyectos`,
    };
  }

  const proyectos: VitrinaProyecto[] = [];

  for (let i = 0; i < input.length; i++) {
    const item = input[i];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `El proyecto ${i + 1} no es válido` };
    }
    const rec = item as Record<string, unknown>;
    const nombre = asString(rec.nombre);
    if (!nombre) continue;

    const encargadoCorreo = asString(rec.encargadoCorreo);
    if (encargadoCorreo && !EMAIL_RE.test(encargadoCorreo)) {
      return {
        ok: false,
        error: `El correo del encargado del proyecto ${i + 1} no es válido`,
      };
    }

    const videoUrl = asString(rec.videoUrl);
    const videoError = validateOptionalVideo(videoUrl, i);
    if (videoError) return { ok: false, error: videoError };

    const fondos = pairIdsAndNames(rec.fondoIds, rec.fondos);
    const lineas = pairIdsAndNames(rec.lineaIds, rec.lineas);
    const sedes = pairIdsAndNames(rec.sedeIds, rec.sedes);
    const escuelas = pairIdsAndNames(rec.escuelaIds, rec.escuelas);
    const socios = pairIdsAndNames(rec.socioIds, rec.socios);
    const etiquetas = pairIdsAndNames(rec.etiquetaIds, rec.etiquetas);

    const existingId = asString(rec.id);

    proyectos.push({
      id: existingId || newId(),
      nombre,
      descripcion: asString(rec.descripcion),
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
      encargadoNombre: asString(rec.encargadoNombre),
      encargadoCorreo,
      encargadoCargo: asString(rec.encargadoCargo),
      etiquetaIds: etiquetas.ids,
      etiquetas: etiquetas.names,
      videoUrl,
      fotos: asFotos(rec.fotos),
      coverOffsetX: clampCoverOffset(rec.coverOffsetX),
      coverOffsetY: clampCoverOffset(rec.coverOffsetY),
      coverZoom: clampCoverZoom(rec.coverZoom),
      descripcionFontSize: clampDescripcionFontSize(rec.descripcionFontSize),
    });
  }

  if (proyectos.length > VITRINA_PROYECTOS_MAX) {
    return {
      ok: false,
      error: `Máximo ${VITRINA_PROYECTOS_MAX} proyectos`,
    };
  }

  return { ok: true, proyectos };
}

export function parseStoredVitrinaProyectos(
  value: string | null | undefined,
): VitrinaProyecto[] | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    const result = normalizeVitrinaProyectos(parsed);
    return result.ok ? result.proyectos : null;
  } catch {
    return null;
  }
}

export function upsertVitrinaProyectoInList(
  list: VitrinaProyecto[],
  input: unknown,
): NormalizeVitrinaProyectosResult {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'El proyecto no es válido' };
  }
  const rec = input as Record<string, unknown>;
  if (!asString(rec.nombre)) {
    return { ok: false, error: 'El nombre es obligatorio' };
  }

  const normalized = normalizeVitrinaProyectos([input]);
  if (!normalized.ok) return normalized;
  const proyecto = normalized.proyectos[0];
  if (!proyecto) {
    return { ok: false, error: 'El nombre es obligatorio' };
  }

  const index = list.findIndex((p) => p.id === proyecto.id);
  if (index >= 0) {
    const next = [...list];
    next[index] = proyecto;
    return { ok: true, proyectos: next };
  }

  if (list.length >= VITRINA_PROYECTOS_MAX) {
    return {
      ok: false,
      error: `Máximo ${VITRINA_PROYECTOS_MAX} proyectos`,
    };
  }

  return { ok: true, proyectos: [...list, proyecto] };
}

export function removeVitrinaProyectoFromList(
  list: VitrinaProyecto[],
  id: string,
): NormalizeVitrinaProyectosResult {
  const trimmed = asString(id);
  if (!trimmed) {
    return { ok: false, error: 'Proyecto no válido' };
  }
  if (!list.some((p) => p.id === trimmed)) {
    return { ok: false, error: 'Proyecto no encontrado' };
  }
  return { ok: true, proyectos: list.filter((p) => p.id !== trimmed) };
}
