import { describe, expect, it } from 'vitest';
import { buildVitrinaAiCatalogs } from '@/lib/vitrina-ai-index';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  classifyVitrinaAiIntent,
  isVitrinaAiChatMetaQuery,
  isVitrinaAiTopicQuery,
  vitrinaAiQueryRefersToPrevious,
} from '@/lib/vitrina-ai-intent';

function sampleCatalogs() {
  const result = normalizeVitrinaProyectos([
    {
      id: 'p-h2',
      nombre: 'Hidrógeno verde',
      descripcion: 'Generación de energía eléctrica',
      fondos: ['Fondo Impulsa'],
      sedes: ['Castro'],
    },
    {
      id: 'p-move',
      nombre: 'Innovation Class',
      fondos: ['MOVE Incuba'],
      sedes: ['Chillán'],
    },
  ]);
  if (!result.ok) throw new Error(result.error);
  return buildVitrinaAiCatalogs(
    {
      fondos: ['Fondo Impulsa', 'MOVE Incuba'],
      sedes: ['Castro', 'Chillán'],
      escuelas: ['Ingeniería, Energía y Tecnología'],
      etiquetas: ['Plataformas digitales'],
    },
    result.proyectos,
  );
}

describe('classifyVitrinaAiIntent', () => {
  const catalogs = sampleCatalogs();

  it('trata la primera búsqueda como search', () => {
    expect(
      classifyVitrinaAiIntent('necesito ver proyectos de plataforma', 0, catalogs),
    ).toBe('search');
    expect(classifyVitrinaAiIntent('huerta en Valparaíso', 0, catalogs)).toBe(
      'search',
    );
  });

  it('no cambia filtros si pregunta por el contenido de un proyecto ya visto', () => {
    expect(
      classifyVitrinaAiIntent(
        'y ese proyecto cómo trabaja la agricultura, que hace con la agricultura?',
        2,
        catalogs,
      ),
    ).toBe('detail');
  });

  it('sigue siendo search si pide otro conjunto de proyectos', () => {
    expect(
      classifyVitrinaAiIntent(
        'ahora necesito otro proyecto que use hidrogeno',
        2,
        catalogs,
      ),
    ).toBe('search');
  });

  it('trata un recuento por fondo como pregunta, no como filtro', () => {
    expect(
      classifyVitrinaAiIntent('y cuantos son de Move Incuba', 2, catalogs),
    ).toBe('ask');
    expect(
      classifyVitrinaAiIntent(
        '¿cuántos proyectos de Move Incuba hay en curso?',
        0,
        catalogs,
      ),
    ).toBe('ask');
    expect(
      classifyVitrinaAiIntent('cuántos hay del fondo Impulsa', 2, catalogs),
    ).toBe('ask');
    expect(
      classifyVitrinaAiIntent('cuántos proyectos hay en curso', 0, catalogs),
    ).toBe('ask');
    expect(
      classifyVitrinaAiIntent('Hay de Impulsa?', 0, catalogs),
    ).toBe('ask');
    expect(
      classifyVitrinaAiIntent('quiero ver cuántos de Impulsa', 0, catalogs),
    ).toBe('ask');
  });

  it('filtra solo si pide ver o mostrar tarjetas', () => {
    expect(
      classifyVitrinaAiIntent('muéstrame los de Move Incuba', 2, catalogs),
    ).toBe('search');
    expect(
      classifyVitrinaAiIntent('quiero ver los proyectos de Impulsa', 0, catalogs),
    ).toBe('search');
    expect(
      classifyVitrinaAiIntent('necesito ver proyectos de plataforma', 0, catalogs),
    ).toBe('search');
    expect(classifyVitrinaAiIntent('los de Impulsa', 0, catalogs)).toBe('search');
    expect(classifyVitrinaAiIntent('solo Castro', 2, catalogs)).toBe('search');
    expect(classifyVitrinaAiIntent('Impulsa', 0, catalogs)).toBe('search');
  });

  it('no trata el nombre de un proyecto como filtro de fondo', () => {
    expect(classifyVitrinaAiIntent('Innovation Class', 0, catalogs)).toBe(
      'search',
    );
  });

  it('trata un saludo o pedido de ayuda como conversación, no como tema', () => {
    expect(
      isVitrinaAiTopicQuery('Hola, en qué puedes ayudarme?', catalogs),
    ).toBe(false);
    expect(
      isVitrinaAiChatMetaQuery('Hola, en qué puedes ayudarme?', catalogs),
    ).toBe(true);
    expect(
      classifyVitrinaAiIntent('Hola, en qué puedes ayudarme?', 0, catalogs),
    ).toBe('detail');
  });

  it('detecta una pregunta de tema, no de escuela o fondo', () => {
    expect(
      isVitrinaAiTopicQuery('y alguno de esos es de electricidad?', catalogs),
    ).toBe(true);
    expect(isVitrinaAiTopicQuery('se trata de energía eléctrica?', catalogs)).toBe(
      true,
    );
    expect(
      isVitrinaAiTopicQuery('¿hay proyectos de electricidad?', catalogs),
    ).toBe(true);
    expect(
      isVitrinaAiTopicQuery(
        'cuántos proyectos de fondo Impulsa hay en curso?',
        catalogs,
      ),
    ).toBe(false);
    expect(isVitrinaAiTopicQuery('¿hay alguno en Castro?', catalogs)).toBe(false);
  });

  it('un recuento por sede con alguno no es tema', () => {
    expect(classifyVitrinaAiIntent('¿hay alguno en Castro?', 0, catalogs)).toBe(
      'ask',
    );
  });

  it('detecta reset', () => {
    expect(classifyVitrinaAiIntent('mostrar todos', 2, catalogs)).toBe('reset');
    expect(classifyVitrinaAiIntent('borra el filtro', 2, catalogs)).toBe('reset');
    expect(classifyVitrinaAiIntent('sin filtros', 2, catalogs)).toBe('reset');
    expect(classifyVitrinaAiIntent('volver a todos', 2, catalogs)).toBe('reset');
  });

  it('trata un follow-up breve como referencia al conjunto anterior', () => {
    expect(vitrinaAiQueryRefersToPrevious('¿y de electricidad?', 2)).toBe(true);
    expect(vitrinaAiQueryRefersToPrevious('¿y en Castro?', 2)).toBe(true);
    expect(
      vitrinaAiQueryRefersToPrevious('y cuantos son de Move Incuba', 2),
    ).toBe(false);
    expect(classifyVitrinaAiIntent('¿y en Castro?', 2, catalogs)).toBe('ask');
  });
});
