import {
  EMPTY_VITRINA_FILTERS,
  type VitrinaProjectFilters,
} from '@/lib/vitrina-project-filters';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import {
  resolveCatalogValues,
  searchVitrinaAiIndex,
  type VitrinaAiCatalogs,
  type VitrinaAiIndexItem,
  type VitrinaAiSearchScope,
} from '@/lib/vitrina-ai-index';

export type VitrinaAiToolState = {
  filters: VitrinaProjectFilters;
  matchIds: string[] | null;
};

export type VitrinaAiToolContext = {
  index: VitrinaAiIndexItem[];
  catalogs: VitrinaAiCatalogs;
  proyectos: VitrinaProyecto[];
  searchScope?: VitrinaAiSearchScope;
};

export type VitrinaAiToolResult =
  | { ok: true; content: string; state: VitrinaAiToolState | null }
  | { ok: false; content: string; state: null };

export const VITRINA_AI_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_projects',
      description:
        'Busca proyectos de la vitrina por texto libre en nombre, descripción, fondos, sedes, escuelas, etiquetas y demás metadata.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Texto de búsqueda, por ejemplo "huerta en Valparaíso".',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_catalog',
      description:
        'Lista valores canónicos de fondos, sedes, escuelas, etiquetas, líneas y socios.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_filters',
      description:
        'Filtra las tarjetas de la vitrina solo si el visitante pide ver, mostrar o buscar esos proyectos. No la uses para preguntas de recuento. Usa nombres canónicos o cercanos y, si hace falta, ids concretos.',
      parameters: {
        type: 'object',
        properties: {
          fondos: { type: 'array', items: { type: 'string' } },
          sedes: { type: 'array', items: { type: 'string' } },
          escuelas: { type: 'array', items: { type: 'string' } },
          etiquetas: { type: 'array', items: { type: 'string' } },
          lineas: { type: 'array', items: { type: 'string' } },
          socios: { type: 'array', items: { type: 'string' } },
          projectIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'clear_filters',
      description: 'Quita todos los filtros y muestra todas las tarjetas.',
      parameters: { type: 'object', properties: {} },
    },
  },
];

function asStringArray(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === 'string');
}

function parseArgs(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function executeVitrinaAiTool(
  name: string,
  rawArgs: unknown,
  ctx: VitrinaAiToolContext,
): VitrinaAiToolResult {
  const args = parseArgs(rawArgs);

  if (name === 'search_projects') {
    const query = typeof args.query === 'string' ? args.query : '';
    const hits = searchVitrinaAiIndex(
      ctx.index,
      query,
      ctx.searchScope ?? 'all',
      ctx.catalogs,
    ).slice(0, 12);
    return {
      ok: true,
      content: JSON.stringify({
        query,
        total: hits.length,
        hits: hits.map((hit) => {
          const item = ctx.index.find((row) => row.id === hit.id);
          return {
            id: hit.id,
            nombre: hit.nombre,
            fondos: item?.fondos ?? [],
            matched: hit.matched,
          };
        }),
      }),
      state: null,
    };
  }

  if (name === 'list_catalog') {
    return {
      ok: true,
      content: JSON.stringify(ctx.catalogs),
      state: null,
    };
  }

  if (name === 'clear_filters') {
    return {
      ok: true,
      content: JSON.stringify({ cleared: true }),
      state: { filters: EMPTY_VITRINA_FILTERS, matchIds: null },
    };
  }

  if (name === 'apply_filters') {
    const knownIds = new Set(ctx.index.map((item) => item.id));
    const projectIds = (asStringArray(args.projectIds) ?? []).filter((id) =>
      knownIds.has(id),
    );
    const filters: VitrinaProjectFilters = {
      fondos: resolveCatalogValues(asStringArray(args.fondos), ctx.catalogs.fondos),
      sedes: resolveCatalogValues(asStringArray(args.sedes), ctx.catalogs.sedes),
      escuelas: resolveCatalogValues(
        asStringArray(args.escuelas),
        ctx.catalogs.escuelas,
      ),
      etiquetas: resolveCatalogValues(
        asStringArray(args.etiquetas),
        ctx.catalogs.etiquetas,
      ),
    };
    const lineas = resolveCatalogValues(
      asStringArray(args.lineas),
      ctx.catalogs.lineas,
    );
    const socios = resolveCatalogValues(
      asStringArray(args.socios),
      ctx.catalogs.socios,
    );
    let matchIds: string[] | null =
      args.projectIds == null ? null : projectIds;
    if (lineas.length > 0 || socios.length > 0) {
      const extraIds = ctx.index
        .filter((item) => {
          const okLinea =
            lineas.length === 0 ||
            item.lineas.some((name) => lineas.includes(name));
          const okSocio =
            socios.length === 0 ||
            item.socios.some((name) => socios.includes(name));
          return okLinea && okSocio;
        })
        .map((item) => item.id);
      matchIds =
        matchIds == null
          ? extraIds
          : matchIds.filter((id) => extraIds.includes(id));
    }
    return {
      ok: true,
      content: JSON.stringify({ filters, projectIds, lineas, socios }),
      state: {
        filters,
        matchIds,
      },
    };
  }

  return {
    ok: false,
    content: JSON.stringify({ error: `Tool desconocida: ${name}` }),
    state: null,
  };
}
