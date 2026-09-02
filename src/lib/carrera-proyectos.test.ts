import { describe, expect, it } from 'vitest';
import { mapCarrerasConProyectos } from '@/lib/carrera-proyectos';

describe('mapCarrerasConProyectos', () => {
  it('maps each carrera with sorted unique project names', () => {
    const result = mapCarrerasConProyectos([
      {
        id: 'c1',
        nombre: 'Auditoría',
        proyectos: [
          { proyecto: { proyecto: 'Beta' } },
          { proyecto: { proyecto: 'Alfa' } },
          { proyecto: { proyecto: 'Beta' } },
        ],
      },
      {
        id: 'c2',
        nombre: 'Diseño',
        proyectos: [],
      },
    ]);

    expect(result).toEqual([
      {
        id: 'c1',
        nombre: 'Auditoría',
        proyectosNombres: ['Alfa', 'Beta'],
      },
      {
        id: 'c2',
        nombre: 'Diseño',
        proyectosNombres: [],
      },
    ]);
  });

  it('ignores blank project names', () => {
    const result = mapCarrerasConProyectos([
      {
        id: 'c1',
        nombre: 'X',
        proyectos: [
          { proyecto: { proyecto: '  ' } },
          { proyecto: { proyecto: 'Uno' } },
        ],
      },
    ]);

    expect(result[0]?.proyectosNombres).toEqual(['Uno']);
  });
});
