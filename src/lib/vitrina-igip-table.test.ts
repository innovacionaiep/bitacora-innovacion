import { describe, expect, it } from 'vitest';
import {
  indicadoresHeaderGroups,
  indicadoresTableColumns,
} from '@/lib/vitrina-igip-table';

describe('vitrina-igip-table', () => {
  it('en IGIP expandido pone las 6 notas a la izquierda de cada índice', () => {
    const cols = indicadoresTableColumns({
      family: 'igip',
      stadiumVisible: { inicial: true, proyeccion: true, final: true },
      expandSubdimensions: true,
    });
    const keys = cols.map((c) => c.key);
    expect(keys.indexOf('igipInicialOriginalidad')).toBeLessThan(
      keys.indexOf('igipInicial'),
    );
    expect(keys.indexOf('igipProyeccionOriginalidad')).toBeLessThan(
      keys.indexOf('igipProyeccion'),
    );
    expect(keys.indexOf('igipFinalOriginalidad')).toBeLessThan(
      keys.indexOf('igipFinal'),
    );
    expect(keys).not.toContain('trlInicial');
  });

  it('colapsar un estadio oculta índice, comentario y notas', () => {
    const cols = indicadoresTableColumns({
      family: 'igip',
      stadiumVisible: { inicial: true, proyeccion: false, final: true },
      expandSubdimensions: true,
    });
    const keys = cols.map((c) => c.key);
    expect(keys).toContain('igipInicial');
    expect(keys).not.toContain('igipProyeccion');
    expect(keys).not.toContain('igipProyeccionOriginalidad');
    expect(keys).toContain('igipFinal');
  });

  it('sin expandir no muestra las 6 notas y TRL no muestra IGIP', () => {
    const igip = indicadoresTableColumns({
      family: 'igip',
      stadiumVisible: { inicial: true, proyeccion: true, final: true },
      expandSubdimensions: false,
    });
    expect(igip.map((c) => c.key)).toEqual([
      'nombre',
      'igipInicial',
      'igipInicialComentario',
      'igipProyeccion',
      'igipFinal',
      'igipFinalComentario',
    ]);
    const trl = indicadoresTableColumns({
      family: 'trl',
      stadiumVisible: { inicial: true, proyeccion: true, final: true },
      expandSubdimensions: true,
    });
    expect(trl.map((c) => c.key)).not.toContain('igipInicial');
    expect(trl.map((c) => c.key)).toContain('trlFinal');
  });

  it('agrupa headers por estadio', () => {
    const cols = indicadoresTableColumns({
      family: 'igip',
      stadiumVisible: { inicial: true, proyeccion: true, final: false },
      expandSubdimensions: false,
    });
    const groups = indicadoresHeaderGroups(cols);
    expect(groups.map((g) => g.label)).toEqual(['', 'Inicial', 'Proyección']);
  });
});
