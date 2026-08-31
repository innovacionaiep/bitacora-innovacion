import { describe, expect, it } from 'vitest';
import { IGIP_SUBDIMENSIONS } from '@/lib/igip-trl';
import {
  IGIP_SCORE_FIELDS,
  asOptionalIgipScore,
  igipScoreField,
} from '@/lib/vitrina-igip-scores';

describe('vitrina-igip-scores', () => {
  it('nombra 18 campos (6 × 3 estadios) con el prefijo de estadio', () => {
    expect(IGIP_SCORE_FIELDS).toHaveLength(18);
    expect(igipScoreField('inicial', 'originalidad')).toBe(
      'igipInicialOriginalidad',
    );
    expect(igipScoreField('proyeccion', 'estadoDelArte')).toBe(
      'igipProyeccionEstadoDelArte',
    );
    expect(igipScoreField('final', 'transferenciaTecnologica')).toBe(
      'igipFinalTransferenciaTecnologica',
    );
    expect(
      IGIP_SUBDIMENSIONS.every((dim) =>
        IGIP_SCORE_FIELDS.includes(igipScoreField('inicial', dim.key)),
      ),
    ).toBe(true);
  });

  it('acepta enteros 0–4 y rechaza el resto como null', () => {
    expect(asOptionalIgipScore(0)).toBe(0);
    expect(asOptionalIgipScore(4)).toBe(4);
    expect(asOptionalIgipScore('3')).toBe(3);
    expect(asOptionalIgipScore('')).toBeNull();
    expect(asOptionalIgipScore(5)).toBeNull();
    expect(asOptionalIgipScore(-1)).toBeNull();
    expect(asOptionalIgipScore(2.4)).toBe(2);
  });
});
