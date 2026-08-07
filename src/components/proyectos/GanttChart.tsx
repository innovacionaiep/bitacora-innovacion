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
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
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
  MessageSquare,
  Send,
  FileText,
  Paperclip,
  Loader2,
  X,
  Save,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import {
  getComentariosActividad,
  createComentarioActividad,
  type ComentarioActividadData,
} from '@/lib/actions/comentarios-actividad';
import {
  getEvidenciasActividad,
  createEvidenciaActividad,
  deleteEvidenciaActividad,
  type EvidenciaActividadData,
} from '@/lib/actions/evidencias-actividad';
import { uploadEvidenciaFile } from '@/lib/evidencias-upload';
import dynamic from 'next/dynamic';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PeriodTimeline } from '@/components/ui/period-timeline';
import { Slider } from '@/components/ui/slider';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  memo,
  useCallback,
} from 'react';
import { GanttActivityVirtualList } from '@/components/proyectos/gantt/GanttActivityList';
import {
  ActivityFieldSaveCancel,
  ActivityHoverEditButton,
} from '@/components/proyectos/gantt/ActivityFieldControls';
import type {
  ActivityEditableField,
  GanttChartProps,
  SortableActivityProps,
} from '@/components/proyectos/gantt/gantt-types';
import {
  convertDateToISO,
  formatDateForTooltip,
  getActivityDateRange as computeActivityDateRange,
  getActivityProgress as computeActivityProgress,
  getActivityRowHeight,
  getBarWidth as computeBarWidth,
  getDatePosition as computeDatePosition,
  getProjectStats as computeProjectStats,
  getTodayCenteredOffset,
  getTodayPositionPercent,
  getVisibleMonths as computeVisibleMonths,
  TIMELINE_MAX_OFFSET,
  TIMELINE_MIN_OFFSET,
} from '@/components/proyectos/gantt/gantt-utils';
import { useGantt, type Activity, type Task } from '@/hooks/useGantt';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import { ActivityStatus } from '@prisma/client';

const KanbanBoard = dynamic(() => import('@/components/proyectos/KanbanBoard'), {
  ssr: false,
  loading: () => <div className="min-h-[120px]" />,
});
import { reorderActivitiesKanban } from '@/lib/actions/gantt';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/** Color del % de avance: negro (0%) → emerald-600 (100%). */
function getProgressLabelColor(progress: number): string {
  const t = Math.min(100, Math.max(0, progress)) / 100;
  // emerald-600 = #059669 → rgb(5, 150, 105)
  return `rgb(${Math.round(5 * t)}, ${Math.round(150 * t)}, ${Math.round(105 * t)})`;
}

const SortableActivity = memo(function SortableActivity({
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

  const isExpanded = expandedDescriptions.has(activity.id);
  const rowHeight = getActivityRowHeight(isExpanded, activity.tasks.length);

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
                  <span
                    className={`activity-title font-medium text-gray-900 min-w-0 w-full leading-tight cursor-default hover:text-blue-600 transition-colors duration-200 inline-flex items-center ${isDragging ? 'dragging-text' : ''}`}
                    style={{
                      fontSize: '15px',
                      lineHeight: '1.3',
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
                    <span className="truncate min-w-0">{activity.name}</span>
                    {/* Punto oculto (mismo color que el fondo) para mantener la posición de la línea */}
                    <span
                      className="w-2 h-2 rounded-full inline-block ml-1 flex-shrink-0 relative bg-white"
                      style={{
                        verticalAlign: 'middle',
                        transform: 'translateY(-36%)',
                      }}
                    >
                      {/* Línea sutil desde el punto hasta el borde derecho de la columna (bajada ~2px para alinear con la línea del timeline) */}
                      <div
                        className="absolute transform -translate-y-1/2 pointer-events-none"
                        style={{
                          top: 'calc(50% + 2px)',
                          left: 'calc(100% + 0px)',
                          right: 'calc(-100vw + 416px - 8px)',
                          height: '0.1px',
                          backgroundColor: '#e5e7eb',
                          opacity: 1,
                          zIndex: 9999,
                        }}
                      />
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Título de actividad posicionado a la altura de su barra cuando está expandido */}
            {expandedDescriptions.has(activity.id) && (
              <div
                className={`absolute left-0 right-0 top-0 bottom-0 pointer-events-none ${isDragging ? 'dragging-absolute' : ''}`}
              >
                {(() => {
                  const startOffset = 4;
                  // Siempre 1 línea (whitespace-nowrap / truncate); misma calibración que el caso corto original
                  const topPosition = startOffset + 18;

                  return (
                    <div
                      className={`absolute font-medium text-gray-900 leading-tight cursor-pointer hover:text-blue-600 transition-colors duration-200 pointer-events-auto inline-flex items-center min-w-0 ${isDragging ? 'dragging-text' : ''}`}
                      style={{
                        fontSize: '15px',
                        lineHeight: '1.3',
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
                        className="activity-title truncate min-w-0"
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
                          {/* Nombre de la tarea: truncado solo en el texto; punto/línea iguales que el original */}
                          <span
                            className={`task-title flex-1 relative ${task.completed ? 'line-through text-gray-400' : 'text-gray-600'} ${isDragging ? 'dragging-text' : ''}`}
                            data-task-id={task.id}
                            style={{
                              display: 'inline-block',
                              maxWidth: '100%',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                maxWidth: 'calc(100% - 12px)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                verticalAlign: 'middle',
                              }}
                            >
                              {task.name}
                            </span>
                            {/* Punto oculto (mismo color que el fondo) para mantener la posición de la línea */}
                            <span
                              className="w-2 h-2 rounded-full inline-block ml-1 relative bg-white"
                              style={{
                                verticalAlign: 'middle',
                                transform: 'translateY(-36%)',
                                top: '50%',
                              }}
                            >
                              {/* Línea sutil desde el punto hasta el borde derecho de la columna */}
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
            // Bajada milimétrica de la barra para alinear su línea con la del nombre (2.5px)
            const activityBarTopOffset = 2.5;

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
                    top: `${startOffset + activityBarTopOffset}px`,
                  }}
                >
                  {/* Línea de conexión desde el inicio del timeline hasta la barra de actividad (oculta cuando la actividad está expandida) */}
                  {!expandedDescriptions.has(activity.id) && (
                    <div
                      className="absolute top-1/2 transform -translate-y-1/2 pointer-events-none z-10"
                      style={{
                        left: '0%',
                        width: `${startPos.left}%`,
                        height: '0.1px',
                        backgroundColor: '#e5e7eb',
                        opacity: 1,
                      }}
                    />
                  )}
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
                    </div>

                    {/* Porcentaje siempre a la derecha de la barra; color negro→esmeralda según avance */}
                    {!expandedDescriptions.has(activity.id) && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 text-xs font-semibold z-30 pointer-events-none tabular-nums whitespace-nowrap"
                        style={{
                          left: `calc(${startPos.left + barWidth}% + 8px)`,
                          color: getProgressLabelColor(activityProgress),
                        }}
                      >
                        {activityProgress}%
                      </div>
                    )}
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
});

export default function GanttChart({
  projectId,
  projectName,
  showProjectSelector = false,
  onProjectChange,
  initialActivities,
  topLoaderEnabled = true,
  footerLeft,
}: GanttChartProps) {
  const { data: session } = useSession();
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
  const [editingActivityField, setEditingActivityField] =
    useState<ActivityEditableField | null>(null);
  const [activityFieldDraft, setActivityFieldDraft] = useState({
    name: '',
    description: '',
  });
  const [isSavingActivityField, setIsSavingActivityField] = useState(false);

  // Timer para ocultar el tooltip con delay
  const [tooltipTimer, setTooltipTimer] = useState<NodeJS.Timeout | null>(null);

  // Estado para controlar el rango visible de meses (6-24 meses)
  const [visibleMonthsRange, setVisibleMonthsRange] = useState(12);

  // Estado para controlar el offset del timeline (meses desde enero 2025); inicializa centrado en hoy
  // Navegación acotada a ene 2026 … ene 2027 (vista 12 meses hasta dic 2027)
  const [timelineOffset, setTimelineOffset] = useState(() =>
    getTodayCenteredOffset(12)
  );

  // Refs y estado para manejar el ancho del scrollbar y altura de la línea "hoy"
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const monthsHeaderRef = useRef<HTMLDivElement>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [todayLineHeight, setTodayLineHeight] = useState(0);

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
  const getVisibleMonths = () =>
    computeVisibleMonths(timelineOffset, visibleMonthsRange);

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

  // Estado para tarea en edición inline
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskForm, setEditingTaskForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  // Estado para mostrar formulario inline de agregar tarea
  const [showInlineAddTask, setShowInlineAddTask] = useState(false);
  const [inlineTaskForm, setInlineTaskForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
  });

  // Estado para comentarios de actividad
  const [comentariosActividad, setComentariosActividad] = useState<
    ComentarioActividadData[]
  >([]);
  const [nuevoComentarioActividad, setNuevoComentarioActividad] = useState('');
  const [isLoadingComentariosActividad, setIsLoadingComentariosActividad] =
    useState(false);
  const [isEnviandoComentarioActividad, setIsEnviandoComentarioActividad] =
    useState(false);

  // Estado para evidencias de actividad
  const [evidenciasActividad, setEvidenciasActividad] = useState<
    EvidenciaActividadData[]
  >([]);
  const [isLoadingEvidencias, setIsLoadingEvidencias] = useState(false);
  const [isUploadingEvidencia, setIsUploadingEvidencia] = useState(false);
  const [isSubmittingActivityAction, setIsSubmittingActivityAction] =
    useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const evidenciasFileInputRef = useRef<HTMLInputElement>(null);

  // Usar el hook de Gantt con el projectId recibido como prop
  const {
    activities,
    loading: ganttLoading,
    error: ganttError,
    createActivity,
    updateActivity,
    updateTask,
    deleteActivity,
    createTask,
    deleteTask,
    toggleTaskCompletion,
    calculateProjectProgress,
    reorderActivities,
    updateActivityStatus,
    loadActivities,
    updateActivitiesState, // ← Agregar
  } = useGantt(projectId, initialActivities);

  usePageTopLoader(ganttLoading, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });

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
  const stats = computeProjectStats(projectId, activities);

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
    setEditingTaskId(null);
    setShowInlineAddTask(false);
    setInlineTaskForm({
      name: '',
      description: '',
      startDate: '',
      endDate: '',
    });

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
    setEditingTaskId(null);
    setShowInlineAddTask(false);

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

  // Medir scrollbar y altura del área de filas (línea "hoy" debe coincidir exactamente)
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const measure = () => {
      setScrollbarWidth(el.offsetWidth - el.clientWidth);
      setTodayLineHeight(el.clientHeight);
    };

    measure();
    const timeoutId = setTimeout(measure, 100);
    const observer = new ResizeObserver(measure);
    observer.observe(el);

    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [activities, expandedDescriptions, isFullscreen, viewMode]);

  // Cargar comentarios y evidencias en paralelo al abrir popup
  useEffect(() => {
    const actividadId = selectedActivityForPopup?.id;
    if (!actividadId || actividadId.startsWith('temp-') || !showActivityPopup) {
      setComentariosActividad([]);
      setEvidenciasActividad([]);
      return;
    }

    let isCancelled = false;
    const cargarDatosPopup = async () => {
      setIsLoadingComentariosActividad(true);
      setIsLoadingEvidencias(true);
      const [comentariosResult, evidenciasResult] = await Promise.all([
        getComentariosActividad(actividadId),
        getEvidenciasActividad(actividadId),
      ]);
      if (!isCancelled) {
        if (comentariosResult.success && comentariosResult.data) {
          setComentariosActividad(comentariosResult.data);
        }
        if (evidenciasResult.success && evidenciasResult.data) {
          setEvidenciasActividad(evidenciasResult.data);
        }
        setIsLoadingComentariosActividad(false);
        setIsLoadingEvidencias(false);
      }
    };
    cargarDatosPopup();
    return () => {
      isCancelled = true;
    };
  }, [selectedActivityForPopup?.id, showActivityPopup]);

  // Manejar cambios en el formulario de actividad
  const handleActivityInputChange = (field: string, value: string) => {
    setActivityForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Manejar cambios en el formulario de tarea
  const handleTaskInputChange = (field: string, value: string) => {
    // Limitar el nombre de la tarea a 70 caracteres máximo
    if (field === 'name' && value.length > 70) {
      alert('El nombre de la tarea no puede exceder 70 caracteres');
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

    // Validar que el nombre no exceda 70 caracteres
    if (taskForm.name.length > 70) {
      alert('El nombre de la tarea no puede exceder 70 caracteres');
      return;
    }

    const convertedStartDate = convertDateToISO(taskForm.startDate);
    const convertedEndDate = convertDateToISO(taskForm.endDate);

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

  const showSuccessMessage = useCallback((message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  // Toggle completar tarea
  const handleToggleTaskCompletion = useCallback(
    async (taskId: string) => {
      try {
        await toggleTaskCompletion(taskId);
        showSuccessMessage('Tarea actualizada exitosamente');
      } catch (error) {
        console.error('Error updating task:', error);
        showSuccessMessage('Error al actualizar la tarea');
      }
    },
    [toggleTaskCompletion, showSuccessMessage]
  );

  // Eliminar actividad
  const handleDeleteActivity = useCallback(
    async (activityId: string) => {
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
    },
    [deleteActivity, showSuccessMessage]
  );

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
  const handleAddActivityClick = (_event?: React.MouseEvent) => {
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

  // Manejar clic en editar actividad → abre detalle (edición por campo con hover)
  const handleEditActivityClick = (
    event: React.MouseEvent,
    activity: Activity
  ) => {
    closeFormPopups();
    openActivityPopup('view', activity);
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

  const handleStartActivityFieldEdit = (field: ActivityEditableField) => {
    if (!selectedActivityForPopup) return;
    setActivityFieldDraft({
      name: selectedActivityForPopup.name || '',
      description: selectedActivityForPopup.description || '',
    });
    setEditingActivityField(field);
    setEditingTaskId(null);
    setShowInlineAddTask(false);
  };

  const handleCancelActivityFieldEdit = () => {
    setEditingActivityField(null);
    if (selectedActivityForPopup) {
      setActivityFieldDraft({
        name: selectedActivityForPopup.name || '',
        description: selectedActivityForPopup.description || '',
      });
    }
  };

  const handleSaveActivityField = async () => {
    if (!selectedActivityForPopup || !editingActivityField) return;

    if (editingActivityField === 'name') {
      const name = activityFieldDraft.name.trim();
      if (!name) {
        alert('Por favor completa el nombre de la actividad');
        return;
      }
      if (name.length > 70) {
        alert('El nombre de la actividad no puede exceder los 70 caracteres');
        return;
      }
    }

    setIsSavingActivityField(true);
    try {
      const payload =
        editingActivityField === 'name'
          ? { name: activityFieldDraft.name.trim() }
          : { description: activityFieldDraft.description };

      const { error } = await updateActivity(
        selectedActivityForPopup.id,
        payload
      );

      if (error) {
        alert('Error al actualizar la actividad: ' + error);
        return;
      }

      setSelectedActivityForPopup({
        ...selectedActivityForPopup,
        ...payload,
      });
      setEditingActivityField(null);
      showSuccessMessage('Cambios guardados');
    } finally {
      setIsSavingActivityField(false);
    }
  };

  const handleSaveTaskEdit = async () => {
    if (!editingTaskId) return;
    if (editingTaskForm.name.length > 70) {
      alert('El nombre de la tarea no puede exceder 70 caracteres');
      return;
    }
    const task = [
      ...(selectedActivityForPopup?.tasks || []),
      ...tempTasks,
    ].find((t) => t.id === editingTaskId);
    if (!task) return;

    const convertedStart = convertDateToISO(editingTaskForm.startDate);
    const convertedEnd = convertDateToISO(editingTaskForm.endDate);

    if (task.id.startsWith('temp-')) {
      setTempTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                name: editingTaskForm.name,
                description: editingTaskForm.description,
                startDate: convertedStart,
                endDate: convertedEnd,
              }
            : t
        )
      );
    } else {
      const { error } = await updateTask(task.id, {
        name: editingTaskForm.name,
        description: editingTaskForm.description,
        startDate: convertedStart,
        endDate: convertedEnd,
      });
      if (error) {
        alert('Error al actualizar tarea: ' + error);
        return;
      }
      if (selectedActivityForPopup) {
        const updated =
          selectedActivityForPopup.tasks?.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  name: editingTaskForm.name,
                  description: editingTaskForm.description,
                  startDate: convertedStart,
                  endDate: convertedEnd,
                }
              : t
          ) || [];
        setSelectedActivityForPopup({
          ...selectedActivityForPopup,
          tasks: updated,
        });
      }
      // useGantt.updateTask ya parchea el estado; no hace falta refetch completo
    }
    setEditingTaskId(null);
  };

  const handleInlineAddTask = async () => {
    if (
      !inlineTaskForm.name ||
      !inlineTaskForm.startDate ||
      !inlineTaskForm.endDate
    ) {
      alert('Completa nombre y fechas');
      return;
    }
    if (inlineTaskForm.name.length > 70) {
      alert('El nombre de la tarea no puede exceder 70 caracteres');
      return;
    }
    const act = selectedActivityForPopup;
    // En modo create, act es null - agregar a tempTasks
    if (!act || act.id.startsWith('temp-')) {
      const newTask: Task = {
        id: `temp-${Date.now()}`,
        name: inlineTaskForm.name,
        description: inlineTaskForm.description,
        startDate: convertDateToISO(inlineTaskForm.startDate),
        endDate: convertDateToISO(inlineTaskForm.endDate),
        completed: false,
        activityId: act?.id || 'temp-activity',
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setTempTasks((prev) => [...prev, newTask]);
      setShowInlineAddTask(false);
      setInlineTaskForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
      });
      return;
    }
    setIsCreatingTask(true);
    try {
      const { data: newTask, error } = await createTask(act.id, {
        name: inlineTaskForm.name,
        description: inlineTaskForm.description,
        startDate: convertDateToISO(inlineTaskForm.startDate),
        endDate: convertDateToISO(inlineTaskForm.endDate),
      });
      if (error) {
        alert('Error al crear tarea: ' + error);
        return;
      }
      if (newTask && selectedActivityForPopup) {
        setSelectedActivityForPopup({
          ...selectedActivityForPopup,
          tasks: [...(selectedActivityForPopup.tasks || []), newTask as Task],
        });
      }
      setShowInlineAddTask(false);
      setInlineTaskForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
      });
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleEnviarComentarioActividad = async () => {
    const actividadId = selectedActivityForPopup?.id;
    if (
      !nuevoComentarioActividad.trim() ||
      !actividadId ||
      actividadId.startsWith('temp-')
    )
      return;

    setIsEnviandoComentarioActividad(true);
    const result = await createComentarioActividad(
      actividadId,
      nuevoComentarioActividad.trim()
    );

    if (result.success && result.data) {
      setComentariosActividad([result.data, ...comentariosActividad]);
      setNuevoComentarioActividad('');
    } else {
      alert(result.error || 'Error al enviar comentario');
    }
    setIsEnviandoComentarioActividad(false);
  };

  // Función para manejar la acción principal del popup (crear o guardar)
  const handleUnifiedActivityAction = async () => {
    if (!unifiedActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    // Validar longitud máxima del título (70 caracteres)
    if (unifiedActivityForm.name.length > 70) {
      alert('El nombre de la actividad no puede exceder los 70 caracteres');
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

      // Validar que todas las tareas temporales tengan nombres válidos (máximo 70 caracteres)
      const tasksWithInvalidNames = tempTasks.filter(
        (task) => task.name.length > 70
      );
      if (tasksWithInvalidNames.length > 0) {
        alert(
          `Error: ${tasksWithInvalidNames.length} tarea(s) tienen nombres que exceden 70 caracteres. Por favor, corrige los nombres antes de continuar.`
        );
        return;
      }

      // Crear nueva actividad
      setIsSubmittingActivityAction(true);
      const tasksToCreate = [...tempTasks];
      try {
        const { error, data: newActivity } = await createActivity({
          name: unifiedActivityForm.name,
          description: unifiedActivityForm.description,
        });

        if (error) {
          alert('Error al crear la actividad: ' + error);
        } else if (newActivity) {
          // Cerrar UI al instante; crear tareas en paralelo en background
          setUnifiedActivityForm({ name: '', description: '' });
          setTempTasks([]);
          setShowActivityPopup(false);
          setSelectedActivityForPopup(null);
          showSuccessMessage('Actividad creada exitosamente con sus tareas');
          setIsSubmittingActivityAction(false);

          await Promise.all(
            tasksToCreate.map((task) =>
              createTask(newActivity.id, {
                name: task.name,
                description: task.description || '',
                startDate: task.startDate,
                endDate: task.endDate,
              })
            )
          );
          return;
        }
      } finally {
        setIsSubmittingActivityAction(false);
      }
    } else if (activityPopupMode === 'edit' && selectedActivityForPopup) {
      // Editar actividad existente
      setIsSubmittingActivityAction(true);
      try {
        const { error } = await updateActivity(selectedActivityForPopup.id, {
        name: unifiedActivityForm.name,
        description: unifiedActivityForm.description,
      });

      if (error) {
        alert('Error al actualizar la actividad: ' + error);
      } else {
        // Validar que todas las tareas temporales tengan nombres válidos (máximo 70 caracteres)
        const tasksWithInvalidNames = tempTasks.filter(
          (task) => task.name.length > 70
        );
        if (tasksWithInvalidNames.length > 0) {
          alert(
            `Error: ${tasksWithInvalidNames.length} tarea(s) tienen nombres que exceden 70 caracteres. Por favor, corrige los nombres antes de continuar.`
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
    } finally {
      setIsSubmittingActivityAction(false);
    }
    }
  };

  // Actualizar actividad
  const handleUpdateActivity = async () => {
    if (!editingActivity || !editActivityForm.name) {
      alert('Por favor completa el nombre de la actividad');
      return;
    }

    // Validar longitud máxima del título (70 caracteres)
    if (editActivityForm.name.length > 70) {
      alert('El nombre de la actividad no puede exceder los 70 caracteres');
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
  const toggleDescription = useCallback((activityId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  }, []);

  // Obtener posición de una fecha en el calendario para tareas
  const getDatePosition = useCallback(
    (date: string) =>
      computeDatePosition(date, timelineOffset, visibleMonthsRange),
    [timelineOffset, visibleMonthsRange]
  );

  // Función para abrir el popup unificado en diferentes modos
  const openActivityPopup = useCallback(
    (mode: 'create' | 'edit' | 'view', activity?: Activity) => {
      // 'edit' legacy → view con edición por campo (hover)
      const resolvedMode = mode === 'edit' ? 'view' : mode;
      setActivityPopupMode(resolvedMode);
      setSelectedActivityForPopup(activity || null);
      setEditingActivityField(null);
      setEditingTaskId(null);
      setShowInlineAddTask(false);

      if (resolvedMode === 'create') {
        setUnifiedActivityForm({ name: '', description: '' });
        setTempTasks([]);
        setActivityFieldDraft({ name: '', description: '' });
      } else if (activity) {
        setUnifiedActivityForm({
          name: activity.name,
          description: activity.description || '',
        });
        setActivityFieldDraft({
          name: activity.name,
          description: activity.description || '',
        });
        setTempTasks([]);
      }

      setShowActivityPopup(true);
    },
    []
  );

  const handleActivityBarClick = useCallback(
    (activity: Activity) => {
      openActivityPopup('view', activity);
    },
    [openActivityPopup]
  );

  const handleActivityInteraction = useCallback(
    (
      activity: Activity,
      event: React.MouseEvent | React.TouchEvent | React.PointerEvent,
      isDragging: boolean
    ) => {
      if (isDragging) return;
      event.preventDefault();
      event.stopPropagation();
      openActivityPopup('view', activity);
    },
    [openActivityPopup]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
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
    },
    [activities, reorderActivities, showSuccessMessage]
  );

  const getActivityDateRange = useCallback(
    (activity: Activity) => computeActivityDateRange(activity),
    []
  );

  const getActivityProgress = useCallback(
    (activity: Activity) => computeActivityProgress(activity),
    []
  );

  const getBarWidth = useCallback(
    (startDate: string, endDate: string) =>
      computeBarWidth(
        startDate,
        endDate,
        timelineOffset,
        visibleMonthsRange
      ),
    [timelineOffset, visibleMonthsRange]
  );

  // Obtener posición en porcentaje para la línea roja
  const todayPositionPercent = useMemo(
    () => getTodayPositionPercent(timelineOffset, visibleMonthsRange),
    [timelineOffset, visibleMonthsRange]
  );

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
        className={`${isFullscreen ? 'fixed inset-0 z-50 flex h-full min-h-0 flex-col overflow-hidden bg-white p-4' : 'flex h-full min-h-0 flex-col overflow-hidden pt-2 px-4 pb-4'}`}
      >
        {/* Header compacto de progreso */}
        <div className="mb-3 shrink-0">
          <div className="flex items-center justify-between gap-6 min-w-0">
            {/* Botones de toggle Gantt/Kanban */}
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
              {/* Botón de pantalla completa */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    id="tour-gantt-fullscreen"
                    onClick={toggleFullscreen}
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm"
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

              {/* Nombre del proyecto en fullscreen (máx. 50 caracteres) — ancho del texto, no flex-1 */}
              {isFullscreen && projectName && (
                <div className="flex min-w-0 max-w-full shrink items-center pl-[1.9rem]">
                  <h1
                    className="truncate text-2xl font-bold text-gray-900"
                    title={projectName}
                  >
                    {projectName.length > 50
                      ? `${projectName.slice(0, 50)}…`
                      : projectName}
                  </h1>
                </div>
              )}

              {/* Gantt/Kanban: a la derecha del título (más separación en fullscreen) */}
              <div
                id="tour-gantt-vista-toggle"
                className={`flex shrink-0 items-center space-x-2 ${
                  isFullscreen ? 'ml-6' : ''
                }`}
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

            {/* Progreso del proyecto — alineado al borde derecho del Gantt (mismo contenedor) */}
            <div
              id="tour-gantt-progreso"
              className="flex shrink-0 items-center space-x-4"
            >
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
                  <span className="text-4xl font-bold text-emerald-600 tabular-nums">
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
        <div className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardContent className="flex h-full min-h-0 flex-col overflow-hidden p-0">
              <div
                id="tour-gantt-board"
                className="gantt-container relative flex h-full min-h-0 flex-col"
              >
                {/* Un solo scroll vertical: el de las filas de actividades (no el contenedor externo) */}
                <div className="flex h-full min-h-0 flex-col overflow-hidden">
                  <div className="relative flex h-full min-h-0 w-full min-w-[800px] flex-col">
                    {/* Header del calendario - solo en vista Gantt */}
                    {viewMode === 'gantt' && (
                      <div className="flex shrink-0 border-b border-white">
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
                            </div>
                            <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">
                                {viewMode === 'gantt'
                                  ? 'Actividades'
                                  : 'Tablero Kanban'}
                              </h3>
                            </div>
                          </div>
                        </div>
                        <div
                          ref={monthsHeaderRef}
                          className="flex flex-1 bg-gray-50"
                          style={{ paddingRight: `${scrollbarWidth}px` }}
                        >
                          {/* Misma caja que las columnas de meses (sin el hueco del scrollbar) */}
                          <div className="relative flex min-w-0 flex-1">
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
                            {todayPositionPercent >= 0 && (
                              <div
                                className="absolute bg-red-500 rounded-full z-50 shadow-lg pointer-events-none"
                                style={{
                                  left: `${todayPositionPercent}%`,
                                  transform: 'translateX(-45%) translateY(50%)',
                                  width: '14px',
                                  height: '14px',
                                  bottom: '0px',
                                }}
                              ></div>
                            )}

                            {/* Línea roja continua del día de hoy — altura = área visible de filas */}
                            {todayPositionPercent >= 0 && todayLineHeight > 0 && (
                              <div
                                className="absolute w-0.5 bg-red-500 z-40 pointer-events-none"
                                style={{
                                  left: `${todayPositionPercent}%`,
                                  top: '100%',
                                  height: `${todayLineHeight}px`,
                                }}
                              ></div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Renderizado condicional: Vista Gantt o Kanban */}
                    {viewMode === 'kanban' ? (
                      /* Vista Kanban: altura acotada para scroll vertical por columna */
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4 w-full">
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
                          onActivityTitleClick={(activity) =>
                            openActivityPopup('view', activity)
                          }
                          isFullscreen={isFullscreen}
                        />
                      </div>
                    ) : (
                      /* Vista Gantt */
                      <>
                        {/* Único scroll vertical de filas (ocupa el espacio restante del card) */}
                        <div
                          ref={scrollContainerRef}
                          className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
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
                                    Usa el botón + de abajo para agregar una
                                  </p>
                                </div>
                              </div>
                              <div className="flex-1 p-4 bg-gray-50"></div>
                            </div>
                          ) : (
                            <DndContext
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext
                                items={activities.map(
                                  (activity) => activity.id
                                )}
                                strategy={verticalListSortingStrategy}
                              >
                                <GanttActivityVirtualList
                                  activities={activities}
                                  expandedDescriptions={expandedDescriptions}
                                  scrollContainerRef={scrollContainerRef}
                                  renderActivityRow={(activity) => (
                                    <SortableActivity
                                      activity={activity}
                                      expandedDescriptions={
                                        expandedDescriptions
                                      }
                                      toggleDescription={toggleDescription}
                                      handleActivityBarClick={
                                        handleActivityBarClick
                                      }
                                      handleActivityInteraction={
                                        handleActivityInteraction
                                      }
                                      handleDeleteActivity={
                                        handleDeleteActivity
                                      }
                                      handleToggleTaskCompletion={
                                        handleToggleTaskCompletion
                                      }
                                      getActivityDateRange={
                                        getActivityDateRange
                                      }
                                      getActivityProgress={
                                        getActivityProgress
                                      }
                                      getDatePosition={getDatePosition}
                                      getBarWidth={getBarWidth}
                                      formatDateForTooltip={
                                        formatDateForTooltip
                                      }
                                      scrollbarWidth={scrollbarWidth}
                                    />
                                  )}
                                />
                              </SortableContext>
                            </DndContext>
                          )}

                          {/* Fila para crear nueva actividad */}
                          <div
                            className="flex bg-gray-50 hover:bg-emerald-50/80 transition-colors cursor-pointer border-t border-dashed border-gray-200"
                            onClick={handleAddActivityClick}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleAddActivityClick();
                              }
                            }}
                          >
                            <div
                              className="w-[500px] border-r border-gray-200 bg-gray-50 text-center py-1.5"
                              data-column="activities"
                            >
                              <button
                                type="button"
                                id="tour-gantt-agregar"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddActivityClick();
                                }}
                                className="p-1.5 bg-gray-700 rounded-full hover:bg-emerald-500 transition-colors cursor-pointer inline-flex items-center justify-center shadow-md"
                                title="Agregar actividad"
                                aria-label="Agregar actividad"
                              >
                                <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
                              </button>
                            </div>
                            <div className="flex-1 bg-gray-50" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pie: carga masiva a la izquierda + controles del timeline (Gantt) */}
          {(footerLeft || viewMode === 'gantt') && (
            <div id="tour-gantt-footer" className="mt-4 shrink-0">
              <div className="flex items-center w-full">
                <div className="w-[500px] min-w-[200px] shrink-0 flex items-center pl-1">
                  {footerLeft}
                </div>

                {viewMode === 'gantt' && (
                  <>
                    <div className="flex items-center pr-2">
                      <span className="text-sm font-medium text-gray-700">
                        Navegación:
                      </span>
                    </div>

                    {/* Slider de navegación temporal */}
                    <div className="flex items-center space-x-4 flex-1 min-w-[400px] max-w-[600px]">
                      <Slider
                        value={[timelineOffset]}
                        onValueChange={(value) => setTimelineOffset(value[0])}
                        min={TIMELINE_MIN_OFFSET}
                        max={TIMELINE_MAX_OFFSET}
                        step={1}
                        className="flex-1"
                      />
                      <Button
                        onClick={() =>
                          setTimelineOffset(
                            getTodayCenteredOffset(visibleMonthsRange)
                          )
                        }
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
                          variant={
                            visibleMonthsRange === 6 ? 'default' : 'outline'
                          }
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
                  </>
                )}
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
                      maxLength={70}
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1 text-right">
                      {taskForm.name.length}/70 caracteres
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

        {/* Popup unificado de actividad - rediseñado con 3 columnas como IndicadorModal */}
        <Dialog
          open={showActivityPopup}
          onOpenChange={(open) => {
            if (!open) {
              setShowActivityPopup(false);
              setSelectedActivityForPopup(null);
              setUnifiedActivityForm({ name: '', description: '' });
              setTempTasks([]);
              setActivityPopupMode('view');
              setEditingActivityField(null);
              setActivityFieldDraft({ name: '', description: '' });
              setEditingTaskId(null);
              setShowInlineAddTask(false);
              setInlineTaskForm({
                name: '',
                description: '',
                startDate: '',
                endDate: '',
              });
              setEvidenciasActividad([]);
            }
          }}
        >
          <DialogContent
            closeButtonPosition="outside-top-right"
            className="w-[85vw] max-w-[85vw] h-[85vh] gap-0 overflow-hidden flex flex-col border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - nombre + Progreso (o botones en create) */}
            <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/90 px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {activityPopupMode === 'create' ? (
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <DialogTitle className="sr-only">
                        Crear actividad
                      </DialogTitle>
                      <Input
                        value={unifiedActivityForm.name}
                        onChange={(e) =>
                          handleUnifiedActivityInputChange(
                            'name',
                            e.target.value
                          )
                        }
                        placeholder="Nombre de la actividad (obligatorio)"
                        className="h-auto border-gray-200 bg-white py-1.5 text-2xl font-semibold text-gray-900 shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 w-full min-w-0 max-w-full"
                        maxLength={70}
                      />
                      <span className="text-[12px] text-gray-400">
                        {unifiedActivityForm.name.length}/70 caracteres
                        <span className="text-amber-600 ml-1">
                          · obligatorio
                        </span>
                      </span>
                    </div>
                  ) : editingActivityField === 'name' ? (
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <DialogTitle className="sr-only">
                        Editar nombre
                      </DialogTitle>
                      <Input
                        value={activityFieldDraft.name}
                        onChange={(e) =>
                          setActivityFieldDraft((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Nombre de la actividad"
                        className="h-auto border-gray-200 bg-white py-1.5 text-2xl font-semibold text-gray-900 shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 w-full min-w-0 max-w-full"
                        maxLength={70}
                        autoFocus
                      />
                      <span className="text-[12px] text-gray-400">
                        {activityFieldDraft.name.length}/70 caracteres
                      </span>
                      <ActivityFieldSaveCancel
                        isSaving={isSavingActivityField}
                        onSave={handleSaveActivityField}
                        onCancel={handleCancelActivityFieldEdit}
                      />
                    </div>
                  ) : (
                    <div className="group/field relative min-w-0 max-w-full pr-8">
                      <DialogTitle className="m-0 text-2xl font-semibold text-gray-900 truncate">
                        {selectedActivityForPopup?.name || 'Sin nombre'}
                      </DialogTitle>
                      {selectedActivityForPopup && (
                        <ActivityHoverEditButton
                          onClick={() => handleStartActivityFieldEdit('name')}
                          tooltip="Editar nombre"
                        />
                      )}
                    </div>
                  )}
                </div>
                {activityPopupMode === 'view' &&
                  selectedActivityForPopup &&
                  editingActivityField !== 'name' && (
                  <div className="flex items-center space-x-4 flex-shrink-0 pr-2">
                    <span className="text-base font-medium text-gray-700">
                      Progreso
                    </span>
                    <div className="w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${getActivityProgress(selectedActivityForPopup)}%`,
                        }}
                      />
                    </div>
                    <span className="text-2xl font-bold text-gray-800 min-w-[4rem] tabular-nums">
                      {getActivityProgress(selectedActivityForPopup)}%
                    </span>
                  </div>
                )}
                {activityPopupMode === 'create' && (
                  <div className="flex h-7 shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={handleUnifiedActivityAction}
                      disabled={
                        isSubmittingActivityAction || tempTasks.length === 0
                      }
                      className="inline-flex h-7 items-center gap-1.5 text-[13px] font-normal leading-none text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                    >
                      <Save className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      {isSubmittingActivityAction ? 'Creando...' : 'Crear'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowActivityPopup(false);
                        setSelectedActivityForPopup(null);
                        setUnifiedActivityForm({ name: '', description: '' });
                        setTempTasks([]);
                        setActivityPopupMode('view');
                        setEditingTaskId(null);
                        setShowInlineAddTask(false);
                      }}
                      className="inline-flex h-7 items-center gap-1.5 text-[13px] font-normal leading-none text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                    >
                      <X className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Layout de 3 columnas */}
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-6 px-5 py-4 flex-1 min-h-0 overflow-hidden">
              {/* COLUMNA IZQUIERDA: Descripción + Período */}
              <div className="space-y-14 overflow-y-auto min-h-0 border-r border-gray-100 pr-6 custom-scrollbar">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    Descripción
                  </h3>
                  {activityPopupMode === 'create' ? (
                    <textarea
                      value={unifiedActivityForm.description}
                      onChange={(e) =>
                        handleUnifiedActivityInputChange(
                          'description',
                          e.target.value
                        )
                      }
                      placeholder="Descripción (opcional)"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 min-h-[100px] resize-y text-[13px] text-gray-800"
                      rows={4}
                    />
                  ) : editingActivityField === 'description' ? (
                    <div className="min-w-0">
                      <textarea
                        value={activityFieldDraft.description}
                        onChange={(e) =>
                          setActivityFieldDraft((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Descripción (opcional)"
                        className="w-full px-0 py-1 border-0 border-b border-gray-200 rounded-none bg-transparent shadow-none focus:outline-none focus:ring-0 focus:border-emerald-500 min-h-[100px] resize-y text-[15px] leading-[1.75] text-gray-800"
                        rows={4}
                        autoFocus
                      />
                      <ActivityFieldSaveCancel
                        isSaving={isSavingActivityField}
                        onSave={handleSaveActivityField}
                        onCancel={handleCancelActivityFieldEdit}
                      />
                    </div>
                  ) : (
                    <div className="group/field relative min-w-0 pr-8">
                      <p className="text-[15px] text-gray-800 leading-[1.75] break-words [overflow-wrap:anywhere]">
                        {selectedActivityForPopup?.description ||
                          'Sin descripción'}
                      </p>
                      {selectedActivityForPopup && (
                        <ActivityHoverEditButton
                          onClick={() =>
                            handleStartActivityFieldEdit('description')
                          }
                          tooltip="Editar descripción"
                        />
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    Período
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-4">
                    {(() => {
                      const activityRange = selectedActivityForPopup
                        ? getActivityDateRange(selectedActivityForPopup)
                        : null;
                      if (activityRange) {
                        return (
                          <PeriodTimeline
                            startDate={activityRange.startDate}
                            endDate={activityRange.endDate}
                          />
                        );
                      }
                      return (
                        <p className="text-[13px] text-gray-400 text-center py-4">
                          {activityPopupMode === 'create'
                            ? 'El período se calculará según las tareas'
                            : 'Sin tareas definidas'}
                        </p>
                      );
                    })()}
                  </div>
                </div>

                {/* Evidencias */}
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    Evidencias
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    {isLoadingEvidencias ? (
                      <p className="text-[13px] text-gray-400">
                        Cargando evidencias...
                      </p>
                    ) : evidenciasActividad.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-4">
                        <p className="text-[13px] text-gray-400">
                          No se han cargado evidencias
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {evidenciasActividad.map((ev) => (
                          <div
                            key={ev.id}
                            className="relative group rounded-lg border border-gray-200 bg-white overflow-hidden shadow-none"
                          >
                            {ev.tipo === 'image' ? (
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-video"
                              >
                                <img
                                  src={ev.url}
                                  alt={ev.nombreArchivo ?? 'Evidencia'}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ) : (
                              <div className="flex flex-col items-center justify-center aspect-video p-4 text-gray-600">
                                <a
                                  href={ev.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex flex-col items-center hover:bg-gray-50 rounded transition-colors flex-1 w-full justify-center"
                                  title="Abrir PDF en nueva pestaña"
                                >
                                  <FileText className="h-8 w-8 mb-1 text-gray-500" />
                                  <span className="text-[12px] font-medium text-center truncate w-full text-gray-700">
                                    {ev.nombreArchivo ?? 'Documento PDF'}
                                  </span>
                                </a>
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const filename =
                                      ev.nombreArchivo || 'documento.pdf';
                                    const apiUrl = `/api/evidencia-download?url=${encodeURIComponent(ev.url)}&filename=${encodeURIComponent(filename)}`;
                                    try {
                                      const res = await fetch(apiUrl);
                                      if (!res.ok) {
                                        const text = await res.text();
                                        alert(
                                          text || 'No se pudo descargar el PDF.'
                                        );
                                        return;
                                      }
                                      const blob = await res.blob();
                                      const url = URL.createObjectURL(blob);
                                      const a = document.createElement('a');
                                      a.href = url;
                                      a.download = filename
                                        .toLowerCase()
                                        .endsWith('.pdf')
                                        ? filename
                                        : `${filename}.pdf`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                    } catch {
                                      alert(
                                        'Error de conexión al descargar el PDF.'
                                      );
                                    }
                                  }}
                                  className="mt-2 text-[12px] text-gray-500 hover:text-emerald-700 underline hover:no-underline transition-colors"
                                >
                                  Descargar
                                </button>
                              </div>
                            )}
                            {selectedActivityForPopup?.id &&
                              !selectedActivityForPopup.id.startsWith(
                                'temp-'
                              ) &&
                              activityPopupMode !== 'create' && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!confirm('¿Eliminar esta evidencia?'))
                                      return;
                                    const res = await deleteEvidenciaActividad(
                                      ev.id
                                    );
                                    if (res.success) {
                                      setEvidenciasActividad((prev) =>
                                        prev.filter((e) => e.id !== ev.id)
                                      );
                                    } else {
                                      alert(res.error ?? 'Error al eliminar');
                                    }
                                  }}
                                  className="absolute top-1 right-1 p-1 rounded-sm bg-white/90 border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600"
                                  title="Eliminar evidencia"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedActivityForPopup?.id &&
                      !selectedActivityForPopup.id.startsWith('temp-') && (
                        <div className="mt-3">
                          <input
                            ref={evidenciasFileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const actividadId = selectedActivityForPopup?.id;
                              if (
                                !actividadId ||
                                actividadId.startsWith('temp-')
                              )
                                return;
                              setIsUploadingEvidencia(true);
                              const result = await uploadEvidenciaFile(file);
                              if ('error' in result) {
                                alert(result.error);
                                setIsUploadingEvidencia(false);
                                e.target.value = '';
                                return;
                              }
                              const createResult =
                                await createEvidenciaActividad(actividadId, {
                                  url: result.url,
                                  publicId: result.publicId,
                                  tipo: result.tipo,
                                  nombreArchivo: result.nombreArchivo,
                                });
                              if (createResult.success && createResult.data) {
                                setEvidenciasActividad((prev) => [
                                  ...prev,
                                  createResult.data! as EvidenciaActividadData,
                                ]);
                              } else {
                                alert(
                                  createResult.error ??
                                    'Error al guardar evidencia'
                                );
                              }
                              setIsUploadingEvidencia(false);
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            disabled={isUploadingEvidencia}
                            onClick={() =>
                              evidenciasFileInputRef.current?.click()
                            }
                            className="inline-flex w-full items-center justify-center gap-1.5 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm border border-dashed border-gray-200 bg-gray-50/40 py-2.5"
                          >
                            {isUploadingEvidencia ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <Paperclip className="h-3.5 w-3.5" strokeWidth={2} />
                                Agregar evidencia (JPG o PDF)
                              </>
                            )}
                          </button>
                          <p className="text-[12px] text-gray-400 mt-1.5">
                            Imágenes máx. 250 KB (se comprimen automáticamente).
                            PDF máx. 2 MB.
                          </p>
                        </div>
                      )}
                  </div>
                </div>
              </div>

              {/* COLUMNA CENTRAL: Tareas */}
              <div className="group/tasks flex flex-col min-h-0 overflow-hidden">
                <div className="flex items-center justify-between mb-3 flex-shrink-0">
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                    Tareas{' '}
                    <span className="normal-case tracking-normal text-gray-400">
                      {activityPopupMode === 'create'
                        ? `(${tempTasks.length})`
                        : `(${selectedActivityForPopup?.tasks?.length ?? 0})`}
                    </span>
                    {activityPopupMode === 'create' && (
                      <span className="normal-case tracking-normal text-amber-600 text-[12px] ml-1 font-normal">
                        (obligatorio al menos una)
                      </span>
                    )}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowInlineAddTask(true);
                      setEditingActivityField(null);
                      setEditingTaskId(null);
                    }}
                    className={`inline-flex items-center gap-1 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm ${
                      activityPopupMode === 'create'
                        ? ''
                        : 'opacity-0 group-hover/tasks:opacity-100 focus-visible:opacity-100'
                    }`}
                    title="Agregar tarea"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                    Agregar
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {/* Formulario inline para agregar tarea */}
                  {showInlineAddTask && (
                    <div className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[13px] font-medium tracking-wide text-gray-800">
                          Nueva tarea
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowInlineAddTask(false);
                            setInlineTaskForm({
                              name: '',
                              description: '',
                              startDate: '',
                              endDate: '',
                            });
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-gray-400 hover:text-gray-900 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </div>
                      <Input
                        value={inlineTaskForm.name}
                        onChange={(e) =>
                          setInlineTaskForm((p) => ({
                            ...p,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Nombre de la tarea *"
                        maxLength={70}
                        className="h-9 border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                      />
                      <textarea
                        value={inlineTaskForm.description}
                        onChange={(e) =>
                          setInlineTaskForm((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="Descripción (opcional)"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-[13px] shadow-none resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1"
                        rows={2}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-1.5">
                            Inicio
                          </Label>
                          <Calendar
                            compact
                            value={inlineTaskForm.startDate || undefined}
                            onChange={(d) =>
                              setInlineTaskForm((p) => ({
                                ...p,
                                startDate: d || '',
                              }))
                            }
                            placeholder="Fecha inicio"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-1.5">
                            Término
                          </Label>
                          <Calendar
                            compact
                            value={inlineTaskForm.endDate || undefined}
                            onChange={(d) =>
                              setInlineTaskForm((p) => ({
                                ...p,
                                endDate: d || '',
                              }))
                            }
                            placeholder="Fecha término"
                            className="w-full"
                            minDate={inlineTaskForm.startDate || undefined}
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleInlineAddTask}
                        disabled={isCreatingTask}
                        className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                        {isCreatingTask ? 'Creando...' : 'Crear tarea'}
                      </button>
                    </div>
                  )}

                  {(() => {
                    let tasksToShow: Task[] = [];
                    if (activityPopupMode === 'create') {
                      tasksToShow = tempTasks;
                    } else {
                      tasksToShow = selectedActivityForPopup?.tasks || [];
                    }
                    tasksToShow = [...tasksToShow].sort(
                      (a, b) =>
                        new Date(a.startDate).getTime() -
                        new Date(b.startDate).getTime()
                    );

                    if (tasksToShow.length === 0 && !showInlineAddTask) {
                      return (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-8">
                          <p className="text-[13px] text-gray-400 text-center">
                            {activityPopupMode === 'create'
                              ? 'Debes agregar al menos una tarea para crear la actividad. Haz clic en Agregar.'
                              : 'No hay tareas definidas'}
                          </p>
                        </div>
                      );
                    }

                    return tasksToShow.map((task) =>
                      editingTaskId === task.id ? (
                        <div
                          key={task.id}
                          className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/50 space-y-3"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-[13px] font-medium tracking-wide text-gray-800">
                              Editar tarea
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-gray-400 hover:text-gray-900 transition-colors"
                              title="Cerrar edición"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={2} />
                            </button>
                          </div>
                          <Input
                            value={editingTaskForm.name}
                            onChange={(e) =>
                              setEditingTaskForm((p) => ({
                                ...p,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Nombre"
                            maxLength={70}
                            className="h-9 border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                          />
                          <textarea
                            value={editingTaskForm.description}
                            onChange={(e) =>
                              setEditingTaskForm((p) => ({
                                ...p,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Descripción"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-[13px] shadow-none resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1"
                            rows={2}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-1.5">
                                Inicio
                              </Label>
                              <Calendar
                                compact
                                value={editingTaskForm.startDate || undefined}
                                onChange={(d) =>
                                  setEditingTaskForm((p) => ({
                                    ...p,
                                    startDate: d || '',
                                  }))
                                }
                                placeholder="Fecha inicio"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <Label className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-1.5">
                                Término
                              </Label>
                              <Calendar
                                compact
                                value={editingTaskForm.endDate || undefined}
                                onChange={(d) =>
                                  setEditingTaskForm((p) => ({
                                    ...p,
                                    endDate: d || '',
                                  }))
                                }
                                placeholder="Fecha término"
                                className="w-full"
                                minDate={editingTaskForm.startDate || undefined}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <button
                              type="button"
                              onClick={handleSaveTaskEdit}
                              className="inline-flex items-center gap-1.5 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                            >
                              <Save className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                              Guardar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="inline-flex items-center gap-1.5 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                            >
                              <X className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={task.id}
                          className="group/field relative p-3.5 rounded-lg border border-gray-200 bg-white"
                        >
                          <div className="flex items-start gap-3">
                            <label
                              className="relative inline-flex items-center flex-shrink-0 cursor-pointer"
                              onPointerDown={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={async () => {
                                  if (task.id.startsWith('temp-')) {
                                    setTempTasks((prev) =>
                                      prev.map((t) =>
                                        t.id === task.id
                                          ? { ...t, completed: !t.completed }
                                          : t
                                      )
                                    );
                                  } else {
                                    await handleToggleTaskCompletion(task.id);
                                    if (selectedActivityForPopup) {
                                      setSelectedActivityForPopup({
                                        ...selectedActivityForPopup,
                                        tasks:
                                          selectedActivityForPopup.tasks?.map(
                                            (t) =>
                                              t.id === task.id
                                                ? {
                                                    ...t,
                                                    completed: !t.completed,
                                                  }
                                                : t
                                          ) || [],
                                      });
                                    }
                                  }
                                }}
                                className="sr-only"
                              />
                              <div
                                className={`w-4 h-4 border rounded-sm flex items-center justify-center transition-all ${
                                  task.completed
                                    ? 'bg-emerald-600 border-emerald-600'
                                    : 'bg-white border-gray-300 hover:border-emerald-500'
                                }`}
                              >
                                {task.completed && (
                                  <svg
                                    className="w-2.5 h-2.5 text-white"
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
                            <div className="flex-1 min-w-0">
                              <span
                                className={`text-[13px] font-medium block ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}
                              >
                                {task.name}
                              </span>
                              {task.description && (
                                <p className="text-[12px] text-gray-500 mt-1 leading-snug">
                                  {task.description}
                                </p>
                              )}
                              <span className="text-[11px] text-gray-400 mt-2 block">
                                {formatDateForTooltip(task.startDate)} -{' '}
                                {formatDateForTooltip(task.endDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover/field:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTaskId(task.id);
                                    setEditingActivityField(null);
                                    setShowInlineAddTask(false);
                                    setEditingTaskForm({
                                      name: task.name,
                                      description: task.description || '',
                                      startDate: task.startDate,
                                      endDate: task.endDate,
                                    });
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-gray-400 hover:text-emerald-700 transition-colors"
                                  title="Editar tarea"
                                >
                                  <Edit className="h-3.5 w-3.5" strokeWidth={2} />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (task.id.startsWith('temp-')) {
                                      setTempTasks((prev) =>
                                        prev.filter((t) => t.id !== task.id)
                                      );
                                    } else if (
                                      window.confirm('¿Eliminar esta tarea?')
                                    ) {
                                      await handleDeleteTask(task.id);
                                      if (selectedActivityForPopup) {
                                        setSelectedActivityForPopup({
                                          ...selectedActivityForPopup,
                                          tasks:
                                            selectedActivityForPopup.tasks?.filter(
                                              (t) => t.id !== task.id
                                            ) || [],
                                        });
                                      }
                                    }
                                  }}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-sm text-gray-400 hover:text-red-600 transition-colors"
                                  title="Eliminar tarea"
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                                </button>
                              </div>
                          </div>
                        </div>
                      )
                    );
                  })()}
                </div>
              </div>

              {/* COLUMNA DERECHA: Comentarios */}
              <div className="flex flex-col min-h-0 border-l border-gray-100 pl-6">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4 flex-shrink-0">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} />
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                    Comentarios
                  </h3>
                </div>

                {selectedActivityForPopup?.id &&
                !selectedActivityForPopup.id.startsWith('temp-') ? (
                  <>
                    <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0 custom-scrollbar">
                      {isLoadingComentariosActividad ? (
                        <p className="text-[13px] text-gray-400">Cargando comentarios...</p>
                      ) : comentariosActividad.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-4">
                          <p className="text-[13px] text-gray-400">No hay comentarios aún</p>
                        </div>
                      ) : (
                        comentariosActividad.map((c) => (
                          <div
                            key={c.id}
                            className="flex gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                          >
                            <div className="flex-shrink-0">
                              <img
                                src={DEFAULT_AVATAR}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="text-[13px] font-medium text-gray-800">
                                  {c.user.name || 'Usuario'}
                                </span>
                                {c.rolEnProyecto && (
                                  <span className="text-[11px] font-medium text-gray-500">
                                    · {c.rolEnProyecto}
                                  </span>
                                )}
                                <span className="text-[11px] text-gray-400">
                                  {new Date(c.createdAt).toLocaleDateString(
                                    'es-ES',
                                    {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    }
                                  )}
                                </span>
                              </div>
                              <p className="text-[13px] text-gray-700 leading-snug whitespace-pre-wrap">
                                {c.contenido}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {session?.user && (
                      <div className="flex gap-3 pt-3 pb-1 border-t border-gray-100 flex-shrink-0">
                        <div className="flex-shrink-0">
                          <img
                            src={DEFAULT_AVATAR}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-[12px] text-gray-400">
                            Comentas como{' '}
                            {session.user.name || session.user.email}
                            {(session.user.availableRoles ?? []).length > 0
                              ? ` · ${(session.user.availableRoles ?? []).join(', ')}`
                              : ''}
                          </p>
                          <div className="flex gap-2">
                            <textarea
                              value={nuevoComentarioActividad}
                              onChange={(e) =>
                                setNuevoComentarioActividad(e.target.value)
                              }
                              placeholder="Escribe un comentario..."
                              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 resize-none text-[13px] text-gray-800"
                              rows={3}
                            />
                            <button
                              type="button"
                              onClick={handleEnviarComentarioActividad}
                              disabled={
                                !nuevoComentarioActividad.trim() ||
                                isEnviandoComentarioActividad
                              }
                              className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-gray-500 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                            >
                              <Send className="h-4 w-4" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-[13px] text-gray-400">
                    Los comentarios estarán disponibles después de crear la
                    actividad.
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
      </div>
    </TooltipProvider>
  );
}
