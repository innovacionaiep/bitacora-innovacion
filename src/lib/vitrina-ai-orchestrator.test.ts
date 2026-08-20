import { describe, expect, it, vi } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import { buildVitrinaAiCatalogs } from '@/lib/vitrina-ai-index';
import { runVitrinaAiOrchestrator } from '@/lib/vitrina-ai-orchestrator';

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function toolCall(id: string, name: string, args: unknown) {
  return {
    id,
    type: 'function' as const,
    function: { name, arguments: JSON.stringify(args) },
  };
}

function sample() {
  const result = normalizeVitrinaProyectos([
    {
      id: 'p-huerta',
      nombre: 'Huerta comunitaria',
      descripcion: 'Cultivo agroecológico en Valparaíso',
      sedes: ['Valparaíso'],
      etiquetas: ['Sostenibilidad'],
    },
  ]);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('runVitrinaAiOrchestrator', () => {
  const proyectos = sample();
  const catalogs = buildVitrinaAiCatalogs(
    {
      fondos: [],
      sedes: ['Valparaíso'],
      escuelas: [],
      etiquetas: ['Sostenibilidad'],
    },
    proyectos,
  );

  it('busca, aplica filtros y devuelve la respuesta breve', async () => {
    let round = 0;
    const fetchImpl = vi.fn(async () => {
      round += 1;
      if (round === 1) {
        return jsonResponse({
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [toolCall('c1', 'search_projects', { query: 'huerta' })],
              },
            },
          ],
        });
      }
      if (round === 2) {
        return jsonResponse({
          choices: [
            {
              finish_reason: 'tool_calls',
              message: {
                role: 'assistant',
                tool_calls: [
                  toolCall('c2', 'apply_filters', {
                    sedes: ['valparaiso'],
                    projectIds: ['p-huerta'],
                  }),
                ],
              },
            },
          ],
        });
      }
      return jsonResponse({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'Encontré un proyecto de huerta en Valparaíso.',
            },
          },
        ],
      });
    });

    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'Busco un proyecto de huerta en Valparaíso',
      history: [],
      proyectos,
      catalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.matchIds).toEqual(['p-huerta']);
    expect(result.filters.sedes).toEqual(['Valparaíso']);
    expect(result.applied).toBe(true);
    expect(result.reply).toContain('huerta');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('devuelve error si OpenRouter falla', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ error: { message: 'bad key' } }, 401));
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'hola',
      history: [],
      proyectos,
      catalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
  });
});
