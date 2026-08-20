import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  buildVitrinaAiIndex,
  resolveCatalogValues,
  searchVitrinaAiIndex,
} from '@/lib/vitrina-ai-index';

function sampleProjects() {
  const result = normalizeVitrinaProyectos([
    {
      id: 'p-huerta',
      nombre: 'Huerta comunitaria',
      descripcion: 'Cultivo agroecológico con vecinos de Valparaíso',
      sedes: ['Valparaíso'],
      etiquetas: ['Sostenibilidad'],
      encargadoNombre: 'Ana Pérez',
      encargadoCargo: 'Coordinadora',
      encargadoCorreo: 'ana@ejemplo.cl',
      fotos: [
        {
          url: 'https://res.cloudinary.com/demo/image/upload/huerta.jpg',
          publicId: 'huerta',
        },
      ],
    },
    {
      id: 'p-salud',
      nombre: 'Feria de salud',
      descripcion: 'Prevención en escuelas de Concepción',
      sedes: ['Concepción'],
      escuelas: ['Salud'],
      etiquetas: ['Campamentos'],
    },
  ]);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('buildVitrinaAiIndex', () => {
  it('incluye metadata de vitrina y omite email y fotos', () => {
    const index = buildVitrinaAiIndex(sampleProjects());
    const huerta = index.find((item) => item.id === 'p-huerta');
    expect(huerta).toMatchObject({
      id: 'p-huerta',
      nombre: 'Huerta comunitaria',
      descripcion: 'Cultivo agroecológico con vecinos de Valparaíso',
      sedes: ['Valparaíso'],
      etiquetas: ['Sostenibilidad'],
      encargadoNombre: 'Ana Pérez',
      encargadoCargo: 'Coordinadora',
    });
    const serialized = JSON.stringify(index);
    expect(serialized).not.toContain('ana@ejemplo.cl');
    expect(serialized).not.toContain('cloudinary');
    expect(serialized).not.toContain('encargadoCorreo');
    expect(serialized).not.toContain('fotos');
  });
});

describe('searchVitrinaAiIndex', () => {
  const index = buildVitrinaAiIndex(sampleProjects());

  it('encuentra por descripción y sede', () => {
    const hits = searchVitrinaAiIndex(index, 'huerta en valparaiso');
    expect(hits.map((h) => h.id)).toEqual(['p-huerta']);
    expect(hits[0]?.matched.length).toBeGreaterThan(0);
  });

  it('encuentra por etiqueta', () => {
    const hits = searchVitrinaAiIndex(index, 'sostenibilidad');
    expect(hits.map((h) => h.id)).toEqual(['p-huerta']);
  });

  it('encuentra "plataforma" aunque la etiqueta esté en plural', () => {
    const result = normalizeVitrinaProyectos([
      {
        id: 'p-app',
        nombre: 'ClinicApp',
        etiquetas: ['Plataformas digitales'],
      },
      {
        id: 'p-verde',
        nombre: 'Hidrógeno verde',
        etiquetas: ['Energías renovables'],
      },
    ]);
    if (!result.ok) throw new Error(result.error);
    const hits = searchVitrinaAiIndex(
      buildVitrinaAiIndex(result.proyectos),
      'necesito ver proyectos de plataforma',
    );
    expect(hits.map((h) => h.id)).toEqual(['p-app']);
  });

  it('no inventa proyectos si nada coincide', () => {
    expect(searchVitrinaAiIndex(index, 'astrofísica cuántica')).toEqual([]);
  });
});

describe('resolveCatalogValues', () => {
  it('resuelve un fragmento a la etiqueta canónica', () => {
    expect(
      resolveCatalogValues(
        ['plataforma'],
        ['Plataformas digitales', 'Sostenibilidad'],
      ),
    ).toEqual(['Plataformas digitales']);
  });
});
