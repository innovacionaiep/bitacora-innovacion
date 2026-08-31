import { describe, expect, it } from 'vitest';
import { decimalToNumber, mapVitrinaProyectoRow } from '@/lib/vitrina-proyectos-map';

describe('decimalToNumber', () => {
  it('convierte Decimal-like y vacíos', () => {
    expect(decimalToNumber(12.5)).toBe(12.5);
    expect(decimalToNumber('12.5')).toBe(12.5);
    expect(decimalToNumber({ toString: () => '3.25' })).toBe(3.25);
    expect(decimalToNumber(null)).toBeNull();
    expect(decimalToNumber('')).toBeNull();
  });
});

describe('mapVitrinaProyectoRow', () => {
  it('arma el tipo de UI desde joins y fotos ordenadas', () => {
    const mapped = mapVitrinaProyectoRow({
      id: 'vp-1',
      nombre: 'Festival',
      descripcion: 'Desc',
      encargadoNombre: 'Ana',
      encargadoCorreo: 'ana@aiep.cl',
      encargadoCargo: 'Encargada',
      videoUrl: 'https://vimeo.com/76979871',
      coverOffsetX: 40,
      coverOffsetY: 60,
      coverZoom: 1.2,
      descripcionFontSize: 16,
      igipInicial: '1.25',
      igipInicialComentario: 'base',
      igipProyeccion: null,
      igipFinal: 2,
      igipFinalComentario: '',
      trlInicial: 3,
      trlInicialComentario: '',
      trlProyeccion: null,
      trlFinal: 7,
      trlFinalComentario: 'cierre',
      fotos: [
        { url: 'https://a.com/2.jpg', publicId: 'p2', orden: 1 },
        { url: 'https://a.com/1.jpg', publicId: 'p1', orden: 0 },
      ],
      fondos: [{ fondo: { id: 'f1', nombre: 'Impulsa' } }],
      lineas: [{ linea: { id: 'l1', nombre: 'Innovación' } }],
      sedes: [{ sede: { id: 's1', nombre: 'Rancagua' } }],
      escuelas: [],
      socios: [{ socio: { id: 'so1', nombre: 'MUKUNA' } }],
      etiquetas: [{ etiqueta: { id: 't1', nombre: 'Arte' } }],
    });

    expect(mapped.fondos).toEqual(['Impulsa']);
    expect(mapped.fondoIds).toEqual(['f1']);
    expect(mapped.socios).toEqual(['MUKUNA']);
    expect(mapped.fotos.map((f) => f.publicId)).toEqual(['p1', 'p2']);
    expect(mapped.igipInicial).toBe(1.25);
    expect(mapped.igipProyeccion).toBeNull();
    expect(mapped.trlFinal).toBe(7);
    expect(mapped.igipInicialOriginalidad).toBeNull();
    expect(mapped.videoUrl).toContain('vimeo.com');
  });
});
