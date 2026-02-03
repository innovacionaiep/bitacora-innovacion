'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  Circle,
  BarChart3,
  FolderKanban,
  Clock,
  Target,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  TrendingUp,
  Maximize,
  Minimize,
  ArrowLeftRight,
} from 'lucide-react';
import KanbanBoard from '@/components/proyectos/KanbanBoard';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PeriodTimeline } from '@/components/ui/period-timeline';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect, useRef } from 'react';
import { useGantt, type Activity, type Task } from '@/hooks/useGantt';
import { ActivityStatus } from '@prisma/client';
import { reorderActivitiesKanban } from '@/lib/actions/gantt';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Meses del año
const MONTHS = [
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
];

// Props del componente
interface GanttChartProps {
  projectId: string;
  projectName?: string;
  showProjectSelector?: boolean;
  onProjectChange?: () => void;
}

// Componente para actividad arrastrable
interface SortableActivityProps {
  activity: Activity;
  expandedDescriptions: Set<string>;
  toggleDescription: (activityId: string) => void;
  handleActivityBarClick: (activity: Activity) => void;
  handleActivityInteraction: (
    activity: Activity,
    event: React.MouseEvent | React.TouchEvent | React.PointerEvent,
    isDragging: boolean
  ) => void;
  handleDeleteActivity: (activityId: string) => void;
  handleToggleTaskCompletion: (taskId: string) => void;
  getActivityDateRange: (
    activity: Activity
  ) => { startDate: string; endDate: string } | null;
  getActivityProgress: (activity: Activity) => number;
  getDatePosition: (date: string) => {
    month: number;
    day: number;
    left: number;
  };
  getBarWidth: (startDate: string, endDate: string) => number;
  formatDateForTooltip: (dateString: string) => string;
}

function SortableActivity({
  activity,
  expandedDescriptions,
  toggleDescription,
  handleActivityBarClick,
  handleActivityInteraction,
  handleDeleteActivity,
  handleToggleTaskCompletion,
  getActivityDateRange,
  getActivityProgress,
  getDatePosition,
  getBarWidth,
  formatDateForTooltip,
  scrollbarWidth,
}: SortableActivityProps & { scrollbarWidth: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id });

  // Función unificada para calcular altura de fila
  const getRowHeight = (isExpanded: boolean, taskCount: number) => {
    const baseHeight = 3 + 50; // padding superior + altura barra actividad
    const taskHeight = isExpanded ? taskCount * 22 : 0; // altura por tarea
    const bottomPadding = 10; // padding inferior unificado
    return Math.max(48, baseHeight + taskHeight + bottomPadding);
  };

  const isExpanded = expandedDescriptions.has(activity.id);
  const rowHeight = getRowHeight(isExpanded, activity.tasks.length);

  const normalized = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : transform;
  const style = {
    transform: CSS.Transform.toString(normalized),
    transition,
    willChange: 'transform',
    height: rowHeight,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-b border-white relative ${isDragging ? 'z-[9999]' : expandedDescriptions.has(activity.id) ? 'z-10' : 'z-20'}`}
      {...attributes}
      {...listeners}
    >
      {/* Fila de la actividad con sus tareas en la misma línea */}
      <div
        className="flex hover:bg-gray-50 group relative"
        style={{ cursor: isDragging ? 'grabbing' : 'default' }}
      >
        <div
          className={`w-[500px] pl-2 pr-4 py-4 border-r border-gray-200 flex justify-between overflow-hidden relative ${
            !expandedDescriptions.has(activity.id) ? 'items-center' : ''
          }`}
          data-column="activities"
          style={{
            height: `${rowHeight}px`,
          }}
        >
          <div className="flex-1 min-w-0 max-w-full">
            <div
              className={`flex space-x-2 ${
                !expandedDescriptions.has(activity.id)
                  ? 'items-center'
                  : 'items-start'
              }`}
            >
              {/* Columna de botones a la izquierda */}
              <div className="flex flex-col items-center space-y-1 flex-shrink-0">
                {/* Botón expandir/colapsar */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toggleDescription(activity.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                >
                  {expandedDescriptions.has(activity.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>

                {/* Botones de acción - solo visibles cuando está expandido */}
                {expandedDescriptions.has(activity.id) && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteActivity(activity.id)}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="h-6 w-6 p-0 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              {/* Contenido de la actividad - solo visible cuando NO está expandido */}
              {!expandedDescriptions.has(activity.id) && (
                <div className="flex-1 min-w-0 flex items-center relative">
                  <h4
                    className={`activity-title font-medium text-gray-900 break-words min-w-0 leading-tight cursor-default hover:text-blue-600 transition-colors duration-200 ${isDragging ? 'dragging-text' : ''}`}
                    style={{
                      fontSize: '15px',
                      lineHeight: activity.name.length > 50 ? '1.1' : '1.3',
                      touchAction: 'manipulation',
                    }}
                    data-activity-id={activity.id}
                    onClick={(e) =>
                      handleActivityInteraction(activity, e, isDragging)
                    }
                    onPointerUp={(e) =>
                      handleActivityInteraction(activity, e, isDragging)
                    }
                    title="Haz clic para ver detalles de la actividad"
                  >
                    {activity.name}
                  </h4>
                </div>
              )}
            </div>

            {/* Título de actividad posicionado a la altura de su barra cuando está expandido */}
            {expandedDescriptions.has(activity.id) && (
              <div
                className={`absolute left-0 right-0 top-0 bottom-0 pointer-events-none ${isDragging ? 'dragging-absolute' : ''}`}
              >
                {(() => {
                  const taskSpacing = 22;
                  const startOffset = 4;

                  const estimatedLines = activity.name.length > 50 ? 2 : 1;

                  let topPosition;

                  if (estimatedLines === 1) {
                    topPosition = startOffset + 18;
                  } else {
                    const totalTextHeight = 17;
                    const barCenter = startOffset + 19;
                    const textCenter = totalTextHeight / 2;
                    topPosition = barCenter - textCenter;
                  }

                  return (
                    <div
                      className={`absolute font-medium text-gray-900 break-words leading-tight cursor-pointer hover:text-blue-600 transition-colors duration-200 pointer-events-auto ${isDragging ? 'dragging-text' : ''}`}
                      style={{
                        fontSize: '15px',
                        lineHeight: activity.name.length > 50 ? '1.1' : '1.3',
                        top: `${topPosition}px`,
                        left: '40px',
                        right: '20px',
                        zIndex: 10,
                        touchAction: 'manipulation',
                      }}
                      onClick={(e) =>
                        handleActivityInteraction(activity, e, isDragging)
                      }
                      onPointerUp={(e) =>
                        handleActivityInteraction(activity, e, isDragging)
                      }
                      title="Haz clic para ver detalles de la actividad"
                    >
                      <span
                        className={`activity-title ${activity.name.length > 50 ? 'activity-title-multiline' : ''}`}
                        data-activity-id={activity.id}
                      >
                        {activity.name}
                      </span>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Nombres de tareas con checkboxes posicionados a la altura de sus barras */}
            {expandedDescriptions.has(activity.id) &&
              activity.tasks &&
              activity.tasks.length > 0 && (
                <div
                  className={`absolute left-0 right-0 top-0 bottom-0 pointer-events-none ${isDragging ? 'dragging-absolute' : ''}`}
                >
                  {activity.tasks
                    .sort(
                      (a, b) =>
                        new Date(a.startDate).getTime() -
                        new Date(b.startDate).getTime()
                    )
                    .map((task, index) => {
                      const taskSpacing = 25;
                      const startOffset = 4;

                      return (
                        <div
                          key={task.id}
                          className={`absolute flex items-center space-x-2 text-sm text-gray-600 pointer-events-auto ${isDragging ? 'dragging-absolute' : ''}`}
                          style={{
                            top: `${startOffset + 40 + index * taskSpacing + 12}px`,
                            left: '60px',
                            right: '8px',
                            zIndex: 10,
                          }}
                        >
                          {/* Checkbox moderno con color emerald-500 */}
                          <div className="flex items-center">
                            <label
                              className="relative inline-flex items-center cursor-default"
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() =>
                                  handleToggleTaskCompletion(task.id)
                                }
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 border-2 rounded transition-all duration-200 ${
                                  task.completed
                                    ? 'bg-emerald-500 border-emerald-500'
                                    : 'bg-white border-gray-300 hover:border-emerald-400'
                                }`}
                              >
                                {task.completed && (
                                  <svg
                                    className="w-3 h-3 text-white absolute top-0.5 left-0.5"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 0 1 0 1.414l-8 8a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 1.414-1.414L8 12.586l7.293-7.293a1 1 0 0 1 1.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                            </label>
                          </div>
                          {/* Nombre de la tarea con punto al final del texto */}
                          <span
                            className={`task-title flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-600'} relative ${isDragging ? 'dragging-text' : ''}`}
                            data-task-id={task.id}
                            style={{
                              display: 'inline-block',
                            }}
                          >
                            {task.name}
                            {/* Punto gris al final del texto */}
                            <span
                              className="w-2 h-2 bg-gray-400 rounded-full inline-block ml-1 relative"
                              style={{
                                verticalAlign: 'middle',
                                transform: 'translateY(-36%)',
                                top: '50%',
                              }}
                            >
                              {/* Línea roja desde el punto gris hasta el borde derecho de la columna */}
                              <div
                                className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none"
                                style={{
                                  left: 'calc(100% + 0px)',
                                  right: 'calc(-100vw + 416px - 8px)',
                                  height: '0.1px',
                                  backgroundColor: '#e5e7eb',
                                  opacity: 1,
                                  zIndex: 9999,
                                }}
                              ></div>
                            </span>
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>
        </div>

        {/* Área de Gantt con barras de tareas apiladas verticalmente */}
        <div
          className="flex-1 relative"
          style={{
            height: `${rowHeight}px`,
            paddingTop: '8px',
            paddingBottom: '8px',
            paddingLeft: '0px',
            paddingRight: `${scrollbarWidth}px`,
            boxSizing: 'border-box',
          }}
        >
          {/* Barra de actividad - como primera "tarea" */}
          {(() => {
            const activityRange = getActivityDateRange(activity);
            if (!activityRange) return null;

            const startPos = getDatePosition(activityRange.startDate);
            const barWidth = getBarWidth(
              activityRange.startDate,
              activityRange.endDate
            );

            if (barWidth === 0) return null;

            const taskSpacing = 22;
            const startOffset = 4;

            const activityProgress = getActivityProgress(activity);

            return (
              <div
                key={`activity-${activity.id}`}
                className="absolute"
                style={{
                  width: '100%',
                  left: '0px',
                  right: '0px',
                }}
              >
                <div
                  className="relative h-8"
                  style={{
                    top: `${startOffset}px`,
                  }}
                >
                  {/* Barra de fondo gris con popup */}
                  <div className="relative group h-8">
                    <div
                      className={`activity-bar absolute top-0 h-8 bg-gray-300 rounded-xl z-10 cursor-default hover:bg-gray-400 hover:shadow-md ${expandedDescriptions.has(activity.id) ? 'invisible pointer-events-none' : 'transition-all duration-200'}`}
                      style={{
                        left: `${startPos.left}%`,
                        width: `${barWidth}%`,
                        touchAction: 'manipulation',
                      }}
                      data-activity-id={activity.id}
                      onClick={(e) =>
                        handleActivityInteraction(activity, e, isDragging)
                      }
                      onPointerUp={(e) =>
                        handleActivityInteraction(activity, e, isDragging)
                      }
                      title="Haz clic para ver detalles de la actividad"
                    >
                      {/* Barra de progreso verde - perfectamente alineada */}
                      <div
                        className={`absolute bg-emerald-500 rounded-xl z-20 ${expandedDescriptions.has(activity.id) ? '' : 'transition-all duration-300'}`}
                        style={{
                          width: `${activityProgress}%`,
                          top: '0px',
                          left: '0px',
                          height: '32px',
                        }}
                      ></div>

                      {/* Porcentaje al final de la barra */}
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs font-medium text-white z-30">
                        {activityProgress}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Barras de Gantt de las tareas apiladas verticalmente - solo visibles cuando expandido */}
          {expandedDescriptions.has(activity.id) &&
            activity.tasks
              .sort(
                (a, b) =>
                  new Date(a.startDate).getTime() -
                  new Date(b.startDate).getTime()
              )
              .map((task, index) => {
                const taskSpacing = 25;
                const startOffset = 4;

                const startPos = getDatePosition(task.startDate);
                const barWidth = getBarWidth(task.startDate, task.endDate);

                if (barWidth === 0) {
                  return null;
                }

                return (
                  <div
                    key={task.id}
                    className="absolute"
                    style={{
                      width: '100%',
                      left: '0px',
                      right: '0px',
                    }}
                  >
                    <div
                      className="relative h-6"
                      style={{
                        top: `${startOffset + 40 + index * taskSpacing + 1}px`,
                      }}
                    >
                      {/* Línea de conexión desde el inicio hasta la barra */}
                      <div
                        className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none z-10"
                        style={{
                          left: '0%',
                          width: `${startPos.left}%`,
                          height: '0.1px',
                          backgroundColor: '#e5e7eb',
                          opacity: 1,
                        }}
                      ></div>

                      <div
                        className={`task-bar absolute top-1/2 transform -translate-y-1/2 h-3.5 ${task.completed ? 'bg-emerald-500' : 'bg-gray-300'} rounded-xl z-20 cursor-default hover:opacity-80 transition-opacity duration-200`}
                        style={{
                          left: `${startPos.left}%`,
                          width: `${barWidth}%`,
                        }}
                        data-task-id={task.id}
                        title={`Tarea: ${task.name}`}
                      ></div>
                    </div>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}

export default function GanttChart({
  projectId,
  projectName,
  showProjectSelector = false,
  onProjectChange,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<'gantt' | 'kanban'>('gantt');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null
  );

  // Función para alternar pantalla completa
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [showEditActivity, setShowEditActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(
    new Set()
  );

  // Estado unificado para el popup de actividad
  const [showActivityPopup, setShowActivityPopup] = useState(false);
  const [activityPopupMode, setActivityPopupMode] = useState<
    'create' | 'edit' | 'view'
  >('create');
  const [selectedActivityForPopup, setSelectedActivityForPopup] =
    useState<Activity | null>(null);

  // Timer para ocultar el tooltip con delay
  const [tooltipTimer, setTooltipTimer] = useState<NodeJS.Timeout | null>(null);

  // Estado para controlar el offset del timeline (meses desde enero 2025)
  const [timelineOffset, setTimelineOffset] = useState(0);

  // Estado para controlar el rango visible de meses (6-24 meses)
  const [visibleMonthsRange, setVisibleMonthsRange] = useState(12);

  // Refs y estado para manejar el ancho del scrollbar
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthsHeaderRef = useRef<HTMLDivElement>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);

  // Configuración de sensores para drag and drop optimizada para trackpads
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generar los meses visibles basados en el offset y rango
  const getVisibleMonths = () => {
    const months = [];
    const startYear = 2025 + Math.floor(timelineOffset / 12);
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
        year: year,
        monthIndex: monthIndex,
      });
    }

    return months;
  };

  // Formulario de actividad
  const [activityForm, setActivityForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  // Formulario de tarea
  const [taskForm, setTaskForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  // Formulario de edición de actividad
  const [editActivityForm, setEditActivityForm] = useState({
    name: '',
    description: '',
  });

  // Formulario unificado para el popup de actividad
  const [unifiedActivityForm, setUnifiedActivityForm] = useState({
    name: '',
    description: '',
  });

  // Estado para tareas temporales en el popup de crear actividad
  const [tempTasks, setTempTasks] = useState<Task[]>([]);

  // Usar el hook de Gantt con el projectId recibido como prop
  const {
    activities,
    loading: ganttLoading,
    error: ganttError,
    createActivity,
    updateActivity,
    deleteActivity,
    createTask,
    deleteTask,
    toggleTaskCompletion,
    calculateProjectProgress,
    reorderActivities,
    updateActivityStatus,
    loadActivities,
    updateActivitiesState, // ← Agregar
  } = useGantt(projectId);

  // Estado derivado para determinar si todas las actividades están expandidas
  const allExpanded =
    activities.length > 0 && expandedDescriptions.size === activities.length;

  // Handler para expandir/contraer todas las actividades
  const toggleAllDescriptions = () => {
    setExpandedDescriptions((prev) =>
      prev.size === activities.length
        ? new Set()
        : new Set(activities.map((a) => a.id))
    );
  };

  // Calcular estadísticas de actividades y tareas completadas
  const getProjectStats = () => {
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
  };

  const stats = getProjectStats();

  // Función para cerrar todos los popups
  const closeAllPopups = () => {
    setShowAddActivity(false);
    setShowAddTask(false);
    setShowEditActivity(false);
    setShowActivityPopup(false);
    setSelectedActivity(null);
    setEditingActivity(null);
    setSelectedActivityForPopup(null);
    setExpandedDescriptions(new Set());

    // Resetear formularios
    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setUnifiedActivityForm({ name: '', description: '' });
    setTempTasks([]);
  };

  // Función para cerrar solo los popups de formularios (sin afectar descripciones expandidas ni modos)
  const closeFormPopups = () => {
    setShowAddActivity(false);
    setShowAddTask(false);
    setShowEditActivity(false);
    setShowActivityPopup(false);
    setSelectedActivity(null);
    setEditingActivity(null);
    setSelectedActivityForPopup(null);

    // Resetear formularios
    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setUnifiedActivityForm({ name: '', description: '' });
    setTempTasks([]);
  };

  // Cerrar todos los popups cuando cambie el proyecto seleccionado
  useEffect(() => {
    closeAllPopups();
  }, [projectId]);

  // Limpiar timer cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (tooltipTimer) {
        clearTimeout(tooltipTimer);
      }
    };
  }, [tooltipTimer]);

  // Calcular el ancho del scrollbar dinámicamente
  useEffect(() => {
    const calculateScrollbarWidth = () => {
      if (scrollContainerRef.current) {
        // Calcular el ancho del scrollbar (diferencia entre offsetWidth y clientWidth)
        const scrollbarWidth =
          scrollContainerRef.current.offsetWidth -
          scrollContainerRef.current.clientWidth;

        console.log('Scrollbar width calculation:', {
          offsetWidth: scrollContainerRef.current.offsetWidth,
          clientWidth: scrollContainerRef.current.clientWidth,
          scrollbarWidth: scrollbarWidth,
        });

        setScrollbarWidth(scrollbarWidth);
      }
    };

    // Calcular inmediatamente
    calculateScrollbarWidth();

    // Usar setTimeout para recalcular después del render (cuando el DOM esté completamente actualizado)
    const timeoutId = setTimeout(calculateScrollbarWidth, 100);

    // Recalcular cuando cambie el tamaño de la ventana
    window.addEventListener('resize', calculateScrollbarWidth);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateScrollbarWidth);
    };
  }, [activities, expandedDescriptions]);

  // Manejar cambios en el formulario de actividad
  const handleActivityInputChange = (field: string, value: string) => {
    setActivityForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Manejar cambios en el formulario de tarea
  const handleTaskInputChange = (field: string, value: string) => {
    // Limitar el nombre de la tarea a 62 caracteres máximo
    if (field === 'name' && value.length > 62) {
      alert('El nombre de la tarea no puede exceder 62 caracteres');
      return;
    }
    setTaskForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Crear nueva actividad (función legacy - ahora se usa handleUnifiedActivityAction)
  const handleCreateActivity = async () => {
    if (!projectId || !unifiedActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    const { error } = await createActivity({
      name: unifiedActivityForm.name,
      description: unifiedActivityForm.description,
    });

    if (error) {
      alert('Error al crear la actividad: ' + error);
    } else {
      setUnifiedActivityForm({ name: '', description: '' });
      setShowActivityPopup(false);
      showSuccessMessage('Actividad creada exitosamente');
    }
  };

  // Función para convertir fecha del formato chileno (DD/MM/YYYY o DD-MM-YYYY) a ISO (YYYY-MM-DD)
  const convertDateToISO = (dateString: string): string => {
    console.log('Convirtiendo fecha:', dateString);

    if (!dateString) {
      console.log('Fecha vacía, devolviendo cadena vacía');
      return '';
    }

    // Verificar si ya está en formato ISO (YYYY-MM-DD)
    const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoPattern.test(dateString)) {
      console.log('Ya está en formato ISO:', dateString);
      return dateString;
    }

    // Convertir desde formato DD/MM/YYYY a YYYY-MM-DD
    const slashParts = dateString.split('/');
    if (slashParts.length === 3) {
      const [day, month, year] = slashParts;
      const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      console.log('Fecha convertida desde DD/MM/YYYY a ISO:', isoDate);
      return isoDate;
    }

    // Convertir desde formato DD-MM-YYYY a YYYY-MM-DD
    const dashParts = dateString.split('-');
    if (dashParts.length === 3) {
      const [day, month, year] = dashParts;
      if (day.length <= 2 && month.length <= 2 && year.length === 4) {
        const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        console.log('Fecha convertida desde DD-MM-YYYY a ISO:', isoDate);
        return isoDate;
      }
    }

    // Si no se puede convertir, intentar parsear como fecha y convertir
    console.log('Intentando parsear como fecha nativa:', dateString);
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString().split('T')[0];
      console.log('Fecha parseada y convertida a ISO:', isoDate);
      return isoDate;
    }

    console.error('No se pudo convertir la fecha:', dateString);
    return dateString;
  };

  // Crear nueva tarea
  const handleCreateTask = async () => {
    if (
      !selectedActivity ||
      !taskForm.name ||
      !taskForm.startDate ||
      !taskForm.endDate
    ) {
      alert(
        'Por favor completa todos los campos obligatorios y selecciona una actividad'
      );
      return;
    }

    // Validar que el nombre no exceda 62 caracteres
    if (taskForm.name.length > 62) {
      alert('El nombre de la tarea no puede exceder 62 caracteres');
      return;
    }

    console.log('Datos de la tarea antes de convertir:', {
      name: taskForm.name,
      startDate: taskForm.startDate,
      endDate: taskForm.endDate,
    });

    const convertedStartDate = convertDateToISO(taskForm.startDate);
    const convertedEndDate = convertDateToISO(taskForm.endDate);

    console.log('Datos de la tarea después de convertir:', {
      name: taskForm.name,
      startDate: convertedStartDate,
      endDate: convertedEndDate,
    });

    // Si estamos en modo crear actividad o editando, agregar a la lista temporal
    if (activityPopupMode === 'create' || activityPopupMode === 'edit') {
      const newTask: Task = {
        id: `temp-${Date.now()}`,
        name: taskForm.name,
        description: taskForm.description,
        startDate: convertedStartDate,
        endDate: convertedEndDate,
        completed: false,
        activityId: selectedActivity.id,
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setTempTasks((prev) => [...prev, newTask]);
      setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
      setShowAddTask(false);
      alert('Tarea agregada a la actividad');
      return;
    }

    // Si estamos creando tarea desde fuera del popup de actividad, crear inmediatamente
    const { error } = await createTask(selectedActivity.id, {
      name: taskForm.name,
      description: taskForm.description,
      startDate: convertedStartDate,
      endDate: convertedEndDate,
    });

    if (error) {
      console.error('Error al crear la tarea:', error);
      alert('Error al crear la tarea: ' + error);
    } else {
      setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
      setShowAddTask(false);
      setSelectedActivity(null);
      showSuccessMessage('Tarea creada exitosamente');
    }
  };

  // Toggle completar tarea
  const handleToggleTaskCompletion = async (taskId: string) => {
    try {
      await toggleTaskCompletion(taskId);
      showSuccessMessage('Tarea actualizada exitosamente');
    } catch (error) {
      console.error('Error updating task:', error);
      showSuccessMessage('Error al actualizar la tarea');
    }
  };

  // Eliminar actividad
  const handleDeleteActivity = async (activityId: string) => {
    if (
      confirm(
        '¿Estás seguro de que quieres eliminar esta actividad y todas sus tareas?'
      )
    ) {
      const { error } = await deleteActivity(activityId);
      if (error) {
        alert('Error al eliminar la actividad: ' + error);
      } else {
        showSuccessMessage('Actividad eliminada exitosamente');
      }
    }
  };

  // Eliminar tarea
  const handleDeleteTask = async (taskId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      const { error } = await deleteTask(taskId);
      if (error) {
        alert('Error al eliminar la tarea: ' + error);
      } else {
        showSuccessMessage('Tarea eliminada exitosamente');
      }
    }
  };

  // Mostrar mensaje de éxito
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Handler para cambiar el status de una actividad en Kanban
  const handleStatusChange = async (
    activityId: string,
    status: ActivityStatus
  ) => {
    const result = await updateActivityStatus(activityId, status);
    if (result?.success) {
      showSuccessMessage('Actividad actualizada exitosamente');
    } else {
      showSuccessMessage('Error al actualizar la actividad');
    }
  };

  // Handler para reordenar actividades en Kanban
  const handleReorderActivities = async (
    activityId: string,
    targetActivityId: string,
    status: ActivityStatus
  ) => {
    try {
      // Filtrar actividades solo de la columna específica y ordenar por kanbanOrderIndex
      const activitiesInColumn = activities
        .filter((a) => a.status === status)
        .sort((a, b) => (a.kanbanOrderIndex || 0) - (b.kanbanOrderIndex || 0));

      const currentIndex = activitiesInColumn.findIndex(
        (a) => a.id === activityId
      );
      const targetIndex = activitiesInColumn.findIndex(
        (a) => a.id === targetActivityId
      );

      if (
        currentIndex === -1 ||
        targetIndex === -1 ||
        currentIndex === targetIndex
      ) {
        return; // No hay nada que reordenar
      }

      // Crear una copia de solo las actividades de esta columna
      const reorderedColumnActivities = [...activitiesInColumn];
      const [movedActivity] = reorderedColumnActivities.splice(currentIndex, 1);
      reorderedColumnActivities.splice(targetIndex, 0, movedActivity);

      // Calcular el kanbanOrderIndex para las actividades de esta columna
      const updates = reorderedColumnActivities.map((activity, index) => ({
        id: activity.id,
        kanbanOrderIndex: index,
      }));

      // Llamar a la server action de reordenamiento de Kanban
      const result = await reorderActivitiesKanban(updates);

      if (result?.success) {
        // Actualizar el estado local manualmente sin hacer fetch
        updateActivitiesState((prevActivities) => {
          return prevActivities.map((activity) => {
            const update = updates.find((u) => u.id === activity.id);
            if (update) {
              return { ...activity, kanbanOrderIndex: update.kanbanOrderIndex };
            }
            return activity;
          });
        });
      } else {
        throw new Error(result?.error || 'Error al reordenar actividades');
      }
    } catch (error) {
      console.error('Error reordering activities:', error);
      await loadActivities(); // Refrescar en caso de error
      showSuccessMessage('Error al reordenar actividades');
    }
  };

  // Handler para actualización optimista en Kanban
  const handleOptimisticReorder = (
    activityId: string,
    targetActivityId: string,
    status: ActivityStatus
  ) => {
    // Actualizar el estado local inmediatamente para una experiencia fluida
    const activitiesInColumn = activities
      .filter((a) => a.status === status)
      .sort((a, b) => (a.kanbanOrderIndex || 0) - (b.kanbanOrderIndex || 0));

    const currentIndex = activitiesInColumn.findIndex(
      (a) => a.id === activityId
    );
    const targetIndex = activitiesInColumn.findIndex(
      (a) => a.id === targetActivityId
    );

    if (
      currentIndex === -1 ||
      targetIndex === -1 ||
      currentIndex === targetIndex
    ) {
      return;
    }

    // Crear una copia de solo las actividades de esta columna
    const reorderedColumnActivities = [...activitiesInColumn];
    const [movedActivity] = reorderedColumnActivities.splice(currentIndex, 1);
    reorderedColumnActivities.splice(targetIndex, 0, movedActivity);

    // Calcular el kanbanOrderIndex para las actividades de esta columna
    const updates = reorderedColumnActivities.map((activity, index) => ({
      id: activity.id,
      kanbanOrderIndex: index,
    }));

    // Actualizar el estado local inmediatamente
    const updatedActivities = activities.map((activity) => {
      const update = updates.find((u) => u.id === activity.id);
      if (update) {
        return { ...activity, kanbanOrderIndex: update.kanbanOrderIndex };
      }
      return activity;
    });

    // Actualizar el estado local (esto requeriría acceso al setter del hook)
    // Por ahora, la actualización optimista se maneja en el componente KanbanBoard
  };

  // Manejar clic en agregar actividad
  const handleAddActivityClick = (event: React.MouseEvent) => {
    closeFormPopups();
    openActivityPopup('create');
  };

  // Manejar clic en agregar tarea
  const handleAddTaskClick = (event: React.MouseEvent) => {
    setShowAddActivity(false);
    setShowAddTask(false);
    setShowEditActivity(false);
    setShowActivityPopup(false);
    setEditingActivity(null);

    setActivityForm({ name: '', description: '', startDate: '', endDate: '' });
    setTaskForm({ name: '', description: '', startDate: '', endDate: '' });
    setEditActivityForm({ name: '', description: '' });
    setUnifiedActivityForm({ name: '', description: '' });

    const rect = event.currentTarget.getBoundingClientRect();
    setPopupPosition({
      x: rect.right + 10,
      y: rect.top - 50,
    });
    setShowAddTask(true);
  };

  // Manejar clic en editar actividad
  const handleEditActivityClick = (
    event: React.MouseEvent,
    activity: Activity
  ) => {
    closeFormPopups();
    openActivityPopup('edit', activity);
  };

  // Manejar cambios en el formulario de edición
  const handleEditActivityInputChange = (field: string, value: string) => {
    setEditActivityForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Manejar cambios en el formulario unificado
  const handleUnifiedActivityInputChange = (field: string, value: string) => {
    setUnifiedActivityForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Función para manejar la acción principal del popup (crear o guardar)
  const handleUnifiedActivityAction = async () => {
    if (!unifiedActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    // Validar longitud máxima del título (76 caracteres)
    if (unifiedActivityForm.name.length > 76) {
      alert('El nombre de la actividad no puede exceder los 76 caracteres');
      return;
    }

    if (activityPopupMode === 'create') {
      // Validar que haya al menos una tarea al crear una actividad
      if (tempTasks.length === 0) {
        alert(
          'Error: Debes agregar al menos una tarea para crear la actividad'
        );
        return;
      }

      // Validar que todas las tareas temporales tengan nombres válidos (máximo 62 caracteres)
      const tasksWithInvalidNames = tempTasks.filter(
        (task) => task.name.length > 62
      );
      if (tasksWithInvalidNames.length > 0) {
        alert(
          `Error: ${tasksWithInvalidNames.length} tarea(s) tienen nombres que exceden 62 caracteres. Por favor, corrige los nombres antes de continuar.`
        );
        return;
      }

      // Crear nueva actividad
      const { error, data: newActivity } = await createActivity({
        name: unifiedActivityForm.name,
        description: unifiedActivityForm.description,
      });

      if (error) {
        alert('Error al crear la actividad: ' + error);
      } else if (newActivity) {
        // Crear las tareas asociadas
        for (const task of tempTasks) {
          await createTask(newActivity.id, {
            name: task.name,
            description: '',
            startDate: task.startDate,
            endDate: task.endDate,
          });
        }

        setUnifiedActivityForm({ name: '', description: '' });
        setTempTasks([]);
        setShowActivityPopup(false);
        setSelectedActivityForPopup(null);
        showSuccessMessage('Actividad creada exitosamente con sus tareas');
      }
    } else if (activityPopupMode === 'edit' && selectedActivityForPopup) {
      // Editar actividad existente
      const { error } = await updateActivity(selectedActivityForPopup.id, {
        name: unifiedActivityForm.name,
        description: unifiedActivityForm.description,
      });

      if (error) {
        alert('Error al actualizar la actividad: ' + error);
      } else {
        // Validar que todas las tareas temporales tengan nombres válidos (máximo 64 caracteres)
        const tasksWithInvalidNames = tempTasks.filter(
          (task) => task.name.length > 64
        );
        if (tasksWithInvalidNames.length > 0) {
          alert(
            `Error: ${tasksWithInvalidNames.length} tarea(s) tienen nombres que exceden 64 caracteres. Por favor, corrige los nombres antes de continuar.`
          );
          return;
        }

        // Crear las tareas temporales que se agregaron durante la edición
        for (const task of tempTasks) {
          await createTask(selectedActivityForPopup.id, {
            name: task.name,
            description: task.description,
            startDate: task.startDate,
            endDate: task.endDate,
          });
        }

        // Actualizar la actividad seleccionada con los nuevos datos
        const updatedActivity = {
          ...selectedActivityForPopup,
          name: unifiedActivityForm.name,
          description: unifiedActivityForm.description,
        };
        setSelectedActivityForPopup(updatedActivity);

        // Limpiar formulario y tareas temporales
        setUnifiedActivityForm({ name: '', description: '' });
        setTempTasks([]);

        // Volver al modo de información en lugar de cerrar el popup
        setActivityPopupMode('view');
        showSuccessMessage(
          'Actividad actualizada exitosamente con sus nuevas tareas'
        );
      }
    }
  };

  // Actualizar actividad
  const handleUpdateActivity = async () => {
    if (!editingActivity || !editActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    // Validar longitud máxima del título (76 caracteres)
    if (editActivityForm.name.length > 76) {
      alert('El nombre de la actividad no puede exceder los 76 caracteres');
      return;
    }

    const { error } = await updateActivity(editingActivity.id, {
      name: editActivityForm.name,
      description: editActivityForm.description,
    });

    if (error) {
      alert('Error al actualizar la actividad: ' + error);
    } else {
      setEditActivityForm({ name: '', description: '' });
      setShowEditActivity(false);
      setEditingActivity(null);
      showSuccessMessage('Actividad actualizada exitosamente');
    }
  };

  // Toggle descripción de actividad
  const toggleDescription = (activityId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Obtener posición de una fecha en el calendario para tareas
  const getDatePosition = (date: string) => {
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth();
    const day = dateObj.getDate();

    const dateOffset = (year - 2025) * 12 + month;
    const visibleStartOffset = timelineOffset;
    const visibleEndOffset = timelineOffset + visibleMonthsRange - 1;

    if (dateOffset < visibleStartOffset) {
      return { month: 0, day: 1, left: 0 };
    } else if (dateOffset > visibleEndOffset) {
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
      month: month,
      day: day,
      left: clampedLeft,
    };
  };

  // Obtener duración en días
  const getDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  // Formatear fecha para mostrar en tooltip
  const formatDateForTooltip = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date
      .toLocaleDateString('es-ES', { month: 'long' })
      .toLowerCase();
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Función para abrir el popup unificado en diferentes modos
  const openActivityPopup = (
    mode: 'create' | 'edit' | 'view',
    activity?: Activity
  ) => {
    setActivityPopupMode(mode);
    setSelectedActivityForPopup(activity || null);

    if (mode === 'create') {
      setUnifiedActivityForm({ name: '', description: '' });
      setTempTasks([]);
    } else if (activity) {
      setUnifiedActivityForm({
        name: activity.name,
        description: activity.description || '',
      });
      setTempTasks(mode === 'edit' ? [] : activity.tasks || []);
    }

    setShowActivityPopup(true);
  };

  // Manejar el clic en la barra de actividad para mostrar popup
  const handleActivityBarClick = (activity: Activity) => {
    openActivityPopup('view', activity);
  };

  // Función unificada para manejar tanto clicks como toques
  const handleActivityInteraction = (
    activity: Activity,
    event: React.MouseEvent | React.TouchEvent | React.PointerEvent,
    isDragging: boolean
  ) => {
    if (isDragging) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    handleActivityBarClick(activity);
  };

  // Manejar el final del drag and drop
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = activities.findIndex(
        (activity) => activity.id === active.id
      );
      const newIndex = activities.findIndex(
        (activity) => activity.id === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const result = await reorderActivities(oldIndex, newIndex);
        if (result?.success) {
          showSuccessMessage('Actividades reordenadas exitosamente');
        } else {
          showSuccessMessage('Error al reordenar las actividades');
        }
      }
    }
  };

  // Calcular el rango de fechas de una actividad basado en sus tareas
  const getActivityDateRange = (activity: Activity) => {
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
  };

  // Calcular el progreso de una actividad basado en tareas completadas
  const getActivityProgress = (activity: Activity) => {
    if (!activity.tasks || activity.tasks.length === 0) {
      return 0;
    }

    const completedTasks = activity.tasks.filter(
      (task) => task.completed
    ).length;
    const totalTasks = activity.tasks.length;

    return Math.round((completedTasks / totalTasks) * 100);
  };

  // Obtener ancho de la barra basado en la duración para tareas
  const getBarWidth = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const startOffset = (start.getFullYear() - 2025) * 12 + start.getMonth();
    const endOffset = (end.getFullYear() - 2025) * 12 + end.getMonth();
    const visibleStartOffset = timelineOffset;
    const visibleEndOffset = timelineOffset + visibleMonthsRange - 1;

    if (endOffset < visibleStartOffset || startOffset > visibleEndOffset) {
      return 0;
    }

    const startPos = getDatePosition(startDate);
    const endPos = getDatePosition(endDate);

    let width = endPos.left - startPos.left;

    if (startPos.left >= 100) {
      return 0;
    } else if (endPos.left > 100) {
      width = 100 - startPos.left;
    }

    return Math.max(1, width);
  };

  // Obtener posición del día de hoy
  const getTodayPosition = () => {
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

    console.log('Today position calculation:', {
      currentYear,
      currentMonth,
      currentDay,
      targetMonth,
      leftPosition: `${leftPosition}%`,
    });

    return {
      month: targetMonth,
      day: currentDay,
      left: leftPosition,
    };
  };

  // Obtener posición en porcentaje para la línea roja
  const getTodayPositionPercent = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    const todayOffset = (currentYear - 2025) * 12 + currentMonth;
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
    const leftPercent = monthStartPosition + dayPosition;

    console.log('Cálculo directo por columna:', {
      año: currentYear,
      mes: currentMonth,
      día: currentDay,
      mesObjetivo: relativeMonth,
      díasEnMes: daysInMonth,
      posiciónMes: `${monthStartPosition.toFixed(2)}%`,
      anchoDía: `${dayWidth.toFixed(2)}%`,
      posiciónDía: `${dayPosition.toFixed(2)}%`,
      posiciónFinal: `${leftPercent.toFixed(2)}%`,
      columna: MONTHS[relativeMonth],
    });

    return leftPercent;
  };

  if (ganttError) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {ganttError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto' : ''} ${isFullscreen ? 'p-4' : 'pt-2 px-4 pb-8'}`}
      >
        {/* Header compacto de progreso */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            {/* Botones de toggle Gantt/Kanban */}
            <div className="flex items-center space-x-2">
              {/* Botón de pantalla completa */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={toggleFullscreen}
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 rounded-lg transition-all duration-200 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm"
                  >
                    {isFullscreen ? (
                      <Minimize className="h-4 w-4" />
                    ) : (
                      <Maximize className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isFullscreen
                      ? 'Salir de pantalla completa'
                      : 'Ver en pantalla completa'}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Nombre del proyecto y botón de cambiar proyecto - solo en fullscreen */}
              {isFullscreen && projectName && (
                <div className="flex items-center space-x-3 ml-4 flex-1">
                  {/* Botón de cambiar proyecto */}
                  {onProjectChange && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={onProjectChange}
                          className="h-10 w-10 rounded-full shadow-lg bg-gray-800 hover:bg-gray-900 text-white transition-all duration-200 hover:scale-105 flex-shrink-0"
                        >
                          <ArrowLeftRight size={20} strokeWidth={2.5} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Cambiar proyecto</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {/* Nombre del proyecto */}
                  <h1 className="text-2xl font-bold text-gray-900 truncate flex-1 min-w-0">
                    {projectName}
                  </h1>
                </div>
              )}

              {/* Contenedor de botones Gantt/Kanban con espaciado solo en fullscreen */}
              <div
                className={`flex items-center space-x-2 ${isFullscreen ? 'ml-8' : ''}`}
              >
                <Button
                  type="button"
                  onClick={() => setViewMode('gantt')}
                  variant="ghost"
                  size="sm"
                  className={`h-10 px-4 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                    viewMode === 'gantt'
                      ? 'bg-gray-900 text-white hover:bg-gray-800 hover:text-white' // Estado seleccionado: como los tabs de arriba
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm' // Estado no seleccionado: como la tarjeta de progreso
                  }`}
                  title="Vista Gantt"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span className="text-sm font-medium">Gantt</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => setViewMode('kanban')}
                  variant="ghost"
                  size="sm"
                  className={`h-10 px-4 rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                    viewMode === 'kanban'
                      ? 'bg-gray-900 text-white hover:bg-gray-800 hover:text-white' // Estado seleccionado: como los tabs de arriba
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm' // Estado no seleccionado: como la tarjeta de progreso
                  }`}
                  title="Vista Kanban"
                >
                  <FolderKanban className="h-4 w-4" />
                  <span className="text-sm font-medium">Kanban</span>
                </Button>
              </div>
            </div>

            {/* Progreso del proyecto */}
            <div className="flex items-center space-x-4">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-base font-semibold text-gray-900">
                  Progreso
                </span>
                <div className="flex items-center space-x-3">
                  <div className="w-72 bg-gray-200 rounded-full h-2.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                      style={{ width: `${calculateProjectProgress()}%` }}
                    ></div>
                  </div>
                  <span className="text-4xl font-bold text-emerald-600">
                    {calculateProjectProgress()}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mensaje de éxito */}
        {successMessage && (
          <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
            <div className="px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 bg-emerald-500 text-white">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium">¡Guardado!</span>
            </div>
          </div>
        )}

        {/* Calendario Gantt - Siempre visible */}
        <div className="mt-0">
          <Card
            className={
              isFullscreen
                ? viewMode === 'gantt'
                  ? 'h-[calc(100vh-160px)]'
                  : 'h-[calc(100vh-100px)]'
                : ''
            }
          >
            <CardContent className="p-0 h-full">
              <div
                className={`gantt-container relative ${isFullscreen ? 'h-full' : ''}`}
              >
                {/* Contenedor con scroll horizontal que incluye todo */}
                <div
                  className={`overflow-x-auto ${isFullscreen ? 'h-full' : ''}`}
                >
                  <div
                    className={`w-full min-w-[800px] relative ${isFullscreen ? 'h-full' : ''}`}
                  >
                    {/* Header del calendario - solo en vista Gantt */}
                    {viewMode === 'gantt' && (
                      <div className="flex border-b border-white">
                        <div
                          className="w-[500px] p-4 border-r border-gray-200 bg-gray-50 relative flex-shrink-0"
                          data-column="activities"
                        >
                          <div className="flex items-center relative">
                            <div className="flex items-center space-x-2">
                              {viewMode === 'gantt' && (
                                <div className="relative group">
                                  <Button
                                    type="button"
                                    onClick={toggleAllDescriptions}
                                    disabled={
                                      activities.length === 0 || ganttLoading
                                    }
                                    variant="ghost"
                                    size="sm"
                                    aria-pressed={allExpanded}
                                    aria-label={
                                      allExpanded
                                        ? 'Contraer todas las actividades'
                                        : 'Expandir todas las actividades'
                                    }
                                    className="h-7 w-7 p-0 rounded-full bg-white/80 hover:bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md hover:shadow-blue-500/20 hover:border-blue-300 hover:text-blue-600 hover:scale-110 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all duration-200 ease-out"
                                    onMouseEnter={(e) => {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      const tooltip =
                                        document.getElementById(
                                          'chevron-tooltip'
                                        );
                                      if (tooltip) {
                                        tooltip.style.left = `${rect.left + rect.width / 2}px`;
                                        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
                                        tooltip.style.transform =
                                          'translateX(-50%)';
                                        tooltip.style.opacity = '1';
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      const tooltip =
                                        document.getElementById(
                                          'chevron-tooltip'
                                        );
                                      if (tooltip) {
                                        tooltip.style.opacity = '0';
                                      }
                                    }}
                                  >
                                    {allExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </div>
                              )}
                              {viewMode === 'gantt' && (
                                <div className="relative group">
                                  <Button
                                    onClick={handleAddActivityClick}
                                    variant="outline"
                                    className="rounded-full w-7 h-7 p-0 bg-white/80 hover:bg-white text-gray-700 border border-gray-200 shadow-sm hover:shadow-md hover:shadow-blue-500/20 hover:border-blue-300 hover:text-blue-600 hover:scale-110 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 transition-all duration-200 ease-out"
                                    aria-label="Agregar actividad"
                                    onMouseEnter={(e) => {
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      const tooltip = document.getElementById(
                                        'add-activity-tooltip'
                                      );
                                      if (tooltip) {
                                        tooltip.style.left = `${rect.left + rect.width / 2}px`;
                                        tooltip.style.top = `${rect.top - tooltip.offsetHeight - 8}px`;
                                        tooltip.style.transform =
                                          'translateX(-50%)';
                                        tooltip.style.opacity = '1';
                                      }
                                    }}
                                    onMouseLeave={() => {
                                      const tooltip = document.getElementById(
                                        'add-activity-tooltip'
                                      );
                                      if (tooltip) {
                                        tooltip.style.opacity = '0';
                                      }
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">
                                {viewMode === 'gantt'
                                  ? 'Actividades'
                                  : 'Tablero Kanban'}
                              </h3>
                              {ganttLoading && (
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div
                          ref={monthsHeaderRef}
                          className="flex-1 flex relative bg-gray-50"
                          style={{ paddingRight: `${scrollbarWidth}px` }}
                        >
                          {getVisibleMonths().map((month, index) => (
                            <div
                              key={`${month.year}-${month.monthIndex}`}
                              className="flex-1 p-2 text-center border-r border-gray-200 bg-gray-50 flex flex-col items-center justify-center"
                            >
                              <div className="text-sm font-medium text-gray-700">
                                {month.name}
                              </div>
                              <div className="text-xs text-gray-500 font-normal">
                                {month.year}
                              </div>
                            </div>
                          ))}

                          {/* Indicador de "Hoy" */}
                          {getTodayPositionPercent() >= 0 && (
                            <div
                              className="absolute bg-red-500 rounded-full z-50 shadow-lg pointer-events-none"
                              style={{
                                left: `${getTodayPositionPercent()}%`,
                                transform: 'translateX(-45%) translateY(50%)',
                                width: '14px',
                                height: '14px',
                                bottom: '0px',
                              }}
                            ></div>
                          )}

                          {/* Línea roja continua del día de hoy - superpuesta sobre todo el contenido */}
                          {getTodayPositionPercent() >= 0 && (
                            <div
                              className="absolute w-0.5 bg-red-500 z-40 pointer-events-none"
                              style={{
                                left: `${getTodayPositionPercent()}%`,
                                top: '100%',
                                height: 'calc(100vh - 375px)',
                              }}
                            ></div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Renderizado condicional: Vista Gantt o Kanban */}
                    {viewMode === 'kanban' ? (
                      /* Vista Kanban */
                      <div className="p-4 w-full">
                        <KanbanBoard
                          activities={activities}
                          onStatusChange={handleStatusChange}
                          onToggleTaskCompletion={handleToggleTaskCompletion}
                          onReorderActivities={handleReorderActivities}
                          onOptimisticReorder={handleOptimisticReorder}
                          onAddActivity={() =>
                            handleAddActivityClick(
                              undefined as unknown as React.MouseEvent
                            )
                          }
                          isFullscreen={isFullscreen}
                        />
                      </div>
                    ) : (
                      /* Vista Gantt */
                      <>
                        {/* Contenedor con scroll vertical para filas de actividades */}
                        <div
                          ref={scrollContainerRef}
                          className="overflow-y-auto relative"
                          style={{
                            maxHeight: isFullscreen
                              ? 'calc(100vh - 230px)'
                              : 'calc(100vh - 375px)',
                          }}
                        >
                          {/* Filas de actividades y tareas */}
                          {activities.length === 0 ? (
                            <div className="flex">
                              <div
                                className="w-[500px] p-4 border-r border-gray-200 bg-gray-50 flex justify-center items-center"
                                data-column="activities"
                              >
                                <div className="text-center text-gray-500">
                                  <Circle className="h-8 w-8 mx-auto mb-2" />
                                  <p className="text-sm">No hay actividades</p>
                                  <p className="text-xs mt-1">
                                    Usa el botón + en el header para agregar una
                                  </p>
                                </div>
                              </div>
                              <div className="flex-1 p-4 bg-gray-50"></div>
                            </div>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              measuring={{
                                droppable: {
                                  strategy: MeasuringStrategy.Always,
                                },
                              }}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={activities.map(
                                  (activity) => activity.id
                                )}
                                strategy={verticalListSortingStrategy}
                              >
                                {activities.map((activity) => (
                                  <SortableActivity
                                    key={activity.id}
                                    activity={activity}
                                    expandedDescriptions={expandedDescriptions}
                                    toggleDescription={toggleDescription}
                                    handleActivityBarClick={
                                      handleActivityBarClick
                                    }
                                    handleActivityInteraction={
                                      handleActivityInteraction
                                    }
                                    handleDeleteActivity={handleDeleteActivity}
                                    handleToggleTaskCompletion={
                                      handleToggleTaskCompletion
                                    }
                                    getActivityDateRange={getActivityDateRange}
                                    getActivityProgress={getActivityProgress}
                                    getDatePosition={getDatePosition}
                                    getBarWidth={getBarWidth}
                                    formatDateForTooltip={formatDateForTooltip}
                                    scrollbarWidth={scrollbarWidth}
                                  />
                                ))}
                              </SortableContext>

                              {/* Footer para marcar el fin de las actividades */}
                              <div className="flex">
                                <div
                                  className="w-[500px] border-r border-gray-200 bg-gray-50"
                                  data-column="activities"
                                >
                                  <div className="h-6"></div>
                                </div>
                                <div className="flex-1 bg-gray-50">
                                  <div className="h-6"></div>
                                </div>
                              </div>
                            </DndContext>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controles del timeline - solo en vista Gantt */}
          {viewMode === 'gantt' && (
            <div className="mt-4">
              <div className="flex items-center w-full">
                {/* Espaciador reducido para mover controles hacia la izquierda */}
                <div className="w-[300px] min-w-[150px] flex items-center justify-end pr-2">
                  <span className="text-sm font-medium text-gray-700">
                    Navegación:
                  </span>
                </div>

                {/* Slider de navegación temporal */}
                <div className="flex items-center space-x-4 flex-1 min-w-[500px] max-w-[600px]">
                  <Slider
                    value={[timelineOffset]}
                    onValueChange={(value) => setTimelineOffset(value[0])}
                    min={-24}
                    max={24}
                    step={1}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => setTimelineOffset(0)}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3"
                  >
                    Hoy
                  </Button>
                </div>

                {/* Botones de rango de meses */}
                <div className="flex items-center space-x-4 ml-50">
                  <span className="text-sm font-medium text-gray-700">
                    Rango:
                  </span>
                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => setVisibleMonthsRange(6)}
                      variant={visibleMonthsRange === 6 ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 px-3"
                    >
                      6 meses
                    </Button>
                    <Button
                      onClick={() => setVisibleMonthsRange(12)}
                      variant={
                        visibleMonthsRange === 12 ? 'default' : 'outline'
                      }
                      size="sm"
                      className="h-8 px-3"
                    >
                      12 meses
                    </Button>
                    <Button
                      onClick={() => setVisibleMonthsRange(18)}
                      variant={
                        visibleMonthsRange === 18 ? 'default' : 'outline'
                      }
                      size="sm"
                      className="h-8 px-3"
                    >
                      18 meses
                    </Button>
                    <Button
                      onClick={() => setVisibleMonthsRange(24)}
                      variant={
                        visibleMonthsRange === 24 ? 'default' : 'outline'
                      }
                      size="sm"
                      className="h-8 px-3"
                    >
                      24 meses
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Popup simple para agregar tarea */}
        {showAddTask && (
          <div
            className={`fixed ${
              showActivityPopup
                ? 'flex items-center justify-center inset-0 z-[60]'
                : 'z-50'
            }`}
            style={
              showActivityPopup
                ? {}
                : {
                    left: `${popupPosition.x}px`,
                    top: `${popupPosition.y}px`,
                  }
            }
          >
            <Card
              className={`w-96 shadow-2xl border-2 ${
                showActivityPopup ? 'ml-[380px]' : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Nueva Tarea
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddTask(false);
                      setSelectedActivity(null);
                      setTaskForm({
                        name: '',
                        description: '',
                        startDate: '',
                        endDate: '',
                      });
                    }}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                  >
                    ×
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Input
                      value={taskForm.name}
                      onChange={(e) =>
                        handleTaskInputChange('name', e.target.value)
                      }
                      placeholder="Nombre de la tarea *"
                      className="w-full"
                      maxLength={62}
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {taskForm.name.length}/62 caracteres
                    </div>
                  </div>

                  <div>
                    <textarea
                      value={taskForm.description}
                      onChange={(e) =>
                        handleTaskInputChange('description', e.target.value)
                      }
                      placeholder="Descripción de la tarea (opcional)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-gray-400 resize-none text-sm"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">
                        Fecha de inicio *
                      </Label>
                      <Calendar
                        value={taskForm.startDate || undefined}
                        onChange={(date) =>
                          handleTaskInputChange('startDate', date)
                        }
                        placeholder="Seleccionar fecha de inicio"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700 mb-1 block">
                        Fecha de término *
                      </Label>
                      <Calendar
                        value={taskForm.endDate || undefined}
                        onChange={(date) =>
                          handleTaskInputChange('endDate', date)
                        }
                        placeholder="Seleccionar fecha de término"
                        className="w-full"
                        minDate={taskForm.startDate || undefined}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddTask(false);
                        setSelectedActivity(null);
                        setTaskForm({
                          name: '',
                          description: '',
                          startDate: '',
                          endDate: '',
                        });
                      }}
                      size="sm"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateTask}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      size="sm"
                    >
                      Crear
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Popup unificado de actividad */}
        {showActivityPopup && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto"
            onClick={() => {
              setShowActivityPopup(false);
              setSelectedActivityForPopup(null);
              setUnifiedActivityForm({ name: '', description: '' });
              setTempTasks([]);
            }}
          >
            <Card
              className="w-[700px] max-h-[90vh] shadow-2xl border-2 mx-4 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {activityPopupMode === 'create'
                      ? 'Crear Actividad'
                      : activityPopupMode === 'edit'
                        ? 'Editar Actividad'
                        : 'Información de Actividad'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowActivityPopup(false);
                      setSelectedActivityForPopup(null);
                      setUnifiedActivityForm({ name: '', description: '' });
                      setTempTasks([]);
                    }}
                    className="h-10 w-10 p-0 hover:bg-gray-100 rounded-full transition-all duration-200 hover:scale-105"
                  >
                    <span className="text-lg font-semibold text-gray-600 hover:text-gray-800">
                      ×
                    </span>
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Formulario de nombre y descripción */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        Nombre
                      </h4>
                      {activityPopupMode !== 'view' && (
                        <span
                          className={`text-xs ${unifiedActivityForm.name.length > 76 ? 'text-red-500' : unifiedActivityForm.name.length > 60 ? 'text-yellow-500' : 'text-gray-400'}`}
                        >
                          {unifiedActivityForm.name.length}/76
                        </span>
                      )}
                    </div>
                    {activityPopupMode === 'view' ? (
                      <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">
                        {selectedActivityForPopup?.name}
                      </p>
                    ) : (
                      <Input
                        value={unifiedActivityForm.name}
                        onChange={(e) =>
                          handleUnifiedActivityInputChange(
                            'name',
                            e.target.value
                          )
                        }
                        placeholder="Nombre de la actividad *"
                        className={`w-full ${unifiedActivityForm.name.length > 76 ? 'border-red-500 focus:border-red-500' : ''}`}
                        maxLength={76}
                        required
                      />
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </h4>
                    {activityPopupMode === 'view' ? (
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap min-h-[60px]">
                        {selectedActivityForPopup?.description ||
                          'Sin descripción'}
                      </p>
                    ) : (
                      <textarea
                        value={unifiedActivityForm.description}
                        onChange={(e) =>
                          handleUnifiedActivityInputChange(
                            'description',
                            e.target.value
                          )
                        }
                        placeholder="Descripción (opcional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:border-gray-400 resize-none text-sm"
                        rows={5}
                      />
                    )}
                  </div>

                  {/* Período - siempre visible */}
                  {(() => {
                    const activityRange = selectedActivityForPopup
                      ? getActivityDateRange(selectedActivityForPopup)
                      : null;
                    if (!activityRange && activityPopupMode === 'view')
                      return null;

                    return (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Período
                        </h4>
                        <div className="bg-gray-50 p-4 rounded-md">
                          {activityRange ? (
                            <PeriodTimeline
                              startDate={activityRange.startDate}
                              endDate={activityRange.endDate}
                            />
                          ) : (
                            <div className="text-sm text-gray-500 italic text-center py-4">
                              {activityPopupMode === 'create'
                                ? 'El período se calculará automáticamente basado en las tareas que agregues'
                                : 'Sin tareas definidas'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Progreso - solo en modo view */}
                  {activityPopupMode === 'view' && selectedActivityForPopup && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Progreso
                      </h4>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">
                            Completado
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {getActivityProgress(selectedActivityForPopup)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${getActivityProgress(selectedActivityForPopup)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tareas - siempre visible */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-700">
                        Tareas{' '}
                        {(() => {
                          if (activityPopupMode === 'view') {
                            return selectedActivityForPopup?.tasks
                              ? `(${selectedActivityForPopup.tasks.length})`
                              : '(0)';
                          } else if (activityPopupMode === 'edit') {
                            const existingTasks =
                              selectedActivityForPopup?.tasks || [];
                            return `(${existingTasks.length + tempTasks.length})`;
                          } else {
                            return `(${tempTasks.length})`;
                          }
                        })()}
                      </h4>
                      {activityPopupMode !== 'view' && (
                        <Button
                          onClick={() => {
                            const tempActivity: Activity =
                              selectedActivityForPopup || {
                                id: 'temp-activity',
                                name:
                                  unifiedActivityForm.name ||
                                  'Actividad temporal',
                                description:
                                  unifiedActivityForm.description || '',
                                progress: 0,
                                tasks: tempTasks,
                                projectId: projectId || '',
                                color: '#3B82F6',
                                orderIndex: 0,
                                kanbanOrderIndex: 0,
                                status: 'TODO',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                              };
                            setSelectedActivity(tempActivity);
                            setShowAddTask(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Agregar Tarea
                        </Button>
                      )}
                    </div>

                    <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                      {(() => {
                        let tasksToShow = [];
                        if (activityPopupMode === 'view') {
                          tasksToShow = selectedActivityForPopup?.tasks || [];
                        } else if (activityPopupMode === 'edit') {
                          const existingTasks =
                            selectedActivityForPopup?.tasks || [];
                          tasksToShow = [...existingTasks, ...tempTasks];
                        } else {
                          tasksToShow = tempTasks;
                        }

                        return tasksToShow.length > 0 ? (
                          <div className="space-y-2">
                            {tasksToShow
                              .sort(
                                (a, b) =>
                                  new Date(a.startDate).getTime() -
                                  new Date(b.startDate).getTime()
                              )
                              .map((task, index) => (
                                <div
                                  key={task.id}
                                  className="flex items-start justify-between p-2 bg-white rounded border"
                                >
                                  <div className="flex items-start space-x-2 flex-1 min-w-0">
                                    <span className="text-xs text-gray-500">
                                      {index + 1}.
                                    </span>
                                    <input
                                      type="checkbox"
                                      checked={task.completed}
                                      onChange={async () => {
                                        if (task.id.startsWith('temp-')) {
                                          setTempTasks((prev) =>
                                            prev.map((t) =>
                                              t.id === task.id
                                                ? {
                                                    ...t,
                                                    completed: !t.completed,
                                                  }
                                                : t
                                            )
                                          );
                                        } else {
                                          await handleToggleTaskCompletion(
                                            task.id
                                          );
                                          if (selectedActivityForPopup) {
                                            const updatedActivity = {
                                              ...selectedActivityForPopup,
                                              tasks:
                                                selectedActivityForPopup.tasks?.map(
                                                  (t) =>
                                                    t.id === task.id
                                                      ? {
                                                          ...t,
                                                          completed:
                                                            !t.completed,
                                                        }
                                                      : t
                                                ) || [],
                                            };
                                            setSelectedActivityForPopup(
                                              updatedActivity
                                            );
                                          }
                                        }
                                      }}
                                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span
                                      className={`text-sm ${task.completed ? 'line-through text-gray-500' : 'text-gray-700'} break-words max-w-[200px]`}
                                    >
                                      {task.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                    <span className="text-xs text-gray-500">
                                      {formatDateForTooltip(task.startDate)} -{' '}
                                      {formatDateForTooltip(task.endDate)}
                                    </span>
                                    <div
                                      className={`w-2 h-2 rounded-full ${task.completed ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                    ></div>
                                    {activityPopupMode !== 'view' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          if (activityPopupMode === 'create') {
                                            setTempTasks((prev) =>
                                              prev.filter(
                                                (t) => t.id !== task.id
                                              )
                                            );
                                          } else if (
                                            activityPopupMode === 'edit'
                                          ) {
                                            if (task.id.startsWith('temp-')) {
                                              setTempTasks((prev) =>
                                                prev.filter(
                                                  (t) => t.id !== task.id
                                                )
                                              );
                                            } else {
                                              const confirmed = window.confirm(
                                                '¿Estás seguro de que deseas eliminar esta tarea?'
                                              );
                                              if (confirmed) {
                                                handleDeleteTask(task.id);
                                                if (selectedActivityForPopup) {
                                                  const updatedActivity = {
                                                    ...selectedActivityForPopup,
                                                    tasks:
                                                      selectedActivityForPopup.tasks?.filter(
                                                        (t) => t.id !== task.id
                                                      ) || [],
                                                  };
                                                  setSelectedActivityForPopup(
                                                    updatedActivity
                                                  );
                                                }
                                              }
                                            }
                                          } else {
                                            handleDeleteTask(task.id);
                                          }
                                        }}
                                        className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-500">
                              {activityPopupMode === 'create'
                                ? 'Agrega al menos una tarea para crear la actividad'
                                : 'No hay tareas definidas'}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex justify-end space-x-2 pt-4">
                    {activityPopupMode === 'view' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setActivityPopupMode('edit');
                          setUnifiedActivityForm({
                            name: selectedActivityForPopup?.name || '',
                            description:
                              selectedActivityForPopup?.description || '',
                          });
                          setTempTasks([]);
                        }}
                        size="sm"
                        className="text-blue-600 border-blue-600 hover:bg-blue-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => {
                        if (activityPopupMode === 'view') {
                          setShowActivityPopup(false);
                          setSelectedActivityForPopup(null);
                          setUnifiedActivityForm({ name: '', description: '' });
                          setTempTasks([]);
                          setActivityPopupMode('view');
                        } else {
                          setActivityPopupMode('view');
                          setUnifiedActivityForm({ name: '', description: '' });
                          setTempTasks([]);
                        }
                      }}
                      size="sm"
                    >
                      {activityPopupMode === 'view' ? 'Cerrar' : 'Cancelar'}
                    </Button>

                    {activityPopupMode !== 'view' && (
                      <Button
                        onClick={handleUnifiedActivityAction}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        {activityPopupMode === 'create'
                          ? 'Crear Actividad'
                          : 'Guardar Cambios'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tooltips independientes posicionados en el viewport */}
        <div
          id="chevron-tooltip"
          className="fixed px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 pointer-events-none whitespace-nowrap z-[99999] opacity-0 transition-opacity duration-200"
          style={{ transform: 'translateX(-50%)' }}
        >
          {allExpanded
            ? 'Contraer todas las actividades'
            : 'Expandir todas las actividades'}
        </div>

        <div
          id="add-activity-tooltip"
          className="fixed px-3 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg shadow-lg border border-gray-200 pointer-events-none whitespace-nowrap z-[99999] opacity-0 transition-opacity duration-200"
          style={{ transform: 'translateX(-50%)' }}
        >
          Agregar actividad
        </div>
      </div>
    </TooltipProvider>
  );
}
