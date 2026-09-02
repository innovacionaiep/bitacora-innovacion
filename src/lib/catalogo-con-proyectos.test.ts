import { describe, expect, it } from 'vitest';
import { mapCatalogoConProyectos } from '@/lib/catalogo-con-proyectos';

describe('mapCatalogoConProyectos', () => {
  it('maps each catalog item with sorted unique project names', () => {
    const result = mapCatalogoConProyectos([
      {
        id: 'a1',
        nombre: 'Taller de marca',
        proyectos: [
          { proyecto: { proyecto: 'Beta' } },
          { proyecto: { proyecto: 'Alfa' } },
          { proyecto: { proyecto: 'Beta' } },
        ],
      },
      {
        id: 'a2',
        nombre: 'Sin uso',
        proyectos: [],
      },
    ]);

    expect(result).toEqual([
      {
        id: 'a1',
        nombre: 'Taller de marca',
        proyectosNombres: ['Alfa', 'Beta'],
      },
      {
        id: 'a2',
        nombre: 'Sin uso',
        proyectosNombres: [],
      },
    ]);
  });

  it('ignores blank project names', () => {
    const result = mapCatalogoConProyectos([
      {
        id: 'a1',
        nombre: 'X',
        proyectos: [
          { proyecto: { proyecto: '  ' } },
          { proyecto: { proyecto: 'Uno' } },
        ],
      },
    ]);

    expect(result[0]?.proyectosNombres).toEqual(['Uno']);
  });

  it('merges project names from catalog joins and participantes', () => {
    const result = mapCatalogoConProyectos([
      {
        id: 'a1',
        nombre: 'Asignatura de prueba',
        proyectos: [],
        proyectoParticipantes: [
          { proyecto: { proyecto: 'Proyecto Z' } },
          { proyecto: { proyecto: 'Proyecto A' } },
          { proyecto: { proyecto: 'Proyecto Z' } },
        ],
      },
    ]);

    expect(result[0]?.proyectosNombres).toEqual(['Proyecto A', 'Proyecto Z']);
  });
});
