import { describe, expect, it } from 'vitest';
import {
  activityHasEvidencias,
  getActivityDateRange,
  getBarWidth,
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

describe('getBarWidth', () => {
  it('una tarea de un solo día ocupa el ancho de ese día', () => {
    const timelineOffset = 20;
    const visibleMonths = 1;
    const dayWidth = 100 / 30;
    expect(
      getBarWidth('2026-09-24', '2026-09-24', timelineOffset, visibleMonths)
    ).toBeCloseTo(dayWidth, 8);
  });
});

describe('getActivityDateRange', () => {
  it('usa el inicio más temprano y el término más tardío', () => {
    const activity = stubActivity();
    activity.tasks = [
      {
        id: 't1',
        name: 'Tarde',
        description: '',
        completed: false,
        startDate: '2026-09-20',
        endDate: '2026-09-22',
        progress: 0,
        activityId: 'a1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 't2',
        name: 'Temprana larga',
        description: '',
        completed: false,
        startDate: '2026-09-10',
        endDate: '2026-09-30',
        progress: 0,
        activityId: 'a1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    expect(getActivityDateRange(activity)).toEqual({
      startDate: '2026-09-10',
      endDate: '2026-09-30',
    });
  });
});
