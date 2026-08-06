import type {
  MouseEvent,
  PointerEvent,
  ReactNode,
  TouchEvent,
} from 'react';
import type { Activity } from '@/hooks/useGantt';

export type ActivityEditableField = 'name' | 'description';

export type DatePosition = {
  month: number;
  day: number;
  left: number;
};

export type VisibleMonth = {
  name: string;
  fullName: string;
  year: number;
  monthIndex: number;
};

export type ProjectStats = {
  completedActivities: number;
  totalActivities: number;
  completedTasks: number;
  totalTasks: number;
};

export type ActivityDateRange = {
  startDate: string;
  endDate: string;
};

export interface GanttChartProps {
  projectId: string;
  projectName?: string;
  showProjectSelector?: boolean;
  onProjectChange?: () => void;
  /** Actividades precargadas del proyecto (evita refetch al abrir tab Gantt) */
  initialActivities?: Activity[];
  topLoaderEnabled?: boolean;
  /** Acciones bajo la columna de actividades (ej. carga masiva) */
  footerLeft?: ReactNode;
}

export interface SortableActivityProps {
  activity: Activity;
  expandedDescriptions: Set<string>;
  toggleDescription: (activityId: string) => void;
  handleActivityBarClick: (activity: Activity) => void;
  handleActivityInteraction: (
    activity: Activity,
    event: MouseEvent | TouchEvent | PointerEvent,
    isDragging: boolean
  ) => void;
  handleDeleteActivity: (activityId: string) => void;
  handleToggleTaskCompletion: (taskId: string) => void;
  getActivityDateRange: (activity: Activity) => ActivityDateRange | null;
  getActivityProgress: (activity: Activity) => number;
  getDatePosition: (date: string) => DatePosition;
  getBarWidth: (startDate: string, endDate: string) => number;
  formatDateForTooltip: (dateString: string) => string;
}
