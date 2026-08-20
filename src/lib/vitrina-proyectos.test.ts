import { describe, expect, it } from 'vitest';
import {
  applySocioNombreToVitrinaProyectos,
  freezeCatalogPair,
  namesToCatalogSelection,
  normalizeVitrinaProyectos,
  parseStoredVitrinaProyectos,
  removeVitrinaProyectoFromList,
  upsertVitrinaProyectoInList,
  vitrinaCoverImageStyle,
  VITRINA_PROYECTOS_MAX,
  VITRINA_PROYECTOS_MAX_FOTOS,
  type VitrinaProyecto,
} from '@/lib/vitrina-proyectos';

const catalog = {
  id: 'f1',
  nombre: 'Fondo A',
};

describe('namesToCatalogSelection', () => {
  it('resuelve ids y congela nombres del catálogo', () => {
    expect(
      namesToCatalogSelection(['Fondo A', 'inexistente'], [catalog]),
    ).toEqual({ ids: ['f1'], names: ['Fondo A'] });
  });
});

describe('freezeCatalogPair', () => {
  it('prioriza ids vigentes del catálogo', () => {
    expect(
      freezeCatalogPair(['f1'], ['nombre viejo'], [catalog]),
    ).toEqual({ ids: ['f1'], names: ['Fondo A'] });
  });
});

describe('applySocioNombreToVitrinaProyectos', () => {
  it('renombra el socio en las fichas que lo tienen por id', () => {
    const hit = {
      ...named('Con socio', 'vp-1'),
      socioIds: ['s1', 's2'],
      socios: ['Viejo', 'Otro'],
    };
    const miss = {
      ...named('Sin ese socio', 'vp-2'),
      socioIds: ['s2'],
      socios: ['Otro'],
    };
    const result = applySocioNombreToVitrinaProyectos(
      [hit, miss],
      's1',
      'Nuevo nombre',
    );
    expect(result.changed).toBe(true);
    expect(result.proyectos[0]?.socios).toEqual(['Nuevo nombre', 'Otro']);
    expect(result.proyectos[1]?.socios).toEqual(['Otro']);
  });

  it('no marca cambio si el nombre ya coincide o el id no aparece', () => {
    const p = {
      ...named('X', 'vp-1'),
      socioIds: ['s1'],
      socios: ['Igual'],
    };
    expect(
      applySocioNombreToVitrinaProyectos([p], 's1', 'Igual').changed,
    ).toBe(false);
    expect(
      applySocioNombreToVitrinaProyectos([p], 's-otro', 'Nuevo').changed,
    ).toBe(false);
  });
});

describe('normalizeVitrinaProyectos', () => {
  it('acepta un proyecto con nombre y congela catálogos', () => {
    const result = normalizeVitrinaProyectos([
      {
        nombre: '  Huerta comunitaria  ',
        descripcion: 'Desc',
        fondoIds: ['f1'],
        fondos: ['Fondo A'],
        etiquetas: 'social,  territorio',
        encargadoCorreo: 'a@b.cl',
        videoUrl: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
        fotos: [
          { url: 'https://res.cloudinary.com/x/image/upload/a.jpg', publicId: 'a' },
        ],
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos).toHaveLength(1);
    const p = result.proyectos[0];
    expect(p?.nombre).toBe('Huerta comunitaria');
    expect(p?.fondos).toEqual(['Fondo A']);
    expect(p?.etiquetas).toEqual(['social', 'territorio']);
    expect(p?.etiquetaIds).toEqual([]);
    expect(p?.videoUrl).toContain('youtube');
    expect(p?.fotos).toHaveLength(1);
    expect(p?.coverOffsetY).toBe(50);
    expect(p?.coverOffsetX).toBe(50);
    expect(p?.coverZoom).toBe(1);
    expect(p?.id).toBeTruthy();
  });

  it('acepta coverOffsetY y lo recorta a 0–100', () => {
    const high = normalizeVitrinaProyectos([{ nombre: 'A', coverOffsetY: 140 }]);
    const low = normalizeVitrinaProyectos([{ nombre: 'B', coverOffsetY: -8 }]);
    expect(high.ok && high.proyectos[0]?.coverOffsetY).toBe(100);
    expect(low.ok && low.proyectos[0]?.coverOffsetY).toBe(0);
  });

  it('acepta coverOffsetX y coverZoom acotados', () => {
    const result = normalizeVitrinaProyectos([
      { nombre: 'A', coverOffsetX: 140, coverZoom: 4 },
    ]);
    expect(result.ok && result.proyectos[0]?.coverOffsetX).toBe(100);
    expect(result.ok && result.proyectos[0]?.coverZoom).toBe(3);
    const low = normalizeVitrinaProyectos([
      { nombre: 'B', coverOffsetX: -2, coverZoom: 0.2 },
    ]);
    expect(low.ok && low.proyectos[0]?.coverOffsetX).toBe(0);
    expect(low.ok && low.proyectos[0]?.coverZoom).toBe(1);
  });

  it('acepta descripcionFontSize por proyecto y lo recorta', () => {
    const def = normalizeVitrinaProyectos([{ nombre: 'A' }]);
    expect(def.ok && def.proyectos[0]?.descripcionFontSize).toBe(15);
    const high = normalizeVitrinaProyectos([
      { nombre: 'B', descripcionFontSize: 80 },
    ]);
    expect(high.ok && high.proyectos[0]?.descripcionFontSize).toBe(28);
    const low = normalizeVitrinaProyectos([
      { nombre: 'C', descripcionFontSize: 8 },
    ]);
    expect(low.ok && low.proyectos[0]?.descripcionFontSize).toBe(12);
  });

  it('arma el estilo de portada con origen y escala', () => {
    expect(vitrinaCoverImageStyle(20, 80, 1.5)).toEqual({
      objectPosition: '20% 80%',
      transform: 'scale(1.5)',
      transformOrigin: '20% 80%',
    });
  });

  it('omite filas sin nombre', () => {
    const result = normalizeVitrinaProyectos([
      { nombre: '', descripcion: 'x' },
      { nombre: 'Vivo' },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos).toHaveLength(1);
    expect(result.proyectos[0]?.nombre).toBe('Vivo');
  });

  it('acepta lista vacía', () => {
    const result = normalizeVitrinaProyectos([]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos).toEqual([]);
  });

  it('rechaza más del máximo', () => {
    const items = Array.from({ length: VITRINA_PROYECTOS_MAX + 1 }, (_, i) => ({
      nombre: `P${i}`,
    }));
    expect(normalizeVitrinaProyectos(items).ok).toBe(false);
  });

  it('rechaza video que no es YouTube, Vimeo ni SharePoint', () => {
    const result = normalizeVitrinaProyectos([
      { nombre: 'X', videoUrl: 'https://example.com/video' },
    ]);
    expect(result.ok).toBe(false);
  });

  it('acepta Vimeo', () => {
    const result = normalizeVitrinaProyectos([
      { nombre: 'X', videoUrl: 'https://vimeo.com/76979871' },
    ]);
    expect(result.ok).toBe(true);
  });

  it('acepta video de SharePoint Stream', () => {
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'X',
        videoUrl:
          'https://ipaiep-my.sharepoint.com/personal/jeremy_torres_aiep_cl/_layouts/15/stream.aspx?id=%2Fpersonal%2Fjeremy%5Ftorres%5Faiep%5Fcl%2FDocuments%2FDocumentos%2FClinicApp%2EMP4',
      },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos[0]?.videoUrl).toContain('sharepoint.com');
  });

  it('rechaza correo inválido', () => {
    const result = normalizeVitrinaProyectos([
      { nombre: 'X', encargadoCorreo: 'no-es-mail' },
    ]);
    expect(result.ok).toBe(false);
  });

  it('recorta fotos al máximo', () => {
    const fotos = Array.from(
      { length: VITRINA_PROYECTOS_MAX_FOTOS + 2 },
      (_, i) => ({
        url: `https://res.cloudinary.com/x/image/upload/${i}.jpg`,
        publicId: `id-${i}`,
      }),
    );
    const result = normalizeVitrinaProyectos([{ nombre: 'X', fotos }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos[0]?.fotos).toHaveLength(VITRINA_PROYECTOS_MAX_FOTOS);
  });
});

describe('parseStoredVitrinaProyectos', () => {
  it('lee JSON válido', () => {
    const proyectos = parseStoredVitrinaProyectos(
      JSON.stringify([{ nombre: 'Demo', sedes: ['Santiago'] }]),
    );
    expect(proyectos?.[0]?.nombre).toBe('Demo');
    expect(proyectos?.[0]?.sedes).toEqual(['Santiago']);
  });

  it('retorna null si el JSON es inválido', () => {
    expect(parseStoredVitrinaProyectos('no-json')).toBeNull();
    expect(parseStoredVitrinaProyectos(null)).toBeNull();
  });
});

function named(nombre: string, id?: string): VitrinaProyecto {
  const result = normalizeVitrinaProyectos([{ id, nombre }]);
  if (!result.ok || !result.proyectos[0]) {
    throw new Error('fixture');
  }
  return result.proyectos[0];
}

describe('upsertVitrinaProyectoInList', () => {
  it('agrega un proyecto con solo nombre', () => {
    const result = upsertVitrinaProyectoInList([], { nombre: '  Nuevo  ' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos).toHaveLength(1);
    expect(result.proyectos[0]?.nombre).toBe('Nuevo');
    expect(result.proyectos[0]?.id).toBeTruthy();
  });

  it('rechaza nombre vacío', () => {
    const result = upsertVitrinaProyectoInList([], {
      nombre: '   ',
      descripcion: 'x',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/nombre/i);
  });

  it('actualiza por id y conserva el resto de la lista', () => {
    const a = named('Uno', 'id-a');
    const b = named('Dos', 'id-b');
    const result = upsertVitrinaProyectoInList([a, b], {
      id: 'id-b',
      nombre: 'Dos editado',
      descripcion: 'Nueva desc',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos).toHaveLength(2);
    expect(result.proyectos[0]?.nombre).toBe('Uno');
    expect(result.proyectos[1]?.id).toBe('id-b');
    expect(result.proyectos[1]?.nombre).toBe('Dos editado');
    expect(result.proyectos[1]?.descripcion).toBe('Nueva desc');
  });

  it('rechaza agregar sobre el máximo', () => {
    const list = Array.from({ length: VITRINA_PROYECTOS_MAX }, (_, i) =>
      named(`P${i}`, `id-${i}`),
    );
    const result = upsertVitrinaProyectoInList(list, { nombre: 'Extra' });
    expect(result.ok).toBe(false);
  });

  it('permite actualizar cuando la lista ya está al máximo', () => {
    const list = Array.from({ length: VITRINA_PROYECTOS_MAX }, (_, i) =>
      named(`P${i}`, `id-${i}`),
    );
    const result = upsertVitrinaProyectoInList(list, {
      id: 'id-0',
      nombre: 'P0 editado',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos).toHaveLength(VITRINA_PROYECTOS_MAX);
    expect(result.proyectos[0]?.nombre).toBe('P0 editado');
  });

  it('rechaza correo inválido en el upsert', () => {
    const result = upsertVitrinaProyectoInList([], {
      nombre: 'X',
      encargadoCorreo: 'no-es-mail',
    });
    expect(result.ok).toBe(false);
  });
});

describe('removeVitrinaProyectoFromList', () => {
  it('quita el proyecto por id', () => {
    const a = named('Uno', 'id-a');
    const b = named('Dos', 'id-b');
    const result = removeVitrinaProyectoFromList([a, b], 'id-a');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proyectos).toHaveLength(1);
    expect(result.proyectos[0]?.id).toBe('id-b');
  });

  it('rechaza id vacío', () => {
    expect(removeVitrinaProyectoFromList([], '  ').ok).toBe(false);
  });

  it('rechaza id inexistente', () => {
    const result = removeVitrinaProyectoFromList([named('Uno', 'id-a')], 'id-x');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/no encontrado/i);
  });
});
