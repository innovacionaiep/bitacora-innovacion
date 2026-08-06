import type { Activity } from '@/hooks/useGantt';
import type {
  ActivityDateRange,
  DatePosition,
  ProjectStats,
  VisibleMonth,
} from './gantt-types';

export { convertDateToISO, formatDateForTooltip } from './gantt-date-utils';

/** Año base del timeline del Gantt (enero = offset 0). */
export const TIMELINE_BASE_YEAR = 2025;

export const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

/** Espaciado vertical entre tareas (debe coincidir en lista y barras). */
export const GANTT_TASK_SPACING = 25;

/**
 * Offset del timeline que centra "hoy" en el rango visible
 * (meses desde enero del año base, acotado a [-24, 24]).
 */
export function getTodayCenteredOffset(range: number): number {
  const t = new Date();
  const todayOffset =
    (t.getFullYear() - TIMELINE_BASE_YEAR) * 12 + t.getMonth();
  const centered = todayOffset - Math.floor(range / 2);
  return Math.max(-24, Math.min(24, centered));
}

/** Meses visibles según offset y rango del timeline. */
export function getVisibleMonths(
  timelineOffset: number,
  visibleMonthsRange: number
): VisibleMonth[] {
  const months: VisibleMonth[] = [];
  const startYear = TIMELINE_BASE_YEAR + Math.floor(timelineOffset / 12);
  const startMonth = ((timelineOffset % 12) + 12) % 12;

  for (let i = 0; i < visibleMonthsRange; i++) {
    const monthIndex = (startMonth + i) % 12;
    const year = startYear + Math.floor((startMonth + i) / 12);

    const shouldTruncate = visibleMonthsRange > 12;
    const monthName = shouldTruncate
      ? MONTHS[monthIndex].substring(0, 3)
      : MONTHS[monthIndex];

    months.push({
      name: monthName,
      fullName: MONTHS[monthIndex],
      year,
      monthIndex,
    });
  }

  return months;
}

/** Posición porcentual de una fecha dentro del rango visible del timeline. */
export function getDatePosition(
  date: string,
  timelineOffset: number,
  visibleMonthsRange: number
): DatePosition {
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth();
  const day = dateObj.getDate();

  const dateOffset = (year - TIMELINE_BASE_YEAR) * 12 + month;
  const visibleStartOffset = timelineOffset;
  const visibleEndOffset = timelineOffset + visibleMonthsRange - 1;

  if (dateOffset < visibleStartOffset) {
    return { month: 0, day: 1, left: 0 };
  }
  if (dateOffset > visibleEndOffset) {
    return { month: visibleMonthsRange - 1, day: 31, left: 100 };
  }

  const relativeMonth = dateOffset - visibleStartOffset;
  const monthWidth = 100 / visibleMonthsRange;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayWidth = monthWidth / daysInMonth;
  const dayPosition = (day - 1) * dayWidth;
  const leftPosition = relativeMonth * monthWidth + dayPosition;
  const clampedLeft = Math.max(0, Math.min(100, leftPosition));

  return {
    month,
    day,
    left: clampedLeft,
  };
}

/** Ancho porcentual de una barra entre dos fechas en el timeline visible. */
export function getBarWidth(
  startDate: string,
  endDate: string,
  timelineOffset: number,
  visibleMonthsRange: number
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const startOffset =
    (start.getFullYear() - TIMELINE_BASE_YEAR) * 12 + start.getMonth();
  const endOffset =
    (end.getFullYear() - TIMELINE_BASE_YEAR) * 12 + end.getMonth();
  const visibleStartOffset = timelineOffset;
  const visibleEndOffset = timelineOffset + visibleMonthsRange - 1;

  if (endOffset < visibleStartOffset || startOffset > visibleEndOffset) {
    return 0;
  }

  const startPos = getDatePosition(
    startDate,
    timelineOffset,
    visibleMonthsRange
  );
  const endPos = getDatePosition(endDate, timelineOffset, visibleMonthsRange);

  let width = endPos.left - startPos.left;

  if (startPos.left >= 100) {
    return 0;
  } else if (endPos.left > 100) {
    width = 100 - startPos.left;
  }

  return Math.max(1, width);
}

/** Rango de fechas de una actividad según la primera y última tarea. */
export function getActivityDateRange(
  activity: Activity
): ActivityDateRange | null {
  if (!activity.tasks || activity.tasks.length === 0) {
    return null;
  }

  const sortedTasks = [...activity.tasks].sort(
    (a, b) =>
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const firstTask = sortedTasks[0];
  const lastTask = sortedTasks[sortedTasks.length - 1];

  return {
    startDate: firstTask.startDate,
    endDate: lastTask.endDate,
  };
}

/** Progreso de una actividad (% de tareas completadas). */
export function getActivityProgress(activity: Activity): number {
  if (!activity.tasks || activity.tasks.length === 0) {
    return 0;
  }

  const completedTasks = activity.tasks.filter((task) => task.completed).length;
  const totalTasks = activity.tasks.length;

  return Math.round((completedTasks / totalTasks) * 100);
}

/**
 * Posición del día de hoy en un calendario fijo de 12 meses
 * (lógica legacy del Gantt; no depende del offset visible).
 */
export function getTodayPosition(): DatePosition {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  let targetMonth = currentMonth;
  if (currentYear === 2024) {
    targetMonth = 0;
  }

  const monthWidth = 100 / 12;
  const dayWidth = monthWidth / 31;

  const leftPosition = targetMonth * monthWidth + currentDay * dayWidth;

  return {
    month: targetMonth,
    day: currentDay,
    left: leftPosition,
  };
}

/**
 * Posición porcentual de "hoy" en el timeline visible.
 * Devuelve -1 si está fuera del rango.
 */
export function getTodayPositionPercent(
  timelineOffset: number,
  visibleMonthsRange: number,
  today: Date = new Date()
): number {
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const todayOffset =
    (currentYear - TIMELINE_BASE_YEAR) * 12 + currentMonth;
  const visibleStartOffset = timelineOffset;
  const visibleEndOffset = timelineOffset + visibleMonthsRange - 1;

  if (todayOffset < visibleStartOffset || todayOffset > visibleEndOffset) {
    return -1;
  }

  const relativeMonth = todayOffset - visibleStartOffset;
  const monthWidth = 100 / visibleMonthsRange;
  const monthStartPosition = relativeMonth * monthWidth;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dayWidth = monthWidth / daysInMonth;
  const dayPosition = (currentDay - 1) * dayWidth;

  return monthStartPosition + dayPosition;
}

/** Estadísticas agregadas de actividades/tareas del proyecto. */
export function getProjectStats(
  projectId: string | null | undefined,
  activities: Activity[]
): ProjectStats {
  if (!projectId || !activities.length) {
    return {
      completedActivities: 0,
      totalActivities: 0,
      completedTasks: 0,
      totalTasks: 0,
    };
  }

  const totalActivities = activities.length;
  const completedActivities = activities.filter(
    (activity) =>
      activity.tasks.length > 0 &&
      activity.tasks.every((task) => task.completed)
  ).length;

  const allTasks = activities.flatMap((activity) => activity.tasks);
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((task) => task.completed).length;

  return {
    completedActivities,
    totalActivities,
    completedTasks,
    totalTasks,
  };
}

/**
 * Altura de fila de actividad (colapsada o expandida).
 * taskSpacing debe coincidir con el usado al posicionar nombres/barras.
 */
export function getActivityRowHeight(
  isExpanded: boolean,
  taskCount: number,
  taskSpacing: number = GANTT_TASK_SPACING
): number {
  const baseHeight = 3 + 50; // padding superior + altura barra actividad
  const taskHeight = isExpanded ? taskCount * taskSpacing : 0;
  const bottomPadding = 10;
  return Math.max(48, baseHeight + taskHeight + bottomPadding);
}
