import { describe, expect, it } from 'vitest';
import {
  extractSvgDrawData,
  repeatingIconMaskUri,
  vitrinaImpactIcon,
} from '@/lib/vitrina-impact-icons';

describe('vitrinaImpactIcon', () => {
  it('mapea cada palabra al svg de public y su color', () => {
    expect(vitrinaImpactIcon('social')).toEqual({
      file: 'social.svg',
      color: '#dc2626',
    });
    expect(vitrinaImpactIcon('ambiental').file).toBe('ambiental.svg');
    expect(vitrinaImpactIcon('productivo').color).toBe('#2563eb');
    expect(vitrinaImpactIcon('educativo').file).toBe('educativo.svg');
    expect(vitrinaImpactIcon('innovador').file).toBe('innovador.svg');
    expect(vitrinaImpactIcon('tecnológico')).toEqual({
      file: 'tecnologico.svg',
      color: '#06b6d4',
    });
  });

  it('cae a social si la palabra no existe', () => {
    expect(vitrinaImpactIcon('otro').file).toBe('social.svg');
  });
});

describe('extractSvgDrawData', () => {
  it('lee viewBox y paths de un svg', () => {
    const svg =
      '<svg viewBox="0 0 24 24"><path d="M1 2 L3 4"/><path d="M5 6"/></svg>';
    expect(extractSvgDrawData(svg)).toEqual({
      viewBox: '0 0 24 24',
      paths: ['M1 2 L3 4', 'M5 6'],
    });
  });

  it('usa viewBox por defecto si falta', () => {
    expect(extractSvgDrawData('<svg><path d="M0 0"/></svg>').viewBox).toBe(
      '0 0 24 24',
    );
  });
});

describe('repeatingIconMaskUri', () => {
  it('genera una máscara data-uri con el path', () => {
    const uri = repeatingIconMaskUri(['M1 2 L3 4']);
    expect(uri.startsWith('url("data:image/svg+xml,')).toBe(true);
    expect(decodeURIComponent(uri)).toContain('M1 2 L3 4');
    expect(decodeURIComponent(uri)).toContain('viewBox="0 0 40 40"');
  });
});
