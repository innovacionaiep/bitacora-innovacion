import {
  EMPTY_VITRINA_FILTERS,
  vitrinaFiltersAreActive,
  type VitrinaProjectFilters,
} from '@/lib/vitrina-project-filters';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import {
  VITRINA_AI_MAX_HISTORY,
  VITRINA_AI_MAX_TOKENS,
  VITRINA_AI_MAX_TOOL_ROUNDS,
} from '@/lib/vitrina-ai-settings';
import {
  buildVitrinaAiIndex,
  searchVitrinaAiIndex,
  type VitrinaAiCatalogs,
  type VitrinaAiIndexItem,
} from '@/lib/vitrina-ai-index';
import {
  executeVitrinaAiTool,
  VITRINA_AI_TOOL_DEFINITIONS,
  type VitrinaAiToolState,
} from '@/lib/vitrina-ai-tools';

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
- El índice y la búsqueda preliminar del sistema son la fuente de verdad: si listan coincidencias, NO digas que no hay resultados.
- Primero search_projects si hace falta detalle. Luego apply_filters con projectIds de esas coincidencias.
- apply_filters debe usar nombres del catálogo (o fragmentos: "plataforma" → "Plataformas digitales") y projectIds.
- Responde en español, en 1 a 3 frases, con el recuento y por qué coinciden.
- Solo llama clear_filters si el visitante pide ver todos o la búsqueda preliminar está vacía.`;

function formatIndexForPrompt(index: VitrinaAiIndexItem[]): string {
  if (index.length === 0) return 'No hay proyectos publicados en la vitrina.';
  return index
    .map((item) => {
      const tags = item.etiquetas.join(', ') || '—';
      const desc = item.descripcion.replace(/\s+/g, ' ').slice(0, 160);
      return `- id:${item.id} | ${item.nombre} | sedes:${item.sedes.join(', ') || '—'} | etiquetas:${tags} | desc:${desc}`;
    })
    .join('\n');
}

export function reconcileVitrinaAiState(
  state: VitrinaAiToolState,
  applied: boolean,
  fallbackIds: string[],
): { state: VitrinaAiToolState; applied: boolean } {
  if (fallbackIds.length === 0) {
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
  if (!matchIds || matchIds.length === 0) return reply;
  const names = index
    .filter((item) => matchIds.includes(item.id))
    .map((item) => item.nombre);
  if (names.length === 0) return reply;
  const denied =
    /no se encontr|no hay coinciden|ningún proyecto|ningun proyecto|se han eliminado/i.test(
      reply,
    );
  if (!denied) return reply;
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
}): Promise<{ ok: true; choice: OrChoice } | { ok: false; error: string }> {
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
        tools: VITRINA_AI_TOOL_DEFINITIONS,
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
  const preliminaryHits = searchVitrinaAiIndex(index, input.userMessage);
  const fallbackIds = preliminaryHits.map((hit) => hit.id);
  const ctx = {
    index,
    catalogs: input.catalogs,
    proyectos: input.proyectos,
  };

  let state: VitrinaAiToolState = {
    filters: EMPTY_VITRINA_FILTERS,
    matchIds: null,
  };
  let applied = false;
  let lastSearchIds: string[] = fallbackIds;

  const preliminaryNote =
    preliminaryHits.length > 0
      ? `Búsqueda preliminar para este mensaje (${preliminaryHits.length}): ${preliminaryHits
          .map((hit) => `${hit.nombre} [${hit.id}]`)
          .join('; ')}.`
      : 'Búsqueda preliminar: sin coincidencias de texto.';

  const messages: OrMessage[] = [
    {
      role: 'system',
      content: `${SYSTEM_PROMPT}

Índice de la vitrina:
${formatIndexForPrompt(index)}

${preliminaryNote}`,
    },
    ...takeHistory(input.history).map((turn) => ({
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
    });
    if (!call.ok) return call;

    const toolCalls = call.choice.message?.tool_calls?.filter(
      (item) => item?.function?.name,
    );
    if (toolCalls && toolCalls.length > 0) {
      messages.push({
        role: 'assistant',
        content: call.choice.message?.content ?? null,
        tool_calls: toolCalls,
      });
      for (const toolCall of toolCalls) {
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
        if (executed.state) {
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

    const reply = call.choice.message?.content?.trim();
    const reconciled = reconcileVitrinaAiState(state, applied, lastSearchIds);
    return {
      ok: true,
      reply: correctiveReplyIfNeeded(
        reply ||
          'Revisé los proyectos de la vitrina. Si quieres, describe un poco más lo que buscas.',
        reconciled.state.matchIds,
        index,
      ),
      filters: reconciled.state.filters,
      matchIds: reconciled.state.matchIds,
      applied: reconciled.applied,
    };
  }

  const reconciled = reconcileVitrinaAiState(state, applied, lastSearchIds);
  return {
    ok: true,
    reply: correctiveReplyIfNeeded(
      'Revisé los proyectos de la vitrina y actualicé los filtros.',
      reconciled.state.matchIds,
      index,
    ),
    filters: reconciled.state.filters,
    matchIds: reconciled.state.matchIds,
    applied: reconciled.applied,
  };
}
