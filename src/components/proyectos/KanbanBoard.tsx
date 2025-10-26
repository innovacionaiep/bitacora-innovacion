'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Circle,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Activity } from '@/hooks/useGantt';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  DragOverEvent,
  rectIntersection,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ActivityStatus } from '@prisma/client';

// Tipos para las columnas del Kanban
type KanbanStatus = ActivityStatus;

interface KanbanColumn {
  id: KanbanStatus;
  title: string;
  color: string;
  bgColor: string;
}

interface KanbanBoardProps {
  activities: Activity[];
  onStatusChange: (activityId: string, status: KanbanStatus) => Promise<void>;
  onToggleTaskCompletion: (taskId: string) => Promise<void>;
  onReorderActivities?: (activityId: string, targetActivityId: string, status: KanbanStatus) => Promise<void>;
  onOptimisticReorder?: (activityId: string, targetActivityId: string, status: KanbanStatus) => void;
}

// Definición de columnas
const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'TODO',
    title: 'Por hacer',
    color: 'text-gray-800',
    bgColor: 'bg-gray-100',
  },
  {
    id: 'WAITING',
    title: 'En espera',
    color: 'text-amber-800',
    bgColor: 'bg-amber-100',
  },
  {
    id: 'IN_PROGRESS',
    title: 'En proceso',
    color: 'text-blue-800',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'DONE',
    title: 'Hecho',
    color: 'text-emerald-800',
    bgColor: 'bg-emerald-100',
  },
];

// Función para obtener el color de fondo del contenido de la columna
const getColumnContentBgColor = (columnId: KanbanStatus): string => {
  switch (columnId) {
    case 'TODO':
      return 'bg-gray-50';
    case 'WAITING':
      return 'bg-amber-50';
    case 'IN_PROGRESS':
      return 'bg-blue-50';
    case 'DONE':
      return 'bg-emerald-50';
    default:
      return 'bg-gray-50';
  }
};

// Componente de tarjeta de actividad arrastrable
interface ActivityCardProps {
  activity: Activity;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggleTaskCompletion: (taskId: string) => Promise<void>;
}

function DraggableActivityCard({
  activity,
  isExpanded,
  onToggleExpand,
  onToggleTaskCompletion,
}: ActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: activity.id,
    data: {
      type: 'activity',
      activity: activity,
    },
  });

  // También hacer esta actividad droppable para interceptar drops
  const {
    setNodeRef: setDroppableRef,
    isOver: isOverActivity,
  } = useDroppable({
    id: `activity-${activity.id}`,
    data: {
      type: 'activity',
      activity: activity,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determinar si esta actividad está siendo arrastrada sobre
  const isBeingDraggedOver = isOverActivity && !isDragging;

  // Calcular progreso de la actividad
  const getActivityProgress = () => {
    if (!activity.tasks || activity.tasks.length === 0) return 0;
    const completedTasks = activity.tasks.filter((task) => task.completed).length;
    return Math.round((completedTasks / activity.tasks.length) * 100);
  };

  const progress = getActivityProgress();

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  return (
    <div 
      ref={(node) => {
        setNodeRef(node);
        setDroppableRef(node);
      }} 
      style={style} 
      {...attributes} 
      {...listeners}
    >
      <Card className={`mb-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing ${
        isBeingDraggedOver ? 'ring-2 ring-blue-400 bg-blue-50 border-blue-300' : ''
      }`}>
        <CardContent className="p-4">
          {/* Header de la tarjeta */}
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-semibold text-sm text-gray-900 flex-1 pr-2 leading-tight">
              {activity.name}
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Barra de progreso */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Progreso</span>
              <span className="text-xs font-medium text-gray-700">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Contador de tareas */}
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <CheckCircle className="h-3.5 w-3.5" />
            <span>
              {activity.tasks.filter((t) => t.completed).length} /{' '}
              {activity.tasks.length} tareas completadas
            </span>
          </div>

          {/* Lista de tareas expandible */}
          {isExpanded && activity.tasks && activity.tasks.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
              {activity.tasks
                .sort(
                  (a, b) =>
                    new Date(a.startDate).getTime() -
                    new Date(b.startDate).getTime()
                )
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start space-x-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {/* Checkbox */}
                    <label
                      className="relative inline-flex items-center cursor-pointer mt-0.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={() => onToggleTaskCompletion(task.id)}
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

                    {/* Información de la tarea */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs ${
                          task.completed
                            ? 'line-through text-gray-400'
                            : 'text-gray-700'
                        }`}
                      >
                        {task.name}
                      </p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          variant="outline"
                          className="text-xs px-1.5 py-0 h-5"
                        >
                          {formatDate(task.startDate)} -{' '}
                          {formatDate(task.endDate)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente principal del tablero Kanban
export default function KanbanBoard({
  activities,
  onStatusChange,
  onToggleTaskCompletion,
  onReorderActivities,
  onOptimisticReorder,
}: KanbanBoardProps) {
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set()
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticActivities, setOptimisticActivities] = useState<Activity[] | null>(null);

  // Configuración de sensores para drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reducir la distancia para activación más rápida
      },
    })
  );

  // Usar actividades optimistas si están disponibles, sino usar las normales
  const currentActivities = useMemo(() => {
    return optimisticActivities || activities;
  }, [optimisticActivities, activities]);

  // Agrupar actividades por status y ordenar por kanbanOrderIndex
  const getActivitiesByStatus = (status: KanbanStatus) => {
    return currentActivities
      .filter((activity) => (activity.status || ActivityStatus.TODO) === status)
      .sort((a, b) => (a.kanbanOrderIndex || 0) - (b.kanbanOrderIndex || 0));
  };

  // Toggle expandir/colapsar actividad
  const toggleExpand = (activityId: string) => {
    setExpandedActivities((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  // Manejar inicio del drag
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Manejar drag over para mejorar la detección
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    
    // Si estamos arrastrando sobre una actividad, encontrar su columna padre
    if (over && over.data.current?.type === 'activity') {
      const activity = over.data.current.activity;
      const targetStatus = activity.status || ActivityStatus.TODO;
      
      // Forzar la detección del drop zone de la columna
      const columnElement = document.querySelector(`[data-rbd-droppable-id="${targetStatus}"]`);
      if (columnElement) {
        columnElement.classList.add('drop-zone-active');
      }
    }
  };

  // Función para calcular la posición de inserción basada en la posición del mouse
  const calculateInsertionIndex = (targetActivityId: string, currentActivityId: string, activitiesInColumn: Activity[]) => {
    const currentIndex = activitiesInColumn.findIndex(a => a.id === currentActivityId);
    const targetIndex = activitiesInColumn.findIndex(a => a.id === targetActivityId);
    
    if (currentIndex === -1 || targetIndex === -1) return currentIndex;
    
    // Si se mueve hacia abajo (currentIndex < targetIndex), insertar después del target
    if (currentIndex < targetIndex) {
      return targetIndex;
    } else {
      // Si se mueve hacia arriba (currentIndex > targetIndex), insertar antes del target
      return targetIndex;
    }
  };

  // Manejar fin del drag
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activityId = active.id as string;
      const activeActivity = activities.find(a => a.id === activityId);
      
      if (!activeActivity) return;

      // Limpiar el estado de expansión para la actividad que se está moviendo
      setExpandedActivities((prev) => {
        const newSet = new Set(prev);
        newSet.delete(activityId);
        return newSet;
      });

      // Determinar si es un reordenamiento dentro de la misma columna o cambio de columna
      let newStatus: KanbanStatus;
      let isReorder = false;

      if (over.data.current?.type === 'column') {
        // Drop en columna - cambio de status
        newStatus = over.data.current.status;
      } else if (over.data.current?.type === 'activity') {
        // Drop sobre actividad - determinar si es reordenamiento o cambio de columna
        const targetActivity = over.data.current.activity;
        const targetStatus = targetActivity.status || ActivityStatus.TODO;
        
        if (activeActivity.status === targetStatus) {
          // Misma columna - es reordenamiento
          isReorder = true;
          newStatus = activeActivity.status; // Mantener el mismo status
        } else {
          // Diferente columna - cambio de status
          newStatus = targetStatus;
        }
      } else if (over.id.toString().startsWith('activity-')) {
        // ID con prefijo activity-
        const realActivityId = over.id.toString().replace('activity-', '');
        const targetActivity = activities.find(a => a.id === realActivityId);
        const targetStatus = targetActivity?.status || ActivityStatus.TODO;
        
        if (activeActivity.status === targetStatus) {
          // Misma columna - es reordenamiento
          isReorder = true;
          newStatus = activeActivity.status;
        } else {
          // Diferente columna - cambio de status
          newStatus = targetStatus;
        }
      } else {
        // Fallback - asumir cambio de status
        newStatus = over.id as KanbanStatus;
      }

      if (isReorder && onReorderActivities) {
        // Reordenamiento dentro de la misma columna
        // Actualización optimista primero
        const activitiesInColumn = currentActivities
          .filter(a => a.status === activeActivity.status)
          .sort((a, b) => (a.kanbanOrderIndex || 0) - (b.kanbanOrderIndex || 0));
        
        const currentIndex = activitiesInColumn.findIndex(a => a.id === activityId);
        const targetIndex = activitiesInColumn.findIndex(a => a.id === over.id);
        
        if (currentIndex !== -1 && targetIndex !== -1 && currentIndex !== targetIndex) {
          // Crear una copia de solo las actividades de esta columna
          const reorderedColumnActivities = [...activitiesInColumn];
          const [movedActivity] = reorderedColumnActivities.splice(currentIndex, 1);
          reorderedColumnActivities.splice(targetIndex, 0, movedActivity);
          
          // Calcular el kanbanOrderIndex para las actividades de esta columna
          const updates = reorderedColumnActivities.map((activity, index) => ({
            id: activity.id,
            kanbanOrderIndex: index,
          }));
          
          // Actualización optimista: actualizar el estado local inmediatamente
          const updatedActivities = currentActivities.map(activity => {
            const update = updates.find(u => u.id === activity.id);
            if (update) {
              return { ...activity, kanbanOrderIndex: update.kanbanOrderIndex };
            }
            return activity;
          });
          
          // Aplicar la actualización optimista
          setOptimisticActivities(updatedActivities);
        }
        
        // Luego la actualización del servidor
        try {
          await onReorderActivities(activityId, over.id as string, activeActivity.status);
          // Limpiar el estado optimista inmediatamente después de confirmar
          // El estado del padre ya está actualizado correctamente
          setOptimisticActivities(null);
        } catch (error) {
          // En caso de error, limpiar el estado optimista para mostrar el estado real
          setOptimisticActivities(null);
          console.error('Error reordering activities:', error);
        }
      } else {
        // Cambio de status
        await onStatusChange(activityId, newStatus);
      }
    }

    setActiveId(null);
  };

  // Obtener actividad activa para el overlay
  const activeActivity = currentActivities.find((a) => a.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 h-full overflow-x-auto pb-4 w-full">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            activities={getActivitiesByStatus(column.id)}
            expandedActivities={expandedActivities}
            onToggleExpand={toggleExpand}
            onToggleTaskCompletion={onToggleTaskCompletion}
          />
        ))}
      </div>

      {/* Overlay para mostrar la tarjeta mientras se arrastra */}
      <DragOverlay>
        {activeActivity ? (
          <Card className="shadow-lg opacity-90 w-80">
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm text-gray-900">
                {activeActivity.name}
              </h4>
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Componente de columna individual
interface KanbanColumnProps {
  column: KanbanColumn;
  activities: Activity[];
  expandedActivities: Set<string>;
  onToggleExpand: (activityId: string) => void;
  onToggleTaskCompletion: (taskId: string) => Promise<void>;
}

function KanbanColumn({
  column,
  activities,
  expandedActivities,
  onToggleExpand,
  onToggleTaskCompletion,
}: KanbanColumnProps) {
  const {
    setNodeRef,
    isOver,
  } = useDroppable({ 
    id: column.id,
    data: {
      type: 'column',
      status: column.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[250px] ${
        isOver 
          ? 'bg-blue-50 border-2 border-blue-400 shadow-lg' 
          : 'border-2 border-transparent'
      } rounded-lg transition-all duration-200`}
    >
      {/* Header de la columna */}
      <div className={`${column.bgColor} rounded-t-lg p-4 border-b-2 border-gray-200 transition-all duration-200 ${
        isOver ? 'bg-blue-100 border-blue-300' : ''
      }`}>
        <div className="flex items-center justify-between">
          <h3 className={`font-semibold text-sm transition-colors duration-200 ${
            isOver ? 'text-blue-700' : column.color
          }`}>
            {column.title}
            {isOver && <span className="ml-2 text-xs">← Suelta aquí</span>}
          </h3>
          <Badge variant="secondary" className="text-xs">
            {activities.length}
          </Badge>
        </div>
      </div>

      {/* Lista de tarjetas - Toda esta área es droppable */}
      <div className={`p-4 space-y-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto transition-all duration-200 ${
        isOver ? 'bg-blue-50 border-2 border-dashed border-blue-300' : getColumnContentBgColor(column.id)
      }`}>
        {activities.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-8 transition-colors duration-200 ${
            isOver ? 'text-blue-600' : 'text-gray-400'
          }`}>
            <Circle className="h-8 w-8 mb-2" />
            <p className="text-sm">No hay actividades</p>
            <p className="text-xs mt-1">Arrastra una actividad aquí</p>
          </div>
        ) : (
          <SortableContext 
            items={activities.map(a => a.id)} 
            strategy={verticalListSortingStrategy}
          >
            {activities.map((activity) => (
              <DraggableActivityCard
                key={`${activity.id}-${activity.status || 'TODO'}`}
                activity={activity}
                isExpanded={expandedActivities.has(activity.id)}
                onToggleExpand={() => onToggleExpand(activity.id)}
                onToggleTaskCompletion={onToggleTaskCompletion}
              />
            ))}
            {/* Indicador visual de drop al final */}
            {isOver && (
              <div className="min-h-[40px] w-full border-2 border-dashed border-blue-400 bg-blue-100 rounded-lg flex items-center justify-center text-sm text-blue-600">
                <span>↓ Suelta aquí ↓</span>
              </div>
            )}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

