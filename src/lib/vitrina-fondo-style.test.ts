import { describe, expect, it } from 'vitest';
import {
  buildFondoColorMap,
  normalizeFondoColorHex,
  vitrinaFondoFillColor,
  vitrinaFondoLabel,
  vitrinaFondoStripeClass,
  vitrinaFondoStripePaint,
  vitrinaLineaBarStripeClass,
  vitrinaLineaBarStripePaint,
  vitrinaLineaStripeClass,
} from '@/lib/vitrina-fondo-style';

describe('vitrinaFondoFillColor', () => {
  it('usa el mismo color que la franja de tarjeta para Impulsa, Innovación Docente e Incuba', () => {
    expect(vitrinaFondoStripeClass('Fondo Impulsa')).toBe('bg-emerald-600');
    expect(vitrinaFondoFillColor('Fondo Impulsa')).toBe('#059669');

    expect(vitrinaFondoStripeClass('Innovación Docente')).toBe('bg-[#DC143C]');
    expect(vitrinaFondoFillColor('Innovación Docente')).toBe('#DC143C');

    expect(vitrinaFondoStripeClass('Incuba')).toBe('bg-violet-600');
    expect(vitrinaFondoFillColor('Incuba')).toBe('#7c3aed');
  });

  it('une varios fondos como en la tarjeta y cae a slate si no hay fondo', () => {
    expect(vitrinaFondoLabel(['Fondo Impulsa', 'Incuba'])).toBe(
      'Fondo Impulsa · Incuba',
    );
    expect(vitrinaFondoFillColor('')).toBe('#64748b');
  });
});

describe('vitrinaLineaBarStripeClass', () => {
  it('usa el color del fondo padre cuando existe', () => {
    expect(
      vitrinaLineaBarStripeClass('Innovación', 'Fondo Impulsa'),
    ).toBe('bg-emerald-600');
    expect(
      vitrinaLineaBarStripeClass('Innovación en el Aula', 'Innovación Docente'),
    ).toBe('bg-[#DC143C]');
  });

  it('cae al color de línea si no hay fondo padre', () => {
    expect(vitrinaLineaBarStripeClass('Innovación')).toBe(
      vitrinaLineaStripeClass('Innovación'),
    );
  });
});

describe('colores configurados de fondo', () => {
  it('normaliza hex y rechaza valores inválidos', () => {
    expect(normalizeFondoColorHex('#aabbcc')).toBe('#AABBCC');
    expect(normalizeFondoColorHex('112233')).toBe('#112233');
    expect(normalizeFondoColorHex('')).toBeNull();
    expect(normalizeFondoColorHex('#fff')).toBeNull();
    expect(normalizeFondoColorHex('red')).toBeNull();
  });

  it('prioriza el color persistido sobre la paleta por nombre', () => {
    const colors = buildFondoColorMap([
      { nombre: 'Fondo Impulsa', colorHex: '#123456' },
    ]);
    expect(vitrinaFondoFillColor('Fondo Impulsa', colors)).toBe('#123456');
    expect(vitrinaFondoStripePaint('Fondo Impulsa', colors)).toEqual({
      className: '',
      style: { backgroundColor: '#123456' },
    });
    expect(vitrinaFondoStripeClass('Fondo Impulsa')).toBe('bg-emerald-600');
  });

  it('usa el primer fondo de una etiqueta combinada', () => {
    const colors = buildFondoColorMap([
      { nombre: 'Fondo Impulsa', colorHex: '#010203' },
    ]);
    expect(vitrinaFondoFillColor('Fondo Impulsa · Incuba', colors)).toBe(
      '#010203',
    );
  });

  it('pinta la barra de línea con el color del fondo padre configurado', () => {
    const colors = buildFondoColorMap([
      { nombre: 'Fondo Impulsa', colorHex: '#abcdef' },
    ]);
    expect(
      vitrinaLineaBarStripePaint('Innovación', 'Fondo Impulsa', colors),
    ).toEqual({
      className: '',
      style: { backgroundColor: '#ABCDEF' },
    });
  });
});
