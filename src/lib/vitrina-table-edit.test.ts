import { describe, expect, it } from 'vitest';
import {
  applyVitrinaTableCatalog,
  vitrinaTableRowFromProyecto,
} from '@/lib/vitrina-table-edit';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import type { VitrinaProjectCatalogs } from '@/lib/actions/vitrina-proyectos';

function projectFrom(row: { nombre: string; fondos?: string[]; lineas?: string[] }) {
  const result = normalizeVitrinaProyectos([row]);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos[0]!;
}

const catalogs: VitrinaProjectCatalogs = {
  fondos: [
    { id: 'f1', nombre: 'Impulsa' },
    { id: 'f2', nombre: 'Incuba' },
  ],
  lineas: [
    { id: 'l1', nombre: 'Innovación', fondoId: 'f1' },
    { id: 'l2', nombre: 'Emprendimiento', fondoId: 'f2' },
  ],
  sedes: [{ id: 's1', nombre: 'Valparaíso' }],
  escuelas: [{ id: 'e1', nombre: 'Salud' }],
  socios: [{ id: 'so1', nombre: 'ONG' }],
  comunas: [{ id: 'c1', nombre: 'Valparaíso' }],
  etiquetas: [{ id: 't1', nombre: 'Tecnología' }],
};

describe('vitrinaTableRowFromProyecto', () => {
  it('omite descripción y campos de portada', () => {
    const proyecto = projectFrom({
      nombre: 'Festival',
      fondos: ['Impulsa'],
      lineas: ['Innovación'],
    });
    const row = vitrinaTableRowFromProyecto({
      ...proyecto,
      descripcion: 'texto largo',
      videoUrl: 'https://youtu.be/abc',
    });
    expect(row).not.toHaveProperty('descripcion');
    expect(row).not.toHaveProperty('fotos');
    expect(row).not.toHaveProperty('coverOffsetX');
    expect(row.nombre).toBe('Festival');
    expect(row.fondos).toEqual(['Impulsa']);
    expect(row.videoUrl).toBe('https://youtu.be/abc');
  });
});

describe('applyVitrinaTableCatalog', () => {
  it('al cambiar fondos deja solo líneas del fondo elegido', () => {
    const base = {
      ...projectFrom({ nombre: 'A' }),
      fondoIds: ['f1', 'f2'],
      fondos: ['Impulsa', 'Incuba'],
      lineaIds: ['l1', 'l2'],
      lineas: ['Innovación', 'Emprendimiento'],
    };
    const next = applyVitrinaTableCatalog(base, 'fondos', 'Impulsa', catalogs);
    expect(next.fondos).toEqual(['Impulsa']);
    expect(next.lineas).toEqual(['Innovación']);
  });

  it('asigna comunas desde el catálogo por nombre', () => {
    const next = applyVitrinaTableCatalog(
      projectFrom({ nombre: 'A' }),
      'comunas',
      'Valparaíso',
      catalogs,
    );
    expect(next.comunaIds).toEqual(['c1']);
    expect(next.comunas).toEqual(['Valparaíso']);
  });
});
