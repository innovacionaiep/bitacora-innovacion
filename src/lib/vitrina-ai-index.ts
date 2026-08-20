import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import {
  mergeVitrinaFilterNames,
  uniqueVitrinaFilterOptions,
  type VitrinaProjectFilters,
} from '@/lib/vitrina-project-filters';

export type VitrinaAiIndexItem = {
  id: string;
  nombre: string;
  descripcion: string;
  fondos: string[];
  lineas: string[];
  sedes: string[];
  escuelas: string[];
  socios: string[];
  etiquetas: string[];
  encargadoNombre: string;
  encargadoCargo: string;
};

export type VitrinaAiCatalogs = VitrinaProjectFilters & {
  lineas: string[];
  socios: string[];
};

export type VitrinaAiSearchHit = {
  id: string;
  nombre: string;
  score: number;
  matched: string[];
};

const STOPWORDS = new Set([
  'a',
  'al',
  'ahora',
  'busco',
  'con',
  'de',
  'del',
  'el',
  'en',
  'incluye',
  'la',
  'las',
  'los',
  'mostrar',
  'necesito',
  'otro',
  'otra',
  'para',
  'por',
  'proyecto',
  'proyectos',
  'que',
  'quiero',
  'sea',
  'un',
  'una',
  'unas',
  'unos',
  'ver',
  'y',
]);

export function foldVitrinaText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function tokenizeVitrinaQuery(query: string): string[] {
  const folded = foldVitrinaText(query);
  const tokens = folded.split(/[^a-z0-9]+/).filter(Boolean);
  const meaningful = tokens.filter((token) => !STOPWORDS.has(token));
  return meaningful.length > 0 ? [...new Set(meaningful)] : [...new Set(tokens)];
}

function tokenMatchesWord(token: string, word: string): boolean {
  if (!token || !word) return false;
  if (token === word) return true;
  if (token.length >= 4 && word.startsWith(token)) return true;
  if (word.length >= 4 && token.startsWith(word)) return true;
  return false;
}

function haystackMatchesToken(haystack: string, token: string): boolean {
  const words = haystack.split(/[^a-z0-9]+/).filter(Boolean);
  return words.some((word) => tokenMatchesWord(token, word));
}

export function buildVitrinaAiIndex(
  proyectos: VitrinaProyecto[],
): VitrinaAiIndexItem[] {
  return proyectos.map((proyecto) => ({
    id: proyecto.id,
    nombre: proyecto.nombre,
    descripcion: proyecto.descripcion,
    fondos: proyecto.fondos,
    lineas: proyecto.lineas,
    sedes: proyecto.sedes,
    escuelas: proyecto.escuelas,
    socios: proyecto.socios,
    etiquetas: proyecto.etiquetas,
    encargadoNombre: proyecto.encargadoNombre,
    encargadoCargo: proyecto.encargadoCargo,
  }));
}

export function buildVitrinaAiCatalogs(
  filterCatalogs: VitrinaProjectFilters,
  proyectos: VitrinaProyecto[],
): VitrinaAiCatalogs {
  const facets = uniqueVitrinaFilterOptions(filterCatalogs, proyectos);
  return {
    ...facets,
    lineas: mergeVitrinaFilterNames(
      [],
      proyectos.flatMap((proyecto) => proyecto.lineas),
    ),
    socios: mergeVitrinaFilterNames(
      [],
      proyectos.flatMap((proyecto) => proyecto.socios),
    ),
  };
}

function fieldValues(item: VitrinaAiIndexItem): Record<string, string[]> {
  return {
    nombre: [item.nombre],
    descripcion: [item.descripcion],
    fondos: item.fondos,
    lineas: item.lineas,
    sedes: item.sedes,
    escuelas: item.escuelas,
    socios: item.socios,
    etiquetas: item.etiquetas,
    encargado: [item.encargadoNombre, item.encargadoCargo],
  };
}

export function searchVitrinaAiIndex(
  index: VitrinaAiIndexItem[],
  query: string,
): VitrinaAiSearchHit[] {
  const tokens = tokenizeVitrinaQuery(query);
  if (tokens.length === 0) return [];

  const hits: VitrinaAiSearchHit[] = [];
  for (const item of index) {
    const matched = new Set<string>();
    let score = 0;
    const fields = fieldValues(item);
    for (const [field, values] of Object.entries(fields)) {
      const haystack = foldVitrinaText(values.join(' '));
      if (!haystack) continue;
      for (const token of tokens) {
        if (haystackMatchesToken(haystack, token)) {
          score += field === 'nombre' ? 3 : 1;
          matched.add(field);
        }
      }
    }
    if (score > 0) {
      hits.push({
        id: item.id,
        nombre: item.nombre,
        score,
        matched: [...matched],
      });
    }
  }

  return hits.sort((a, b) => b.score - a.score || a.nombre.localeCompare(b.nombre, 'es'));
}

export function resolveCatalogValues(
  input: string[] | undefined,
  catalog: string[],
): string[] {
  if (!input || input.length === 0) return [];
  const foldedCatalog = catalog.map((name) => ({
    name,
    fold: foldVitrinaText(name),
  }));
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (name: string) => {
    if (seen.has(name)) return;
    seen.add(name);
    out.push(name);
  };

  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const folded = foldVitrinaText(raw);
    if (!folded) continue;

    const exact = foldedCatalog.find((item) => item.fold === folded);
    if (exact) {
      push(exact.name);
      continue;
    }

    if (folded.length < 4) continue;
    const fuzzy = foldedCatalog.filter(
      (item) =>
        item.fold.split(/[^a-z0-9]+/).some((word) => tokenMatchesWord(folded, word)) ||
        item.fold.includes(folded),
    );
    for (const item of fuzzy) push(item.name);
  }
  return out;
}
