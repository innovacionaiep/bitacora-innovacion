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
      userMessage: 'huerta en Valparaíso',
      history: [],
      proyectos,
      catalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
  });

  it('si el modelo niega coincidencias, igual aplica la búsqueda preliminar', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-app',
        nombre: 'ClinicApp',
        etiquetas: ['Plataformas digitales'],
        descripcion: 'App clínica',
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      {
        fondos: [],
        sedes: [],
        escuelas: [],
        etiquetas: ['Plataformas digitales'],
      },
      apps,
    );

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
                tool_calls: [toolCall('c1', 'clear_filters', {})],
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
              content:
                "No se encontraron proyectos que incluyan la etiqueta 'Plataformas digitales'. Se han eliminado los filtros.",
            },
          },
        ],
      });
    });

    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'necesito ver proyectos de plataforma',
      history: [],
      proyectos: apps,
      catalogs: appCatalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(true);
    expect(result.matchIds).toEqual(['p-app']);
    expect(result.reply).toContain('ClinicApp');
    expect(result.reply).not.toMatch(/no se encontraron/i);
  });

  it('si niega un fondo que sí está en el índice, corrige el recuento sin filtrar', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-move',
        nombre: 'Innovation Class',
        fondos: ['MOVE Incuba'],
        descripcion: 'Incubación de innovación',
      },
      {
        id: 'p-impulsa',
        nombre: 'ClinicApp',
        fondos: ['Fondo Impulsa'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      {
        fondos: ['MOVE Incuba', 'Fondo Impulsa'],
        sedes: [],
        escuelas: [],
        etiquetas: [],
      },
      apps,
    );

    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as {
        messages?: Array<{ role?: string; content?: string }>;
      };
      const system = body.messages?.find((m) => m.role === 'system')?.content ?? '';
      expect(system).toMatch(/MOVE Incuba/);
      expect(system).toMatch(/fondos:/i);
      return jsonResponse({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content:
                'No hay proyectos de Move Incuba en la vitrina. No aparece ese nombre en el índice de proyectos publicados.',
            },
          },
        ],
      });
    });

    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'y cuantos son de Move Incuba',
      history: [
        { role: 'user', content: 'cuantos proyectos hay en curso' },
        { role: 'assistant', content: 'Hay 5 proyectos en curso en la vitrina.' },
      ],
      proyectos: apps,
      catalogs: appCatalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.matchIds).toBeNull();
    expect(result.reply).toMatch(/Innovation Class/i);
    expect(result.reply).not.toMatch(/no hay proyectos/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('una pregunta de recuento ignora apply_filters del modelo', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-move',
        nombre: 'Innovation Class',
        fondos: ['MOVE Incuba'],
      },
      {
        id: 'p-impulsa',
        nombre: 'ClinicApp',
        fondos: ['Fondo Impulsa'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      {
        fondos: ['MOVE Incuba', 'Fondo Impulsa'],
        sedes: [],
        escuelas: [],
        etiquetas: [],
      },
      apps,
    );

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
                tool_calls: [
                  toolCall('c1', 'apply_filters', {
                    fondos: ['MOVE Incuba'],
                    projectIds: ['p-move'],
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
              content: 'Hay un proyecto financiado por MOVE Incuba.',
            },
          },
        ],
      });
    });

    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: '¿cuántos proyectos de Move Incuba hay en curso?',
      history: [],
      proyectos: apps,
      catalogs: appCatalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.matchIds).toBeNull();
    expect(result.filters.fondos).toEqual([]);
    expect(result.reply).toMatch(/Innovation Class/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('una pregunta de tema no infiere electricidad desde la escuela', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-h2',
        nombre: 'Hidrógeno verde',
        descripcion: 'Generación de energía eléctrica a través de hidrógeno verde',
        escuelas: ['Ingeniería, Energía y Tecnología'],
        fondos: ['Fondo Impulsa'],
      },
      {
        id: 'p-con',
        nombre: 'CONenergía',
        descripcion: 'Consultora que genera conciencia ambiental en la comunidad',
        escuelas: ['Ingeniería, Energía y Tecnología'],
        fondos: ['Fondo Impulsa'],
      },
      {
        id: 'p-agro',
        nombre: 'AgroTech Inclusivo 4.0',
        descripcion: 'Tecnología sustentable para la agricultura',
        escuelas: ['Ingeniería, Energía y Tecnología'],
        fondos: ['Fondo Impulsa'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      {
        fondos: ['Fondo Impulsa'],
        sedes: [],
        escuelas: ['Ingeniería, Energía y Tecnología'],
        etiquetas: [],
      },
      apps,
    );

    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content:
                'Sí, 3 de los 4 proyectos de Fondo Impulsa están vinculados a electricidad (tienen la escuela "Ingeniería, Energía y Tecnología").',
            },
          },
        ],
      }),
    );

    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'y alguno de esos es de electricidad?',
      history: [
        {
          role: 'user',
          content: 'Cuántos proyectos de fondo Impulsa hay en curso?',
        },
        {
          role: 'assistant',
          content: 'Hay 4 proyectos en curso que cuentan con el Fondo Impulsa.',
        },
      ],
      proyectos: apps,
      catalogs: appCatalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.reply).toMatch(/Hidrógeno verde/i);
    expect(result.reply).not.toMatch(/Ingeniería/i);
    expect(result.reply).not.toMatch(/3 de/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('una pregunta de electricidad no usa el nombre del proyecto si no está en la descripción', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-h2',
        nombre: 'Hidrógeno verde',
        descripcion: 'Generación de energía eléctrica a través de hidrógeno verde',
        escuelas: ['Ingeniería, Energía y Tecnología'],
        fondos: ['Fondo Impulsa'],
      },
      {
        id: 'p-con',
        nombre: 'CONenergía, la CONsultora que genera CONciencia',
        descripcion: 'Consultora que genera conciencia ambiental en la comunidad',
        escuelas: ['Ingeniería, Energía y Tecnología'],
        fondos: ['Fondo Impulsa'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      {
        fondos: ['Fondo Impulsa'],
        sedes: [],
        escuelas: ['Ingeniería, Energía y Tecnología'],
        etiquetas: [],
      },
      apps,
    );
    const fetchImpl = vi.fn();
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: '¿hay proyectos de electricidad?',
      history: [],
      proyectos: apps,
      catalogs: appCatalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.reply).toMatch(/Hidrógeno verde/i);
    expect(result.reply).not.toMatch(/CONenergía/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('hay alguno en Castro responde por sede y no filtra', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-castro',
        nombre: 'ClinicApp',
        descripcion: 'App clínica para pacientes',
        sedes: ['Castro'],
        fondos: ['Fondo Impulsa'],
      },
      {
        id: 'p-conce',
        nombre: 'AgroTech',
        descripcion: 'Agricultura en el sur',
        sedes: ['Concepción'],
        fondos: ['Fondo Impulsa'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      {
        fondos: ['Fondo Impulsa'],
        sedes: ['Castro', 'Concepción'],
        escuelas: [],
        etiquetas: [],
      },
      apps,
    );
    const fetchImpl = vi.fn();
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: '¿hay alguno en Castro?',
      history: [],
      proyectos: apps,
      catalogs: appCatalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.matchIds).toBeNull();
    expect(result.reply).toMatch(/ClinicApp/i);
    expect(result.reply).not.toMatch(/descripción/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('cuenta y muestra los proyectos de una sede sin tratarlo como tema', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-la-1',
        nombre: 'Finanzas Pro-Comunales',
        descripcion: 'App de gestión financiera',
        sedes: ['Los Ángeles'],
        fondos: ['Fondo Impulsa'],
      },
      {
        id: 'p-la-2',
        nombre: 'Upcycling intercultural',
        descripcion: 'Reutilización de materiales',
        sedes: ['Los Ángeles'],
        fondos: ['Fondo Impulsa'],
      },
      {
        id: 'p-castro',
        nombre: 'ClinicApp',
        descripcion: 'App clínica',
        sedes: ['Castro'],
        fondos: ['Fondo Impulsa'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const fetchImpl = vi.fn();
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage:
        'Cuantos proyectos de sede los ángeles hay en curso?? porfavor muestramelos',
      history: [
        { role: 'user', content: 'muestrame algun proyecto que trabaje con abejas' },
        {
          role: 'assistant',
          content: 'Hay 1 proyecto que trabaja con abejas: Beehappy.',
        },
      ],
      proyectos: apps,
      catalogs: buildVitrinaAiCatalogs(
        {
          fondos: ['Fondo Impulsa'],
          sedes: ['Los Ángeles', 'Castro'],
          escuelas: [],
          etiquetas: [],
        },
        apps,
      ),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(true);
    expect(result.filters.sedes).toEqual(['Los Ángeles']);
    expect(result.matchIds?.sort()).toEqual(['p-la-1', 'p-la-2']);
    expect(result.reply).toMatch(/2 proyectos/i);
    expect(result.reply).toMatch(/Finanzas Pro-Comunales/i);
    expect(result.reply).toMatch(/Upcycling intercultural/i);
    expect(result.reply).not.toMatch(/tema/i);
    expect(result.reply).not.toMatch(/ClinicApp/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('responde los encargados del conjunto filtrado y no cambia filtros', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-la-1',
        nombre: 'Finanzas Pro-Comunales',
        descripcion: 'App de gestión financiera',
        sedes: ['Los Ángeles'],
        encargadoNombre: 'Marco Riquelme',
        encargadoCargo: 'Jefe de Escuela',
        encargadoCorreo: 'marco@ejemplo.cl',
      },
      {
        id: 'p-la-2',
        nombre: 'Upcycling intercultural',
        descripcion: 'Reutilización de materiales',
        sedes: ['Los Ángeles'],
        encargadoNombre: 'Ana Soto',
        encargadoCargo: 'Coordinadora',
      },
      {
        id: 'p-castro',
        nombre: 'ClinicApp',
        descripcion: 'App clínica',
        sedes: ['Castro'],
        encargadoNombre: 'Otra Persona',
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const fetchImpl = vi.fn();
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: '¿y quienes son los encargados de estos proyectos?',
      history: [
        {
          role: 'user',
          content: 'Quiero saber cuantos proyectos de los ángeles hay y muestramelos',
        },
        {
          role: 'assistant',
          content:
            'Hay 2 proyectos en Los Ángeles: Finanzas Pro-Comunales y Upcycling intercultural.',
        },
      ],
      proyectos: apps,
      catalogs: buildVitrinaAiCatalogs(
        {
          fondos: [],
          sedes: ['Los Ángeles', 'Castro'],
          escuelas: [],
          etiquetas: [],
        },
        apps,
      ),
      currentFilters: {
        fondos: [],
        sedes: ['Los Ángeles'],
        escuelas: [],
        etiquetas: [],
      },
      currentMatchIds: ['p-la-1', 'p-la-2'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.matchIds).toEqual(['p-la-1', 'p-la-2']);
    expect(result.filters.sedes).toEqual(['Los Ángeles']);
    expect(result.reply).toMatch(/Marco Riquelme/i);
    expect(result.reply).toMatch(/Ana Soto/i);
    expect(result.reply).toMatch(/Finanzas Pro-Comunales/i);
    expect(result.reply).toMatch(/Upcycling intercultural/i);
    expect(result.reply).not.toMatch(/Otra Persona/i);
    expect(result.reply).not.toMatch(/marco@ejemplo/i);
    expect(result.reply).not.toMatch(/tema/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('compara los proyectos del conjunto y llama al modelo sin filtrar', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-la-1',
        nombre: 'Finanzas Pro-Comunales',
        descripcion:
          'Gestión financiera digital para microemprendedoras de Los Ángeles',
        sedes: ['Los Ángeles'],
        etiquetas: ['Pymes', 'Contabilidad y finanzas'],
      },
      {
        id: 'p-la-2',
        nombre: 'Upcycling intercultural',
        descripcion:
          'Reutilización de materiales con enfoque en pueblos originarios',
        sedes: ['Los Ángeles'],
        etiquetas: ['Pueblos originarios', 'Medioambiente'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content:
                'Se parecen en la sede Los Ángeles y el Fondo Impulsa. Se diferencian en el tema: finanzas frente a upcycling cultural.',
            },
          },
        ],
      }),
    );
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'en que se parecen y se diferencian ambos proyectos?',
      history: [
        {
          role: 'user',
          content: 'Quiero saber cuantos proyectos de los ángeles hay y muestramelos',
        },
        {
          role: 'assistant',
          content:
            'Hay 2 proyectos en Los Ángeles: Finanzas Pro-Comunales y Upcycling intercultural.',
        },
      ],
      proyectos: apps,
      catalogs: buildVitrinaAiCatalogs(
        {
          fondos: [],
          sedes: ['Los Ángeles'],
          escuelas: [],
          etiquetas: [],
        },
        apps,
      ),
      currentFilters: {
        fondos: [],
        sedes: ['Los Ángeles'],
        escuelas: [],
        etiquetas: [],
      },
      currentMatchIds: ['p-la-1', 'p-la-2'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.matchIds).toEqual(['p-la-1', 'p-la-2']);
    expect(result.filters.sedes).toEqual(['Los Ángeles']);
    expect(result.reply).toMatch(/Se parecen/i);
    expect(result.reply).not.toMatch(/ningún proyecto menciona ese tema/i);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('resume de qué se trata el proyecto del conjunto y no usa el atajo de tema', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-aula',
        nombre: 'Aula Inclusiva con IA',
        descripcion:
          'Plataforma de apoyo docente con inteligencia artificial para estudiantes con necesidades educativas especiales en la sede Online.',
        sedes: ['Online'],
      },
      {
        id: 'p-bee',
        nombre: 'Beehappy',
        descripcion: 'Reservorio apícola',
        sedes: ['Curicó'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content:
                'Aula Inclusiva con IA es una plataforma de apoyo docente con inteligencia artificial para la inclusión.',
            },
          },
        ],
      }),
    );
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'y de que se trata? resumidamente',
      history: [
        { role: 'user', content: 'Cuantos proyectos de la sede online hay?' },
        {
          role: 'assistant',
          content: 'Sí, hay 1 proyecto: Aula Inclusiva con IA.',
        },
      ],
      proyectos: apps,
      catalogs: buildVitrinaAiCatalogs(
        {
          fondos: [],
          sedes: ['Online', 'Curicó'],
          escuelas: [],
          etiquetas: [],
        },
        apps,
      ),
      currentFilters: {
        fondos: [],
        sedes: ['Online'],
        escuelas: [],
        etiquetas: [],
      },
      currentMatchIds: ['p-aula'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.matchIds).toEqual(['p-aula']);
    expect(result.reply).toMatch(/Aula Inclusiva/i);
    expect(result.reply).not.toMatch(/ningún proyecto menciona ese tema/i);
    expect(fetchImpl).toHaveBeenCalled();
  });

  it('activa la búsqueda web de OpenRouter solo si se pide internet', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content:
                'En internet hay notas recientes sobre hidrógeno verde. En la vitrina está el proyecto Hidrógeno verde.',
            },
          },
        ],
      }),
    );
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'busca en internet noticias sobre hidrogeno verde',
      history: [],
      proyectos,
      catalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.reply).toMatch(/internet/i);
    expect(fetchImpl).toHaveBeenCalled();
    const body = JSON.parse(
      String((fetchImpl.mock.calls[0]?.[1] as { body?: string } | undefined)?.body),
    ) as { tools?: Array<{ type?: string }> };
    expect(
      body.tools?.some((tool) => tool.type === 'openrouter:web_search'),
    ).toBe(true);
  });

  it('encuentra un tema si está en la etiqueta aunque no esté en la descripción', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-up',
        nombre: 'Upcycling intercultural',
        descripcion: 'Reutilización de materiales con la comunidad',
        etiquetas: ['Pueblos originarios'],
        fondos: ['Fondo Impulsa'],
      },
      {
        id: 'p-fin',
        nombre: 'Finanzas Pro-Comunales',
        descripcion: 'Capacitación a pymes',
        etiquetas: ['Pymes'],
        fondos: ['Fondo Impulsa'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      {
        fondos: ['Fondo Impulsa'],
        sedes: [],
        escuelas: [],
        etiquetas: ['Pueblos originarios', 'Pymes'],
      },
      apps,
    );
    const fetchImpl = vi.fn();
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage:
        'alguno de estos proyectos aborda a los pueblos originarios?',
      history: [],
      proyectos: apps,
      catalogs: appCatalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.reply).toMatch(/Upcycling intercultural/i);
    expect(result.reply).not.toMatch(/ningún proyecto/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('abejas no incluye un proyecto de finanzas solo porque la pregunta dice trabaja', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-bee',
        nombre: 'Beehappy: Reservorio Apícola Ecológico y Regenerativo',
        descripcion: 'Reservorio apícola ecológico',
        etiquetas: ['Biodiversidad'],
      },
      {
        id: 'p-fin',
        nombre: 'Finanzas Pro-Comunales',
        descripcion: 'App de gestión financiera y trabajo decente para microemprendedoras',
        etiquetas: ['Contabilidad y finanzas'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const fetchImpl = vi.fn();
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: '¿algun proyecto trabaja con abejas?',
      history: [],
      proyectos: apps,
      catalogs: buildVitrinaAiCatalogs(
        {
          fondos: [],
          sedes: [],
          escuelas: [],
          etiquetas: ['Biodiversidad', 'Contabilidad y finanzas'],
        },
        apps,
      ),
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reply).toMatch(/Beehappy/i);
    expect(result.reply).not.toMatch(/Finanzas Pro-Comunales/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('un saludo no se responde como búsqueda de tema', async () => {
    const fetchImpl = vi.fn();
    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'Hola, en qué puedes ayudarme?',
      history: [],
      proyectos,
      catalogs,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.reply).toMatch(/vitrina/i);
    expect(result.reply).not.toMatch(/ningún proyecto dice/i);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('una pregunta de contenido no cambia los filtros actuales', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-agro',
        nombre: 'AgroTech Inclusivo 4.0',
        descripcion: 'Robótica y energía sustentable para la agricultura',
        etiquetas: ['Agricultura'],
      },
      {
        id: 'p-app',
        nombre: 'ClinicApp',
        etiquetas: ['Plataformas digitales'],
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      {
        fondos: [],
        sedes: [],
        escuelas: [],
        etiquetas: ['Agricultura', 'Plataformas digitales'],
      },
      apps,
    );

    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content:
                'AgroTech Inclusivo 4.0 usa robótica y energía sustentable en la agricultura.',
            },
          },
        ],
      }),
    );

    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage:
        'y ese proyecto cómo trabaja la agricultura, que hace con la agricultura?',
      history: [
        { role: 'user', content: 'busco un proyecto agrícola' },
        { role: 'assistant', content: 'Encontré AgroTech Inclusivo 4.0.' },
      ],
      proyectos: apps,
      catalogs: appCatalogs,
      currentFilters: {
        fondos: [],
        sedes: [],
        escuelas: [],
        etiquetas: [],
      },
      currentMatchIds: ['p-agro'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.matchIds).toEqual(['p-agro']);
  });

  it('ignora clear_filters si la pregunta es de contenido', async () => {
    const parsed = normalizeVitrinaProyectos([
      {
        id: 'p-agro',
        nombre: 'AgroTech Inclusivo 4.0',
        descripcion: 'Agricultura con robótica',
      },
    ]);
    if (!parsed.ok) throw new Error(parsed.error);
    const apps = parsed.proyectos;
    const appCatalogs = buildVitrinaAiCatalogs(
      { fondos: [], sedes: [], escuelas: [], etiquetas: [] },
      apps,
    );

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
                tool_calls: [toolCall('c1', 'clear_filters', {})],
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
              content: 'Trabaja la agricultura con robótica.',
            },
          },
        ],
      });
    });

    const result = await runVitrinaAiOrchestrator({
      apiKey: 'sk-or-test',
      model: 'openai/gpt-4o-mini',
      userMessage: 'qué hace ese proyecto con la agricultura?',
      history: [
        { role: 'user', content: 'busco un proyecto agrícola' },
        { role: 'assistant', content: 'AgroTech Inclusivo 4.0.' },
      ],
      proyectos: apps,
      catalogs: appCatalogs,
      currentMatchIds: ['p-agro'],
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.applied).toBe(false);
    expect(result.matchIds).toEqual(['p-agro']);
  });
});
