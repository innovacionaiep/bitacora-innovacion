import { describe, expect, it } from 'vitest';
import {
  ESCALAMIENTO_ESTADOS,
  applyFilaPatch,
  buildDefaultPlanAccion,
  describeFilaCambio,
  mergePlanAccion,
  serializePlanAccion,
} from '@/lib/escalamiento-plan';

describe('buildDefaultPlanAccion', () => {
  it('returns 8 catalog rows with fixed action and purpose text', () => {
    const plan = buildDefaultPlanAccion();
    expect(plan).toHaveLength(8);
    expect(plan.map((f) => f.numero)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(plan[0].accionConcreta).toBe(
      'Sistematizar los resultados y aprendizajes de la ejecución'
    );
    expect(plan[0].propositoResultado).toContain('componentes esenciales');
    expect(plan[7].accionConcreta).toBe(
      'Presentar resultados y ruta en el Demo Day'
    );
    expect(plan[7].propositoResultado).toContain('factibilidad del escalamiento');
  });

  it('seeds editable defaults for rows 1-2, evidence suggestions and Pendiente', () => {
    const plan = buildDefaultPlanAccion();
    expect(plan[0].responsable).toBe('Docente y Equipo');
    expect(plan[0].apoyoRequerido).toBe('Equipo Sede');
    expect(plan[1].responsable).toBe('Docente y Equipo');
    expect(plan[2].responsable).toBe('');
    expect(plan[0].evidencia).toBe('Informe de cierre del proyecto');
    expect(plan[7].evidencia).toBe('Presentación DEMO DAY');
    expect(plan.every((f) => f.estado === 'Pendiente')).toBe(true);
    expect(plan.every((f) => f.fechaInicio === null)).toBe(true);
    expect(plan.every((f) => f.fechaCompromiso === null)).toBe(true);
    expect(plan.every((f) => f.avanceAcuerdos === '')).toBe(true);
  });
});

describe('mergePlanAccion', () => {
  it('returns catalog defaults when stored is empty', () => {
    expect(mergePlanAccion(null)).toEqual(buildDefaultPlanAccion());
    expect(mergePlanAccion(undefined)).toEqual(buildDefaultPlanAccion());
    expect(mergePlanAccion([])).toEqual(buildDefaultPlanAccion());
  });

  it('overlays saved editable fields without allowing catalog text overrides', () => {
    const merged = mergePlanAccion([
      {
        numero: 1,
        accionConcreta: 'texto inventado',
        propositoResultado: 'otro texto',
        responsable: 'Coordinación',
        apoyoRequerido: 'Vicerrectoría',
        fechaInicio: '2026-03-01',
        fechaCompromiso: '2026-04-15',
        evidencia: 'Informe v2',
        estado: 'En proceso',
        avanceAcuerdos: 'Reunión agendada',
      },
    ]);
    expect(merged[0].accionConcreta).toBe(
      'Sistematizar los resultados y aprendizajes de la ejecución'
    );
    expect(merged[0].responsable).toBe('Coordinación');
    expect(merged[0].apoyoRequerido).toBe('Vicerrectoría');
    expect(merged[0].fechaInicio).toBe('2026-03-01');
    expect(merged[0].fechaCompromiso).toBe('2026-04-15');
    expect(merged[0].evidencia).toBe('Informe v2');
    expect(merged[0].estado).toBe('En proceso');
    expect(merged[0].avanceAcuerdos).toBe('Reunión agendada');
    expect(merged[1].responsable).toBe('Docente y Equipo');
  });

  it('ignores invalid estado, dates, and out-of-range row numbers', () => {
    const merged = mergePlanAccion([
      { numero: 1, estado: 'Hecho', fechaInicio: '31-02-2026' },
      { numero: 9, responsable: 'Intruso' },
      { numero: 3, fechaCompromiso: '2026-13-01', estado: 'Realizado' },
    ]);
    expect(merged[0].estado).toBe('Pendiente');
    expect(merged[0].fechaInicio).toBeNull();
    expect(merged).toHaveLength(8);
    expect(merged[2].estado).toBe('Realizado');
    expect(merged[2].fechaCompromiso).toBeNull();
  });
});

describe('applyFilaPatch', () => {
  it('updates only editable fields of the target row', () => {
    const result = applyFilaPatch(buildDefaultPlanAccion(), 4, {
      responsable: 'Docente',
      estado: 'Realizado',
      fechaInicio: '2026-08-01',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.filas[3].responsable).toBe('Docente');
    expect(result.filas[3].estado).toBe('Realizado');
    expect(result.filas[3].fechaInicio).toBe('2026-08-01');
    expect(result.filas[3].accionConcreta).toBe(
      'Presentar el proyecto a las instancias potenciales'
    );
    expect(result.filas[0].responsable).toBe('Docente y Equipo');
  });

  it('rejects invalid row number, estado or date', () => {
    const plan = buildDefaultPlanAccion();
    expect(applyFilaPatch(plan, 0, { responsable: 'x' }).ok).toBe(false);
    expect(applyFilaPatch(plan, 9, { responsable: 'x' }).ok).toBe(false);
    expect(applyFilaPatch(plan, 1, { estado: 'Hecho' as never }).ok).toBe(
      false
    );
    expect(applyFilaPatch(plan, 1, { fechaInicio: 'no-es-fecha' }).ok).toBe(
      false
    );
  });

  it('allows clearing dates with empty string', () => {
    const seeded = applyFilaPatch(buildDefaultPlanAccion(), 1, {
      fechaInicio: '2026-01-10',
    });
    expect(seeded.ok).toBe(true);
    if (!seeded.ok) return;
    const cleared = applyFilaPatch(seeded.filas, 1, { fechaInicio: '' });
    expect(cleared.ok).toBe(true);
    if (!cleared.ok) return;
    expect(cleared.filas[0].fechaInicio).toBeNull();
  });
});

describe('serializePlanAccion', () => {
  it('persists only editable fields plus numero', () => {
    const serialized = serializePlanAccion(buildDefaultPlanAccion());
    expect(serialized).toHaveLength(8);
    expect(serialized[0]).toEqual({
      numero: 1,
      responsable: 'Docente y Equipo',
      apoyoRequerido: 'Equipo Sede',
      fechaInicio: null,
      fechaCompromiso: null,
      evidencia: 'Informe de cierre del proyecto',
      estado: 'Pendiente',
      avanceAcuerdos: '',
    });
    expect(serialized[0]).not.toHaveProperty('accionConcreta');
    expect(serialized[0]).not.toHaveProperty('propositoResultado');
  });
});

describe('ESCALAMIENTO_ESTADOS', () => {
  it('exposes the three allowed status labels', () => {
    expect(ESCALAMIENTO_ESTADOS).toEqual([
      'Pendiente',
      'En proceso',
      'Realizado',
    ]);
  });
});

describe('describeFilaCambio', () => {
  it('labels the historial entry with action number and field', () => {
    expect(describeFilaCambio(2, { responsable: 'Equipo sede' })).toEqual({
      elemento: 'Acción 2 — Responsable',
      cambio: 'Equipo sede',
    });
    expect(describeFilaCambio(1, { fechaInicio: null })).toEqual({
      elemento: 'Acción 1 — Fecha inicio',
      cambio: 'contenido vaciado',
    });
  });
});
