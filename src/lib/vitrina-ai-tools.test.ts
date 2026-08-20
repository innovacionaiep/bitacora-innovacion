import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import { EMPTY_VITRINA_FILTERS } from '@/lib/vitrina-project-filters';
import { buildVitrinaAiCatalogs, buildVitrinaAiIndex } from '@/lib/vitrina-ai-index';
import { executeVitrinaAiTool } from '@/lib/vitrina-ai-tools';

function sample() {
  const result = normalizeVitrinaProyectos([
    {
      id: 'p-huerta',
      nombre: 'Huerta comunitaria',
      descripcion: 'Cultivo agroecológico',
      sedes: ['Valparaíso'],
      etiquetas: ['Sostenibilidad'],
    },
    {
      id: 'p-salud',
      nombre: 'Feria de salud',
      sedes: ['Concepción'],
      escuelas: ['Salud'],
    },
    {
      id: 'p-app',
      nombre: 'ClinicApp',
      etiquetas: ['Plataformas digitales'],
    },
  ]);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('executeVitrinaAiTool', () => {
  const proyectos = sample();
  const index = buildVitrinaAiIndex(proyectos);
  const catalogs = buildVitrinaAiCatalogs(
    {
      fondos: [],
      sedes: ['Valparaíso', 'Concepción'],
      escuelas: ['Salud'],
      etiquetas: ['Sostenibilidad', 'Plataformas digitales'],
    },
    proyectos,
  );
  const ctx = { index, catalogs, proyectos };

  it('apply_filters resuelve nombres canónicos y descarta ids desconocidos', () => {
    const executed = executeVitrinaAiTool(
      'apply_filters',
      {
        sedes: ['valparaiso'],
        projectIds: ['p-huerta', 'no-existe'],
      },
      ctx,
    );
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    expect(executed.state.filters.sedes).toEqual(['Valparaíso']);
    expect(executed.state.matchIds).toEqual(['p-huerta']);
  });

  it('search_projects devuelve ids del índice', () => {
    const executed = executeVitrinaAiTool(
      'search_projects',
      { query: 'huerta' },
      ctx,
    );
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    expect(executed.state).toBeNull();
    const parsed = JSON.stringify(executed.content);
    expect(parsed).toContain('p-huerta');
  });

  it('apply_filters resuelve un fragmento de etiqueta', () => {
    const executed = executeVitrinaAiTool(
      'apply_filters',
      { etiquetas: ['plataforma'] },
      ctx,
    );
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    expect(executed.state?.filters.etiquetas).toEqual(['Plataformas digitales']);
  });

  it('clear_filters vacía facets e ids', () => {
    const executed = executeVitrinaAiTool('clear_filters', {}, ctx);
    expect(executed.ok).toBe(true);
    if (!executed.ok) return;
    expect(executed.state?.filters).toEqual(EMPTY_VITRINA_FILTERS);
    expect(executed.state?.matchIds).toBeNull();
  });
});
