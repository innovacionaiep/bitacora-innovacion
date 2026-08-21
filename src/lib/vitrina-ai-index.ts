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

export type VitrinaAiFacetConstraints = {
  fondos: string[];
  sedes: string[];
  escuelas: string[];
  etiquetas: string[];
  lineas: string[];
  socios: string[];
};

export const EMPTY_VITRINA_FACET_CONSTRAINTS: VitrinaAiFacetConstraints = {
  fondos: [],
  sedes: [],
  escuelas: [],
  etiquetas: [],
  lineas: [],
  socios: [],
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
  'algun',
  'alguna',
  'algunas',
  'alguno',
  'algunos',
  'busco',
  'con',
  'cuantas',
  'cuantos',
  'curso',
  'de',
  'del',
  'el',
  'en',
  'es',
  'esos',
  'esas',
  'estos',
  'estas',
  'hay',
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
  'son',
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

const TOPIC_FILLERS = new Set([
  'aborda',
  'abordar',
  'abordan',
  'acerca',
  'como',
  'cual',
  'cuales',
  'dice',
  'dicen',
  'forma',
  'hace',
  'hacen',
  'hacer',
  'manera',
  'menciona',
  'mencionan',
  'relacionada',
  'relacionadas',
  'relacionado',
  'relacionados',
  'si',
  'sobre',
  'tema',
  'trabaja',
  'trabajan',
  'trabajar',
  'vinculada',
  'vinculado',
]);

const TOKEN_ALIASES: Record<string, string[]> = {
  abeja: ['abeja', 'abejas', 'apicola', 'apicolas', 'apicultura'],
  abejas: ['abeja', 'abejas', 'apicola', 'apicolas', 'apicultura'],
  apicola: ['abeja', 'abejas', 'apicola', 'apicolas', 'apicultura'],
  apicolas: ['abeja', 'abejas', 'apicola', 'apicolas', 'apicultura'],
  apicultura: ['abeja', 'abejas', 'apicola', 'apicolas', 'apicultura'],
};

function aliasesForToken(token: string): string[] {
  return TOKEN_ALIASES[token] ?? [token];
}

export function tokenizeVitrinaQuery(query: string): string[] {
  const folded = foldVitrinaText(query);
  const tokens = folded.split(/[^a-z0-9]+/).filter(Boolean);
  const meaningful = tokens.filter((token) => !STOPWORDS.has(token));
  return meaningful.length > 0 ? [...new Set(meaningful)] : [...new Set(tokens)];
}

function tokenizeTopicQuery(query: string): string[] {
  return tokenizeVitrinaQuery(query).filter((token) => !TOPIC_FILLERS.has(token));
}

function sharedPrefixLength(left: string, right: string): number {
  const max = Math.min(left.length, right.length);
  let i = 0;
  while (i < max && left[i] === right[i]) i += 1;
  return i;
}

function tokenMatchesWord(token: string, word: string): boolean {
  if (!token || !word) return false;
  if (token === word) return true;
  if (token.length >= 4 && word.startsWith(token)) return true;
  if (word.length >= 4 && token.startsWith(word)) return true;
  if (token.length >= 6 && word.length >= 6 && sharedPrefixLength(token, word) >= 6) {
    return true;
  }
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

export function summarizeVitrinaAiFacets(index: VitrinaAiIndexItem[]): string {
  const fields: Array<[string, (item: VitrinaAiIndexItem) => string[]]> = [
    ['fondos', (item) => item.fondos],
    ['lineas', (item) => item.lineas],
    ['sedes', (item) => item.sedes],
    ['escuelas', (item) => item.escuelas],
    ['socios', (item) => item.socios],
    ['etiquetas', (item) => item.etiquetas],
  ];
  const parts = fields.map(([label, getValues]) => {
    const counts = new Map<string, number>();
    for (const item of index) {
      for (const value of getValues(item)) {
        const name = value.trim();
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    if (counts.size === 0) return `${label}: —`;
    const listed = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'))
      .map(([name, n]) => `${name} (${n})`)
      .join(', ');
    return `${label}: ${listed}`;
  });
  return `Recuentos:\n${parts.join('\n')}`;
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

export type VitrinaAiSearchScope = 'all' | 'description' | 'topic';

const FACET_WORD_STOP = new Set([
  'fondo',
  'fondos',
  'sede',
  'sedes',
  'escuela',
  'escuelas',
  'etiqueta',
  'etiquetas',
  'linea',
  'lineas',
  'socio',
  'socios',
]);

const FACET_KEYS: Array<keyof VitrinaAiFacetConstraints> = [
  'fondos',
  'sedes',
  'escuelas',
  'etiquetas',
  'lineas',
  'socios',
];

function uniqueNames(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

export function facetConstraintsFromQuery(
  query: string,
  catalogs: VitrinaAiCatalogs | undefined,
): { constraints: VitrinaAiFacetConstraints; leftover: string[] } {
  if (!catalogs) {
    return {
      constraints: { ...EMPTY_VITRINA_FACET_CONSTRAINTS },
      leftover: tokenizeVitrinaQuery(query),
    };
  }

  const constraints: VitrinaAiFacetConstraints = {
    fondos: [],
    sedes: [],
    escuelas: [],
    etiquetas: [],
    lineas: [],
    socios: [],
  };
  const leftover: string[] = [];

  for (const token of tokenizeVitrinaQuery(query)) {
    if (FACET_WORD_STOP.has(token)) continue;
    let matched = false;
    for (const key of FACET_KEYS) {
      const resolved = resolveCatalogValues([token], catalogs[key] ?? []);
      if (resolved.length === 0) continue;
      constraints[key].push(...resolved);
      matched = true;
    }
    if (!matched) leftover.push(token);
  }

  for (const key of FACET_KEYS) {
    constraints[key] = uniqueNames(constraints[key]);
  }

  return { constraints, leftover };
}

export function facetConstraintsAreActive(
  constraints: VitrinaAiFacetConstraints,
): boolean {
  return FACET_KEYS.some((key) => constraints[key].length > 0);
}

export function itemMatchesFacetConstraints(
  item: VitrinaAiIndexItem,
  constraints: VitrinaAiFacetConstraints,
): boolean {
  const groups: Array<[string[], string[]]> = [
    [constraints.fondos, item.fondos],
    [constraints.sedes, item.sedes],
    [constraints.escuelas, item.escuelas],
    [constraints.etiquetas, item.etiquetas],
    [constraints.lineas, item.lineas],
    [constraints.socios, item.socios],
  ];
  for (const [need, have] of groups) {
    if (need.length === 0) continue;
    if (!need.some((name) => have.includes(name))) return false;
  }
  return true;
}

function fieldAllowedForScope(field: string, scope: VitrinaAiSearchScope): boolean {
  if (scope === 'description') return field === 'descripcion';
  if (scope === 'topic') {
    return field === 'descripcion' || field === 'etiquetas' || field === 'nombre';
  }
  return true;
}

export function searchVitrinaAiIndex(
  index: VitrinaAiIndexItem[],
  query: string,
  scope: VitrinaAiSearchScope = 'all',
  catalogs?: VitrinaAiCatalogs,
): VitrinaAiSearchHit[] {
  const { constraints, leftover } = facetConstraintsFromQuery(query, catalogs);
  const structural: VitrinaAiFacetConstraints =
    scope === 'topic' || scope === 'description'
      ? { ...constraints, etiquetas: [] }
      : constraints;
  const hasFacets = catalogs ? facetConstraintsAreActive(structural) : false;
  const tokens =
    scope === 'topic' || scope === 'description'
      ? tokenizeTopicQuery(query)
      : catalogs
        ? leftover
        : tokenizeVitrinaQuery(query);
  if (tokens.length === 0 && !hasFacets) return [];

  const hits: VitrinaAiSearchHit[] = [];
  for (const item of index) {
    if (hasFacets && !itemMatchesFacetConstraints(item, structural)) continue;

    const matched = new Set<string>();
    let score = 0;
    if (hasFacets) {
      if (structural.fondos.length) {
        score += 1;
        matched.add('fondos');
      }
      if (structural.sedes.length) {
        score += 1;
        matched.add('sedes');
      }
      if (structural.escuelas.length) {
        score += 1;
        matched.add('escuelas');
      }
      if (structural.etiquetas.length) {
        score += 1;
        matched.add('etiquetas');
      }
      if (structural.lineas.length) {
        score += 1;
        matched.add('lineas');
      }
      if (structural.socios.length) {
        score += 1;
        matched.add('socios');
      }
    }

    if (tokens.length > 0) {
      const fields = fieldValues(item);
      const requireAllTokens = scope === 'topic' || scope === 'description';
      const matchedTokens = new Set<string>();
      let tokenHits = 0;
      for (const [field, values] of Object.entries(fields)) {
        if (!fieldAllowedForScope(field, scope)) continue;
        const haystack = foldVitrinaText(values.join(' '));
        if (!haystack) continue;
        for (const token of tokens) {
          const aliases = requireAllTokens ? aliasesForToken(token) : [token];
          if (aliases.some((alias) => haystackMatchesToken(haystack, alias))) {
            score += field === 'nombre' ? 3 : 1;
            matched.add(field);
            matchedTokens.add(token);
            tokenHits += 1;
          }
        }
      }
      if (requireAllTokens && matchedTokens.size < tokens.length) continue;
      if (tokenHits === 0) continue;
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
