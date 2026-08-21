import { describe, expect, it } from 'vitest';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  buildVitrinaAiCatalogs,
  buildVitrinaAiIndex,
  resolveCatalogValues,
  searchVitrinaAiIndex,
  summarizeVitrinaAiFacets,
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

  it('en preguntas temáticas no usa la escuela, solo la descripción', () => {
    const result = normalizeVitrinaProyectos([
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
    ]);
    if (!result.ok) throw new Error(result.error);
    const index = buildVitrinaAiIndex(result.proyectos);

    const electricidad = searchVitrinaAiIndex(
      index,
      'y alguno de esos es de electricidad',
      'description',
    );
    expect(electricidad.map((h) => h.id)).toEqual(['p-h2']);
    expect(electricidad[0]?.matched).toEqual(['descripcion']);

    const energiaPorEscuela = searchVitrinaAiIndex(index, 'energia');
    expect(energiaPorEscuela.map((h) => h.id).sort()).toEqual(['p-con', 'p-h2']);
    const energiaEnDescripcion = searchVitrinaAiIndex(index, 'energia', 'description');
    expect(energiaEnDescripcion.map((h) => h.id)).toEqual(['p-h2']);
  });

  it('en preguntas temáticas sí usa la etiqueta explícita', () => {
    const result = normalizeVitrinaProyectos([
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
    if (!result.ok) throw new Error(result.error);
    const proyectos = result.proyectos;
    const catalogs = buildVitrinaAiCatalogs(
      {
        fondos: ['Fondo Impulsa'],
        sedes: [],
        escuelas: [],
        etiquetas: ['Pueblos originarios', 'Pymes'],
      },
      proyectos,
    );
    const hits = searchVitrinaAiIndex(
      buildVitrinaAiIndex(proyectos),
      'alguno de estos proyectos aborda a los pueblos originarios?',
      'topic',
      catalogs,
    );
    expect(hits.map((h) => h.id)).toEqual(['p-up']);
    expect(hits[0]?.matched).toContain('etiquetas');
  });

  it('exige fondo y sede a la vez si ambos están en la consulta', () => {
    const result = normalizeVitrinaProyectos([
      {
        id: 'p-castro',
        nombre: 'ClinicApp',
        fondos: ['Fondo Impulsa'],
        sedes: ['Castro'],
      },
      {
        id: 'p-conce',
        nombre: 'AgroTech',
        fondos: ['Fondo Impulsa'],
        sedes: ['Concepción'],
      },
    ]);
    if (!result.ok) throw new Error(result.error);
    const proyectos = result.proyectos;
    const catalogs = buildVitrinaAiCatalogs(
      {
        fondos: ['Fondo Impulsa'],
        sedes: ['Castro', 'Concepción'],
        escuelas: [],
        etiquetas: [],
      },
      proyectos,
    );
    const hits = searchVitrinaAiIndex(
      buildVitrinaAiIndex(proyectos),
      'Impulsa en Castro',
      'all',
      catalogs,
    );
    expect(hits.map((h) => h.id)).toEqual(['p-castro']);
  });

  it('encuentra por sede aunque la descripción no la nombre', () => {
    const result = normalizeVitrinaProyectos([
      {
        id: 'p-castro',
        nombre: 'ClinicApp',
        descripcion: 'App clínica para pacientes',
        sedes: ['Castro'],
      },
    ]);
    if (!result.ok) throw new Error(result.error);
    const proyectos = result.proyectos;
    const catalogs = buildVitrinaAiCatalogs(
      { fondos: [], sedes: ['Castro'], escuelas: [], etiquetas: [] },
      proyectos,
    );
    const hits = searchVitrinaAiIndex(
      buildVitrinaAiIndex(proyectos),
      '¿hay alguno en Castro?',
      'all',
      catalogs,
    );
    expect(hits.map((h) => h.id)).toEqual(['p-castro']);
    expect(hits[0]?.matched).toContain('sedes');
  });

  it('encuentra por fondo aunque la pregunta sea de recuento', () => {
    const result = normalizeVitrinaProyectos([
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
    if (!result.ok) throw new Error(result.error);
    const hits = searchVitrinaAiIndex(
      buildVitrinaAiIndex(result.proyectos),
      'y cuantos son de Move Incuba',
    );
    expect(hits.map((h) => h.id)).toEqual(['p-move']);
    expect(hits[0]?.matched).toContain('fondos');
  });
});

describe('summarizeVitrinaAiFacets', () => {
  it('cuenta proyectos por fondo', () => {
    const result = normalizeVitrinaProyectos([
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
      {
        id: 'p-verde',
        nombre: 'CONenergía',
        fondos: ['Fondo Impulsa'],
      },
    ]);
    if (!result.ok) throw new Error(result.error);
    const summary = summarizeVitrinaAiFacets(buildVitrinaAiIndex(result.proyectos));
    expect(summary).toContain('MOVE Incuba (1)');
    expect(summary).toContain('Fondo Impulsa (2)');
    expect(summary).toContain('lineas:');
    expect(summary).toContain('socios:');
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
