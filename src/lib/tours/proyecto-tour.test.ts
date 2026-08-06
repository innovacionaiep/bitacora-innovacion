import { describe, expect, it } from 'vitest';
import { buildProyectoTourSteps } from '@/lib/tours/proyecto-tour';

describe('buildProyectoTourSteps', () => {
  const tabs = [
    'Convenio',
    'General',
    'Participantes',
    'Gantt',
    'Indicadores',
    'Presupuesto',
    'Seguimiento',
    'Historial',
  ] as const;

  it.each(tabs)('returns detailed steps for %s (5–8+) including tabs nav', (tab) => {
    const steps = buildProyectoTourSteps(tab);
    expect(steps.length).toBeGreaterThanOrEqual(5);
    expect(steps.length).toBeLessThanOrEqual(9);
    expect(steps[0]?.element).toBe('[data-tour="proyecto-tabs-nav"]');
  });

  it('falls back to tabs nav for unknown tab', () => {
    const steps = buildProyectoTourSteps('Resumen');
    expect(steps).toHaveLength(1);
    expect(steps[0]?.element).toBe('[data-tour="proyecto-tabs-nav"]');
  });
});
