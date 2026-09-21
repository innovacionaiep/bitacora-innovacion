import { describe, expect, it } from 'vitest';
import {
  activityHasEvidencias,
  withEvidenciasCountDelta,
} from './gantt-utils';
import type { Activity } from '@/hooks/useGantt';

function stubActivity(
  evidencias?: number
): Activity {
  return {
    id: 'a1',
    name: 'Actividad',
    description: '',
    progress: 0,
    projectId: 'p1',
    color: 'bg-gray-700',
    orderIndex: 0,
    kanbanOrderIndex: 0,
    status: 'TODO',
    createdAt: new Date(),
    updatedAt: new Date(),
    tasks: [],
    ...(evidencias === undefined
      ? {}
      : { _count: { evidencias } }),
  } as Activity;
}

describe('activityHasEvidencias', () => {
  it('es false si no hay _count o el conteo es 0', () => {
    expect(activityHasEvidencias(undefined)).toBe(false);
    expect(activityHasEvidencias(stubActivity())).toBe(false);
    expect(activityHasEvidencias(stubActivity(0))).toBe(false);
  });

  it('es true si hay al menos una evidencia', () => {
    expect(activityHasEvidencias(stubActivity(1))).toBe(true);
    expect(activityHasEvidencias(stubActivity(3))).toBe(true);
  });
});

describe('withEvidenciasCountDelta', () => {
  it('incrementa y no baja de 0', () => {
    const next = withEvidenciasCountDelta(stubActivity(0), 1);
    expect(next._count?.evidencias).toBe(1);
    const empty = withEvidenciasCountDelta(stubActivity(1), -2);
    expect(empty._count?.evidencias).toBe(0);
  });
});
