import { useState, useEffect, useRef } from 'react';
import {
  getActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskCompletion as toggleTaskCompletionAction,
  reorderActivities,
  calculateProjectProgress,
  updateActivityStatus as updateActivityStatusAction,
  type ActivityData,
  type TaskData,
  type ActivityWithTasks,
} from '@/lib/actions/gantt';
import { ActivityStatus } from '@prisma/client';

export type Task = {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  startDate: string;
  endDate: string;
  progress: number;
  activityId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Activity = ActivityWithTasks;

export function useGantt(projectId: string | null) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingTasks, setTogglingTasks] = useState<Set<string>>(new Set());
  const loadingRef = useRef(false);

  // Color para actividades
  const ACTIVITY_COLORS = ['bg-gray-700'];

  // Helper function para calcular progreso localmente
  const updateActivityProgressLocally = (
    activityId: string,
    activities: Activity[]
  ) => {
    return activities.map((activity) => {
      if (activity.id === activityId) {
        const completedTasks = activity.tasks.filter((t) => t.completed).length;
        const progress =
          activity.tasks.length > 0
            ? Math.round((completedTasks / activity.tasks.length) * 100)
            : 0;
        return { ...activity, progress };
      }
      return activity;
    });
  };

  // Cargar actividades del proyecto
  const loadActivities = async () => {
    if (!projectId) {
      setActivities([]);
      return;
    }

    // Prevenir múltiples cargas simultáneas
    if (loadingRef.current) return;
    loadingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const result = await getActivities(projectId);

      if (!result.success) {
        throw new Error(result.error);
      }

      setActivities(result.data || []);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError(
        err instanceof Error ? err.message : 'Error al cargar las actividades'
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Crear nueva actividad
  const createActivityHandler = async (activityData: {
    name: string;
    description: string;
  }) => {
    if (!projectId) throw new Error('No hay proyecto seleccionado');

    setLoading(true);
    setError(null);

    try {
      const color = ACTIVITY_COLORS[activities.length % ACTIVITY_COLORS.length];
      const orderIndex = activities.length;

      const result = await createActivity({
        ...activityData,
        projectId,
        color,
        progress: 0,
        orderIndex,
        kanbanOrderIndex: orderIndex,
        status: 'TODO', // Valor por defecto para el Kanban
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.data) {
        setActivities((prev) => [...prev, result.data!]);
      }

      return { data: result.data, error: null };
    } catch (err) {
      console.error('Error creating activity:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Error al crear la actividad';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Actualizar actividad
  const updateActivityHandler = async (
    activityId: string,
    updates: Partial<Activity>
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateActivity(activityId, updates);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.data) {
        setActivities((prev) =>
          prev.map((activity) =>
            activity.id === activityId ? result.data! : activity
          )
        );
      }

      return { data: result.data, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar la actividad';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Eliminar actividad
  const deleteActivityHandler = async (activityId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await deleteActivity(activityId);

      if (!result.success) {
        throw new Error(result.error);
      }

      setActivities((prev) =>
        prev.filter((activity) => activity.id !== activityId)
      );
      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al eliminar la actividad';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva tarea
  const createTaskHandler = async (
    activityId: string,
    taskData: {
      name: string;
      description: string;
      startDate: string;
      endDate: string;
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await createTask({
        name: taskData.name,
        description: taskData.description,
        startDate: taskData.startDate,
        endDate: taskData.endDate,
        activityId,
        completed: false,
        progress: 0,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Recargar actividades para obtener el progreso actualizado
      await loadActivities();

      return { data: result.data, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al crear la tarea';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Actualizar tarea
  const updateTaskHandler = async (taskId: string, updates: Partial<Task>) => {
    setLoading(true);
    setError(null);

    try {
      const result = await updateTask(taskId, updates);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Recargar actividades para obtener el progreso actualizado
      await loadActivities();

      return { data: result.data, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar la tarea';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Eliminar tarea
  const deleteTaskHandler = async (taskId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await deleteTask(taskId);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Recargar actividades para obtener el progreso actualizado
      await loadActivities();

      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al eliminar la tarea';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Toggle completar tarea (actualización optimista pura)
  const toggleTaskCompletionHandler = async (taskId: string) => {
    // Prevenir doble toggles mientras hay una operación en progreso
    if (togglingTasks.has(taskId)) {
      return;
    }

    // Marcar esta tarea como en proceso de toggle
    setTogglingTasks((prev) => new Set(prev).add(taskId));

    // Actualización optimista del estado local con cálculo de progreso
    const prevActivities = activities;
    let activityId: string | null = null;

    setActivities((prev) =>
      prev.map((activity) => {
        const updatedActivity = {
          ...activity,
          tasks: activity.tasks.map((task) => {
            if (task.id === taskId) {
              activityId = activity.id;
              return {
                ...task,
                completed: !task.completed,
                progress: !task.completed ? 100 : 0,
              };
            }
            return task;
          }),
        };

        // Calcular progreso localmente si esta actividad fue modificada
        if (activityId === activity.id) {
          const completedTasks = updatedActivity.tasks.filter(
            (t) => t.completed
          ).length;
          const progress =
            updatedActivity.tasks.length > 0
              ? Math.round(
                  (completedTasks / updatedActivity.tasks.length) * 100
                )
              : 0;
          return { ...updatedActivity, progress };
        }

        return updatedActivity;
      })
    );

    try {
      const result = await toggleTaskCompletionAction(taskId);

      if (!result.success) {
        // Rollback en caso de error
        setActivities(prevActivities);
        setError(result.error || 'Error al actualizar la tarea');
      }
      // NO recargar datos - confiar en la actualización optimista
    } catch (err) {
      // Rollback en caso de error
      setActivities(prevActivities);
      setError(
        err instanceof Error ? err.message : 'Error al actualizar la tarea'
      );
    } finally {
      // Limpiar el estado de toggle en progreso
      setTogglingTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Calcular progreso de una actividad
  const calculateActivityProgress = (activity: Activity): number => {
    if (activity.tasks.length === 0) return 0;
    const completedTasks = activity.tasks.filter(
      (task) => task.completed
    ).length;
    return Math.round((completedTasks / activity.tasks.length) * 100);
  };

  // Actualizar progreso de una actividad
  const updateActivityProgress = async (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    const newProgress = calculateActivityProgress(activity);

    if (newProgress !== activity.progress) {
      await updateActivityHandler(activityId, { progress: newProgress });
    }
  };

  // Calcular progreso general del proyecto
  const calculateProjectProgressHandler = (): number => {
    if (activities.length === 0) return 0;
    const totalProgress = activities.reduce(
      (sum, activity) => sum + activity.progress,
      0
    );
    return Math.round(totalProgress / activities.length);
  };

  // Actualizar el avance del proyecto en la base de datos
  const updateProjectProgress = async (projectId: string, progress: number) => {
    // Esta función ya no es necesaria porque las server actions actualizan automáticamente
    console.log(`Project progress: ${progress}%`);
  };

  // Sincronizar progreso de todas las actividades
  const syncAllActivitiesProgress = async () => {
    setLoading(true);
    setError(null);

    try {
      // Recargar todas las actividades
      await loadActivities();
      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al sincronizar el progreso';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Reordenar actividades
  const reorderActivitiesHandler = async (
    startIndex: number,
    endIndex: number
  ) => {
    if (startIndex === endIndex) return;

    setLoading(true);
    setError(null);

    try {
      // Actualización optimista del estado local
      const reorderedActivities = [...activities];
      const [movedActivity] = reorderedActivities.splice(startIndex, 1);
      reorderedActivities.splice(endIndex, 0, movedActivity);

      // Actualizar el estado local inmediatamente para mejor UX
      setActivities(reorderedActivities);

      // Preparar actualizaciones
      const updates = reorderedActivities.map((activity, index) => ({
        id: activity.id,
        orderIndex: index,
      }));

      const result = await reorderActivities(updates);

      if (!result.success) {
        // Recargar en caso de error
        await loadActivities();
        throw new Error(result.error);
      }

      return { success: true, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Error al reordenar las actividades';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Actualizar status de una actividad
  const updateActivityStatusHandler = async (
    activityId: string,
    status: ActivityStatus
  ) => {
    // Actualización optimista del estado local
    const prevActivities = activities;
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId ? { ...activity, status } : activity
      )
    );

    try {
      const result = await updateActivityStatusAction(activityId, status);

      if (!result.success) {
        // Rollback en caso de error
        setActivities(prevActivities);
        setError(result.error || 'Error al actualizar el status');
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (err) {
      // Rollback en caso de error
      setActivities(prevActivities);
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar el status';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  // Función para actualizar el estado local de actividades
  const updateActivitiesState = (
    updater: (activities: Activity[]) => Activity[]
  ) => {
    setActivities(updater);
  };

  // Cargar actividades cuando cambie el proyecto
  useEffect(() => {
    loadActivities();
  }, [projectId]);

  return {
    activities,
    loading,
    error,
    createActivity: createActivityHandler,
    updateActivity: updateActivityHandler,
    deleteActivity: deleteActivityHandler,
    createTask: createTaskHandler,
    updateTask: updateTaskHandler,
    deleteTask: deleteTaskHandler,
    toggleTaskCompletion: toggleTaskCompletionHandler,
    calculateProjectProgress: calculateProjectProgressHandler,
    updateProjectProgress,
    syncAllActivitiesProgress,
    loadActivities,
    reorderActivities: reorderActivitiesHandler,
    updateActivityStatus: updateActivityStatusHandler,
    updateActivitiesState, // ← Nueva función
  };
}
