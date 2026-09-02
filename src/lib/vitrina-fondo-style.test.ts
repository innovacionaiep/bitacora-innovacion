import { describe, expect, it } from 'vitest';
import {
  vitrinaFondoFillColor,
  vitrinaFondoLabel,
  vitrinaFondoStripeClass,
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
