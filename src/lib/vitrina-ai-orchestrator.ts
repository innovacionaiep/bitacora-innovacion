import {
  EMPTY_VITRINA_FILTERS,
  vitrinaFiltersAreActive,
  type VitrinaProjectFilters,
} from '@/lib/vitrina-project-filters';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { flattenVitrinaAiMarkdownTables } from '@/lib/vitrina-ai-chat-format';
import {
  VITRINA_AI_MAX_HISTORY,
  VITRINA_AI_MAX_TOKENS,
  VITRINA_AI_MAX_TOOL_ROUNDS,
} from '@/lib/vitrina-ai-settings';
import {
  buildVitrinaAiIndex,
  facetConstraintsAreActive,
  facetConstraintsFromQuery,
  itemMatchesFacetConstraints,
  searchVitrinaAiIndex,
  summarizeVitrinaAiFacets,
  type VitrinaAiCatalogs,
  type VitrinaAiFacetConstraints,
  type VitrinaAiIndexItem,
  type VitrinaAiSearchHit,
  type VitrinaAiSearchScope,
} from '@/lib/vitrina-ai-index';
import {
  executeVitrinaAiTool,
  isVitrinaAiLocalToolName,
  OPENROUTER_WEB_SEARCH_TOOL,
  VITRINA_AI_TOOL_DEFINITIONS,
  type VitrinaAiToolState,
} from '@/lib/vitrina-ai-tools';
import {
  classifyVitrinaAiIntent,
  leftoverTopicTokens,
  isVitrinaAiAnalysisQuery,
  isVitrinaAiChatMetaQuery,
  isVitrinaAiMetadataFieldQuery,
  isVitrinaAiTopicQuery,
  isVitrinaAiWebSearchQuery,
  vitrinaAiIntentAllowsFilters,
  vitrinaAiQueryRefersToPrevious,
} from '@/lib/vitrina-ai-intent';

export const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type VitrinaAiChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type VitrinaAiOrchestratorInput = {
  apiKey: string;
  model: string;
  userMessage: string;
  history: VitrinaAiChatTurn[];
  proyectos: VitrinaProyecto[];
  catalogs: VitrinaAiCatalogs;
  currentFilters?: VitrinaProjectFilters;
  currentMatchIds?: string[] | null;
  referer?: string;
  fetchImpl?: typeof fetch;
};

export type VitrinaAiOrchestratorResult =
  | {
      ok: true;
      reply: string;
      filters: VitrinaProjectFilters;
      matchIds: string[] | null;
      applied: boolean;
    }
  | { ok: false; error: string };

type OrToolCall = {
  id: string;
  type?: string;
  function?: { name?: string; arguments?: string };
};

type OrMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | {
      role: 'assistant';
      content: string | null;
      tool_calls: OrToolCall[];
    }
  | { role: 'tool'; tool_call_id: string; content: string };

type OrChoice = {
  finish_reason?: string;
  message?: {
    role?: string;
    content?: string | null;
    tool_calls?: OrToolCall[];
  };
};

const SYSTEM_PROMPT = `Eres el asistente de la vitrina pública de Bitácora.
Ayudas a visitantes a encontrar proyectos publicados en la vitrina (no en el resto de Bitácora).
Reglas:
- Usa las tools. No inventes proyectos, ids, sedes, fondos ni etiquetas.
- El índice, los Recuentos y la búsqueda preliminar del sistema son la fuente de verdad: si listan coincidencias, NO digas que no hay resultados.
- Los fondos van en cada línea del índice (campo fondos) y en Recuentos. Un fondo no es el nombre del proyecto: si Recuentos lista el fondo, hay proyectos de ese fondo.
- "En curso" significa publicados ahora en esta vitrina, no el estado operativo de Bitácora.
- Pregunta informativa (cuántos hay, qué fondos hay, cómo funciona un proyecto): responde con Recuentos/índice. NO llames apply_filters ni clear_filters.
- Pregunta de análisis (en qué se parecen, se diferencian, resume, impacto, metodología): sintetiza con las fichas del conjunto actual. NO llames apply_filters ni clear_filters. Puedes usar hasta 6 frases o 2 párrafos cortos.
- Pregunta de tema (si es de electricidad, pueblos originarios, de qué trata): cuenta si la descripción O una etiqueta lo dicen de forma explícita. Prohibido inferir el tema desde escuela, fondo o sede: "Ingeniería, Energía y Tecnología" es una escuela, no el contenido del proyecto.
- Pedido de ver/mostrar/buscar/filtrar tarjetas: primero search_projects si hace falta detalle, luego apply_filters con nombres del catálogo o projectIds.
- apply_filters debe usar nombres del catálogo (o fragmentos: "plataforma" → "Plataformas digitales") y projectIds.
- Si no es análisis ni búsqueda web, responde en español en 1 a 3 frases, con el recuento y por qué coinciden.
- Nunca uses tablas Markdown ni columnas con |. El recuadro del chat es estrecho: texto corrido o viñetas cortas. Nombres en **negrita**. Un ítem por línea: **Nombre**: dato — fuente.
- Solo llama clear_filters si pide ver todos.`;

function formatIndexForPrompt(index: VitrinaAiIndexItem[]): string {
  if (index.length === 0) return 'No hay proyectos publicados en la vitrina.';
  const lines = index
    .map((item) => {
      const desc = item.descripcion.replace(/\s+/g, ' ').slice(0, 400);
      return `- id:${item.id} | ${item.nombre} | fondos:${item.fondos.join(', ') || '—'} | lineas:${item.lineas.join(', ') || '—'} | sedes:${item.sedes.join(', ') || '—'} | escuelas:${item.escuelas.join(', ') || '—'} | socios:${item.socios.join(', ') || '—'} | etiquetas:${item.etiquetas.join(', ') || '—'} | encargado:${item.encargadoNombre || '—'} | desc:${desc}`;
    })
    .join('\n');
  return `${summarizeVitrinaAiFacets(index)}\n${lines}`;
}

function formatPoolFichasForPrompt(pool: VitrinaAiIndexItem[]): string {
  if (pool.length === 0) {
    return 'Conjunto actual (fichas): no hay proyectos recortados; usa el índice general.';
  }
  const lines = pool.map((item) => {
    const desc = item.descripcion.replace(/\s+/g, ' ').slice(0, 800);
    const cargo = item.encargadoCargo.trim();
    const encargado = item.encargadoNombre.trim()
      ? cargo
        ? `${item.encargadoNombre} (${cargo})`
        : item.encargadoNombre
      : '—';
    return `- id:${item.id} | ${item.nombre} | fondos:${item.fondos.join(', ') || '—'} | lineas:${item.lineas.join(', ') || '—'} | sedes:${item.sedes.join(', ') || '—'} | escuelas:${item.escuelas.join(', ') || '—'} | socios:${item.socios.join(', ') || '—'} | etiquetas:${item.etiquetas.join(', ') || '—'} | encargado:${encargado} | desc:${desc || '—'}`;
  });
  return `Conjunto actual (fichas) — sintetiza SOLO con estos proyectos:\n${lines.join('\n')}`;
}

export function formatVitrinaAiHelpReply(): string {
  return 'Puedo ayudarte a explorar los proyectos de esta vitrina: decirte cuántos hay de un fondo, sede o escuela, buscar un tema si aparece en la descripción o en una etiqueta, o mostrar las tarjetas si me pides verlas. ¿Qué te gustaría encontrar?';
}

export function formatVitrinaAiTopicReply(
  hits: VitrinaAiSearchHit[],
  index: VitrinaAiIndexItem[] = [],
): string {
  if (hits.length === 0) {
    return 'No: ningún proyecto menciona ese tema de forma explícita en su descripción ni en sus etiquetas. El nombre de una escuela o fondo no implica el contenido del proyecto.';
  }
  const names = hits.map((hit) => hit.nombre).join(', ');
  const first = index.find((item) => item.id === hits[0].id);
  const how =
    first?.descripcion.replace(/\s+/g, ' ').trim().slice(0, 220) ?? '';
  const where =
    hits[0].matched.includes('etiquetas') && !hits[0].matched.includes('descripcion')
      ? 'en su etiqueta'
      : 'en su descripción o etiqueta';
  if (hits.length === 1) {
    if (how) {
      return `Sí, 1 proyecto lo menciona de forma explícita ${where}: ${names}. ${how}`;
    }
    return `Sí, 1 proyecto lo menciona de forma explícita ${where}: ${names}.`;
  }
  return `Sí, ${hits.length} proyectos lo mencionan de forma explícita en su descripción o etiqueta: ${names}.`;
}

export function formatVitrinaAiFacetReply(hits: VitrinaAiSearchHit[]): string {
  if (hits.length === 0) {
    return 'No hay proyectos en la vitrina que coincidan con eso.';
  }
  if (hits.length === 1) {
    return `Sí, hay 1 proyecto: ${hits[0].nombre}.`;
  }
  return `Sí, hay ${hits.length} proyectos: ${hits.map((hit) => hit.nombre).join(', ')}.`;
}

export function formatVitrinaAiFacetShowReply(
  hits: VitrinaAiSearchHit[],
  constraints: VitrinaAiFacetConstraints,
): string {
  const where = [
    ...constraints.sedes,
    ...constraints.fondos,
    ...constraints.escuelas,
    ...constraints.etiquetas,
  ].join(', ');
  const place = where ? ` de ${where}` : '';
  if (hits.length === 0) {
    return `No hay proyectos en curso${place}.`;
  }
  const names = hits.map((hit) => hit.nombre).join(', ');
  if (hits.length === 1) {
    return `Hay 1 proyecto en curso${place}: ${names}.`;
  }
  return `Hay ${hits.length} proyectos en curso${place}: ${names}.`;
}

function filtersFromFacetConstraints(
  constraints: VitrinaAiFacetConstraints,
): VitrinaProjectFilters {
  return {
    fondos: constraints.fondos,
    sedes: constraints.sedes,
    escuelas: constraints.escuelas,
    etiquetas: constraints.etiquetas,
  };
}

function formatEncargadoLine(item: VitrinaAiIndexItem): string {
  const who = item.encargadoNombre.trim();
  const cargo = item.encargadoCargo.trim();
  if (!who) {
    return `**${item.nombre}** no indica encargado en la ficha`;
  }
  if (cargo) return `**${item.nombre}**: ${who} (${cargo})`;
  return `**${item.nombre}**: ${who}`;
}

export function formatVitrinaAiEncargadosReply(
  items: VitrinaAiIndexItem[],
): string {
  if (items.length === 0) {
    return 'No hay proyectos a la vista para decirte el encargado. Pide ver un conjunto y vuelve a preguntar.';
  }
  if (items.length === 1) {
    const item = items[0];
    const who = item.encargadoNombre.trim();
    const cargo = item.encargadoCargo.trim();
    if (!who) {
      return `**${item.nombre}** no indica encargado en la ficha.`;
    }
    if (cargo) {
      return `El encargado de **${item.nombre}** es ${who} (${cargo}).`;
    }
    return `El encargado de **${item.nombre}** es ${who}.`;
  }
  return `Los encargados de estos proyectos son: ${items
    .map(formatEncargadoLine)
    .join('; ')}.`;
}

function poolIndexForQuery(
  index: VitrinaAiIndexItem[],
  userMessage: string,
  history: VitrinaAiChatTurn[],
  catalogs: VitrinaAiCatalogs,
  currentMatchIds: string[] | null,
  currentFilters: VitrinaProjectFilters,
): VitrinaAiIndexItem[] {
  const pinToCurrent =
    vitrinaAiQueryRefersToPrevious(userMessage, history.length) ||
    isVitrinaAiMetadataFieldQuery(userMessage) ||
    isVitrinaAiAnalysisQuery(userMessage) ||
    isVitrinaAiWebSearchQuery(userMessage);
  if (!pinToCurrent) return index;
  if (currentMatchIds && currentMatchIds.length > 0) {
    const allowed = new Set(currentMatchIds);
    const pooled = index.filter((item) => allowed.has(item.id));
    if (pooled.length > 0) return pooled;
  }
  if (vitrinaFiltersAreActive(currentFilters)) {
    const pooled = index.filter((item) =>
      itemMatchesFacetConstraints(item, {
        fondos: currentFilters.fondos,
        sedes: currentFilters.sedes,
        escuelas: currentFilters.escuelas,
        etiquetas: currentFilters.etiquetas,
        lineas: [],
        socios: [],
      }),
    );
    if (pooled.length > 0) return pooled;
  }
  const lastUser = [...history].reverse().find((turn) => turn.role === 'user');
  if (!lastUser?.content.trim()) return index;
  const previousHits = searchVitrinaAiIndex(
    index,
    lastUser.content,
    'all',
    catalogs,
  );
  if (previousHits.length === 0) return index;
  const allowed = new Set(previousHits.map((hit) => hit.id));
  return index.filter((item) => allowed.has(item.id));
}

function intentNote(
  intent: ReturnType<typeof classifyVitrinaAiIntent>,
  preliminaryHits: { id: string; nombre: string }[],
  analysis: boolean,
  webSearch: boolean,
): string {
  if (webSearch) {
    return 'El visitante pidió consultar internet: usa openrouter:web_search. Distingue lo que sale de la web de lo que está en las fichas. NO llames apply_filters ni clear_filters. Cita fuentes si las hay. No inventes datos de un proyecto de la vitrina a partir de la web. SIN tablas: viñetas cortas.';
  }
  if (analysis) {
    return 'Esta es una pregunta de análisis del conjunto actual: sintetiza con las fichas de Conjunto actual. NO llames apply_filters ni clear_filters.';
  }
  if (intent === 'detail') {
    return 'Esta pregunta es sobre el contenido de un proyecto ya visto: no cambies filtros.';
  }
  if (intent === 'ask') {
    return 'Esta es una pregunta informativa (recuento o catálogo): responde con Recuentos/índice. NO llames apply_filters ni clear_filters.';
  }
  if (preliminaryHits.length > 0) {
    return `Búsqueda preliminar para este mensaje (${preliminaryHits.length}): ${preliminaryHits
      .map((hit) => `${hit.nombre} [${hit.id}]`)
      .join('; ')}.`;
  }
  return 'Búsqueda preliminar: sin coincidencias de texto.';
}

function idsForReplyCorrection(
  intent: ReturnType<typeof classifyVitrinaAiIntent>,
  allowFilterChange: boolean,
  reconciledIds: string[] | null,
  fallbackIds: string[],
  currentMatchIds: string[] | null,
): string[] | null {
  if (allowFilterChange) return reconciledIds;
  if (intent === 'ask' && fallbackIds.length > 0) return fallbackIds;
  return currentMatchIds;
}

export function reconcileVitrinaAiState(
  state: VitrinaAiToolState,
  applied: boolean,
  fallbackIds: string[],
  allowFallback: boolean,
): { state: VitrinaAiToolState; applied: boolean } {
  if (!allowFallback || fallbackIds.length === 0) {
    return { state, applied };
  }
  const hasFacet = vitrinaFiltersAreActive(state.filters);
  const ids = state.matchIds;
  const emptyIds = ids != null && ids.length === 0;
  const noIds = ids == null;
  if (emptyIds || (noIds && !hasFacet)) {
    return {
      state: { filters: state.filters, matchIds: fallbackIds },
      applied: true,
    };
  }
  return { state, applied };
}

export function correctiveReplyIfNeeded(
  reply: string,
  matchIds: string[] | null,
  index: VitrinaAiIndexItem[],
): string {
  const flattened = flattenVitrinaAiMarkdownTables(reply);
  if (!matchIds || matchIds.length === 0) return flattened;
  const names = index
    .filter((item) => matchIds.includes(item.id))
    .map((item) => item.nombre);
  if (names.length === 0) return flattened;
  const denied =
    /no se encontr|no hay coinciden|no hay proyecto|ningún proyecto|ningun proyecto|se han eliminado|no aparece/i.test(
      flattened,
    );
  if (!denied) return flattened;
  if (names.length === 1) {
    return `Encontré 1 proyecto que coincide: ${names[0]}.`;
  }
  return `Encontré ${names.length} proyectos que coinciden: ${names.join(', ')}.`;
}

function takeHistory(history: VitrinaAiChatTurn[]): VitrinaAiChatTurn[] {
  return history
    .filter(
      (turn) =>
        (turn.role === 'user' || turn.role === 'assistant') &&
        typeof turn.content === 'string' &&
        turn.content.trim(),
    )
    .slice(-VITRINA_AI_MAX_HISTORY);
}

function parseToolArgs(raw: string | undefined): unknown {
  if (!raw?.trim()) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return {};
  }
}

async function callOpenRouter(params: {
  apiKey: string;
  model: string;
  messages: OrMessage[];
  referer?: string;
  fetchImpl: typeof fetch;
  enableWebSearch?: boolean;
}): Promise<{ ok: true; choice: OrChoice } | { ok: false; error: string }> {
  const tools = params.enableWebSearch
    ? [...VITRINA_AI_TOOL_DEFINITIONS, OPENROUTER_WEB_SEARCH_TOOL]
    : VITRINA_AI_TOOL_DEFINITIONS;
  let response: Response;
  try {
    response = await params.fetchImpl(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': params.referer || 'https://bitacora.local',
        'X-Title': 'Bitacora Vitrina',
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        tools,
        tool_choice: 'auto',
        max_tokens: VITRINA_AI_MAX_TOKENS,
        temperature: 0.2,
      }),
    });
  } catch {
    return { ok: false, error: 'No se pudo contactar a OpenRouter' };
  }

  let payload: { error?: { message?: string }; choices?: OrChoice[] } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    return { ok: false, error: 'OpenRouter devolvió una respuesta inválida' };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: payload.error?.message?.trim() || 'OpenRouter rechazó la solicitud',
    };
  }

  const choice = payload.choices?.[0];
  if (!choice) {
    return { ok: false, error: 'OpenRouter no devolvió una respuesta' };
  }
  return { ok: true, choice };
}

export async function runVitrinaAiOrchestrator(
  input: VitrinaAiOrchestratorInput,
): Promise<VitrinaAiOrchestratorResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const index = buildVitrinaAiIndex(input.proyectos);
  const history = takeHistory(input.history);
  const intent = classifyVitrinaAiIntent(
    input.userMessage,
    history.length,
    input.catalogs,
  );
  const allowFilterChange = vitrinaAiIntentAllowsFilters(intent);
  const isTopic = isVitrinaAiTopicQuery(input.userMessage, input.catalogs);
  const isAnalysis = isVitrinaAiAnalysisQuery(input.userMessage);
  const isWebSearch = isVitrinaAiWebSearchQuery(input.userMessage);
  const searchScope: VitrinaAiSearchScope = isTopic ? 'topic' : 'all';
  const currentFilters = input.currentFilters ?? EMPTY_VITRINA_FILTERS;
  const currentMatchIds =
    input.currentMatchIds === undefined ? null : input.currentMatchIds;
  const pool = poolIndexForQuery(
    index,
    input.userMessage,
    history,
    input.catalogs,
    currentMatchIds,
    currentFilters,
  );
  if (isVitrinaAiMetadataFieldQuery(input.userMessage) && !isWebSearch) {
    return {
      ok: true,
      reply: formatVitrinaAiEncargadosReply(pool),
      filters: currentFilters,
      matchIds: currentMatchIds,
      applied: false,
    };
  }
  const preliminaryHits = searchVitrinaAiIndex(
    pool,
    input.userMessage,
    searchScope,
    input.catalogs,
  );
  const fallbackIds = preliminaryHits.map((hit) => hit.id);
  const ctx = {
    index,
    catalogs: input.catalogs,
    proyectos: input.proyectos,
    searchScope,
  };

  const { leftover, constraints } = facetConstraintsFromQuery(
    input.userMessage,
    input.catalogs,
  );
  const topicLeftover = leftoverTopicTokens(leftover);
  const facetAsk =
    intent === 'ask' &&
    !isTopic &&
    topicLeftover.length === 0 &&
    facetConstraintsAreActive(constraints);
  const facetShow =
    allowFilterChange &&
    !isTopic &&
    topicLeftover.length === 0 &&
    facetConstraintsAreActive(constraints);

  if (isVitrinaAiChatMetaQuery(input.userMessage, input.catalogs)) {
    return {
      ok: true,
      reply: formatVitrinaAiHelpReply(),
      filters: currentFilters,
      matchIds: currentMatchIds,
      applied: false,
    };
  }

  if (isTopic && !allowFilterChange && !isAnalysis && !isWebSearch) {
    return {
      ok: true,
      reply: formatVitrinaAiTopicReply(preliminaryHits, index),
      filters: currentFilters,
      matchIds: currentMatchIds,
      applied: false,
    };
  }

  if (facetAsk && !allowFilterChange && !isWebSearch) {
    return {
      ok: true,
      reply: formatVitrinaAiFacetReply(preliminaryHits),
      filters: currentFilters,
      matchIds: currentMatchIds,
      applied: false,
    };
  }

  if (facetShow && !isWebSearch) {
    const ids = preliminaryHits.map((hit) => hit.id);
    return {
      ok: true,
      reply: formatVitrinaAiFacetShowReply(preliminaryHits, constraints),
      filters: filtersFromFacetConstraints(constraints),
      matchIds: ids.length > 0 ? ids : [],
      applied: true,
    };
  }

  let state: VitrinaAiToolState = {
    filters: currentFilters,
    matchIds: currentMatchIds,
  };
  let applied = false;
  let lastSearchIds: string[] = fallbackIds;

  const currentNote =
    currentMatchIds && currentMatchIds.length > 0
      ? `Filtro actual de tarjetas (ids): ${currentMatchIds.join(', ')}.`
      : 'No hay recorte por ids en las tarjetas.';

  const preliminaryNote = intentNote(
    intent,
    preliminaryHits,
    isAnalysis,
    isWebSearch,
  );

  const messages: OrMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}

${formatPoolFichasForPrompt(pool)}

Índice de la vitrina:
${formatIndexForPrompt(index)}

${currentNote}
${preliminaryNote}`,
    },
    ...history.map((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: 'user', content: input.userMessage.trim() },
  ];

  for (let round = 0; round < VITRINA_AI_MAX_TOOL_ROUNDS; round += 1) {
    const call = await callOpenRouter({
      apiKey: input.apiKey,
      model: input.model,
      messages,
      referer: input.referer,
      fetchImpl,
      enableWebSearch: isWebSearch,
    });
    if (!call.ok) return call;

    const toolCalls = call.choice.message?.tool_calls?.filter(
      (item) => item?.function?.name,
    );
    const localToolCalls =
      toolCalls?.filter((item) =>
        isVitrinaAiLocalToolName(item.function?.name ?? ''),
      ) ?? [];
    if (localToolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: call.choice.message?.content ?? null,
        tool_calls: localToolCalls,
      });
      for (const toolCall of localToolCalls) {
        const name = toolCall.function?.name ?? '';
        const executed = executeVitrinaAiTool(
          name,
          parseToolArgs(toolCall.function?.arguments),
          ctx,
        );
        if (name === 'search_projects') {
          try {
            const parsed = JSON.parse(executed.content) as {
              hits?: Array<{ id?: string }>;
            };
            const ids = (parsed.hits ?? [])
              .map((hit) => hit.id)
              .filter((id): id is string => Boolean(id));
            if (ids.length > 0) lastSearchIds = ids;
          } catch {
            /* keep preliminary ids */
          }
        }
        if (executed.state && allowFilterChange) {
          state = executed.state;
          applied = true;
        }
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: executed.content,
        });
      }
      continue;
    }

    const reply = flattenVitrinaAiMarkdownTables(
      call.choice.message?.content?.trim() || '',
    );
    if (intent === 'reset') {
      return {
        ok: true,
        reply:
          reply || 'Listo, quité los filtros. Ya puedes ver todos los proyectos.',
        filters: EMPTY_VITRINA_FILTERS,
        matchIds: null,
        applied: true,
      };
    }
    const reconciled = reconcileVitrinaAiState(
      state,
      applied,
      lastSearchIds,
      allowFilterChange,
    );
    return {
      ok: true,
      reply: correctiveReplyIfNeeded(
        reply ||
          'Revisé los proyectos de la vitrina. Si quieres, describe un poco más lo que buscas.',
        idsForReplyCorrection(
          intent,
          allowFilterChange,
          reconciled.state.matchIds,
          fallbackIds,
          currentMatchIds,
        ),
        index,
      ),
      filters: allowFilterChange ? reconciled.state.filters : currentFilters,
      matchIds: allowFilterChange ? reconciled.state.matchIds : currentMatchIds,
      applied: allowFilterChange ? reconciled.applied : false,
    };
  }

  if (intent === 'reset') {
    return {
      ok: true,
      reply: 'Listo, quité los filtros. Ya puedes ver todos los proyectos.',
      filters: EMPTY_VITRINA_FILTERS,
      matchIds: null,
      applied: true,
    };
  }
  const reconciled = reconcileVitrinaAiState(
    state,
    applied,
    lastSearchIds,
    allowFilterChange,
  );
  return {
    ok: true,
    reply: correctiveReplyIfNeeded(
      'Revisé los proyectos de la vitrina y actualicé los filtros.',
      idsForReplyCorrection(
        intent,
        allowFilterChange,
        reconciled.state.matchIds,
        fallbackIds,
        currentMatchIds,
      ),
      index,
    ),
    filters: allowFilterChange ? reconciled.state.filters : currentFilters,
    matchIds: allowFilterChange ? reconciled.state.matchIds : currentMatchIds,
    applied: allowFilterChange ? reconciled.applied : false,
  };
}
