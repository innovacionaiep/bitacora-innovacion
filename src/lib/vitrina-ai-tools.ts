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
} from '@/lib/vitrina-ai-index';

export type VitrinaAiToolState = {
  filters: VitrinaProjectFilters;
  matchIds: string[] | null;
};

export type VitrinaAiToolContext = {
  index: VitrinaAiIndexItem[];
  catalogs: VitrinaAiCatalogs;
  proyectos: VitrinaProyecto[];
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
        'Busca proyectos de la vitrina por texto libre en nombre, descripción y metadata.',
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
        'Filtra las tarjetas de la vitrina. Usa nombres canónicos o cercanos y, si hace falta, ids concretos.',
      parameters: {
        type: 'object',
        properties: {
          fondos: { type: 'array', items: { type: 'string' } },
          sedes: { type: 'array', items: { type: 'string' } },
          escuelas: { type: 'array', items: { type: 'string' } },
          etiquetas: { type: 'array', items: { type: 'string' } },
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
    const hits = searchVitrinaAiIndex(ctx.index, query).slice(0, 12);
    return {
      ok: true,
      content: JSON.stringify({
        query,
        total: hits.length,
        hits: hits.map((hit) => ({
          id: hit.id,
          nombre: hit.nombre,
          matched: hit.matched,
        })),
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
    return {
      ok: true,
      content: JSON.stringify({ filters, projectIds }),
      state: {
        filters,
        matchIds: args.projectIds == null ? null : projectIds,
      },
    };
  }

  return {
    ok: false,
    content: JSON.stringify({ error: `Tool desconocida: ${name}` }),
    state: null,
  };
}
