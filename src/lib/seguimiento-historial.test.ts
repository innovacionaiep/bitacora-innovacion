import { describe, expect, it } from 'vitest';
import { formatHistorialFrase } from '@/lib/historial-mensaje';
import {
  buildCompromisoCambioGenerado,
  buildReunionCambioGenerado,
  compromisoElementoHistorial,
  formatFechaSeguimiento,
} from '@/lib/seguimiento-historial';

describe('formatFechaSeguimiento', () => {
  it('formatea fecha local dd-mm-aaaa', () => {
    expect(formatFechaSeguimiento(new Date(2026, 8, 2))).toBe('02-09-2026');
    expect(formatFechaSeguimiento(null)).toBeNull();
  });
});

describe('compromisoElementoHistorial', () => {
  it('prioriza título y recorta textos largos', () => {
    expect(compromisoElementoHistorial('Acuerdos', 'texto largo')).toBe(
      'Acuerdos'
    );
    expect(compromisoElementoHistorial(null, 'Solo descripción')).toBe(
      'Solo descripción'
    );
    expect(compromisoElementoHistorial('a'.repeat(90), null).endsWith('…')).toBe(
      true
    );
  });
});

describe('buildCompromisoCambioGenerado', () => {
  const base = {
    titulo: 'Acuerdos',
    descripcion: 'Medición de cierre',
    fechaLimite: null as Date | null,
  };

  it('devuelve vacío si no hay cambios', () => {
    expect(
      buildCompromisoCambioGenerado({ before: base, after: { ...base } })
    ).toBe('');
  });

  it('describe título y descripción con anterior → nuevo', () => {
    expect(
      buildCompromisoCambioGenerado({
        before: base,
        after: {
          ...base,
          descripcion: 'Medición de cierre con foco en percepción',
        },
      })
    ).toBe(
      'Descripción: Medición de cierre → Medición de cierre con foco en percepción'
    );
  });

  it('incluye fecha límite cuando se asigna', () => {
    expect(
      buildCompromisoCambioGenerado({
        before: base,
        after: { ...base, fechaLimite: new Date(2026, 8, 15) },
      })
    ).toBe('Fecha límite: — → 15-09-2026');
  });
});

describe('buildReunionCambioGenerado', () => {
  const fecha = new Date(2026, 8, 2);
  const base = { numero: 1, fecha, resumen: 'Acta inicial' };

  it('devuelve vacío si no hay cambios', () => {
    expect(
      buildReunionCambioGenerado({ before: base, after: { ...base } })
    ).toBe('');
  });

  it('describe resumen y número', () => {
    expect(
      buildReunionCambioGenerado({
        before: base,
        after: { ...base, numero: 2, resumen: 'Acta revisada' },
      })
    ).toBe('Número: 1 → 2; Resumen: Acta inicial → Acta revisada');
  });
});

describe('formatHistorialFrase seguimiento', () => {
  it('muestra el detalle al actualizar un compromiso titulado Acuerdos', () => {
    expect(
      formatHistorialFrase({
        persona: 'Daniela Bravo',
        accion: 'Actualizar',
        tabProyecto: 'Seguimiento',
        elementoEspecifico: 'Acuerdos',
        cambioGenerado:
          'Descripción: Medición de cierre → Medición de cierre con foco en percepción',
      })
    ).toBe(
      'Daniela Bravo ha actualizado en Seguimiento Acuerdos: "Descripción: Medición de cierre → Medición de cierre con foco en percepción"'
    );
  });

  it('muestra el detalle al actualizar el resumen de una reunión', () => {
    expect(
      formatHistorialFrase({
        persona: 'Javiera Escudero',
        accion: 'Actualizar',
        tabProyecto: 'Seguimiento',
        elementoEspecifico: 'Reunión N° 1',
        cambioGenerado: 'Resumen: Acta inicial → Acta revisada',
      })
    ).toBe(
      'Javiera Escudero ha actualizado en Seguimiento Reunión N° 1: "Resumen: Acta inicial → Acta revisada"'
    );
  });
});
