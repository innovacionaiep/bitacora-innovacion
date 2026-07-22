import { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  type ActivityWithTasks,
} from '@/lib/actions/gantt';
import { ActivityStatus } from '@prisma/client';
import { proyectoActivitiesKey } from '@/lib/query-keys';

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

function computeActivityProgress(tasks: Activity['tasks']): number {
  if (tasks.length === 0) return 0;
  const completedTasks = tasks.filter((t) => t.completed).length;
  return Math.round((completedTasks / tasks.length) * 100);
}

export function useGantt(
  projectId: string | null,
  initialActivities?: Activity[] | null
) {
  const queryClient = useQueryClient();
  const [activities, setActivities] = useState<Activity[]>(
    initialActivities ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingTasks, setTogglingTasks] = useState<Set<string>>(new Set());
  const loadingRef = useRef(false);

  const ACTIVITY_COLORS = ['bg-gray-700'];

  const loadActivities = useCallback(async (force = false) => {
    if (!projectId) {
      setActivities([]);
      return;
    }

    if (loadingRef.current) return;
    loadingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      if (force) {
        await queryClient.invalidateQueries({
          queryKey: proyectoActivitiesKey(projectId),
        });
      }
      const data = await queryClient.fetchQuery({
        queryKey: proyectoActivitiesKey(projectId),
        queryFn: async () => {
          const result = await getActivities(projectId);
          if (!result.success) {
            throw new Error(result.error);
          }
          return (result.data || []) as Activity[];
        },
        staleTime: force ? 0 : 60_000,
      });
      setActivities(data);
      queryClient.setQueryData(proyectoActivitiesKey(projectId), data);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError(
        err instanceof Error ? err.message : 'Error al cargar las actividades'
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [projectId, queryClient]);

  const createActivityHandler = async (activityData: {
    name: string;
    description: string;
  }) => {
    if (!projectId) throw new Error('No hay proyecto seleccionado');

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
        status: 'TODO',
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
    }
  };

  const updateActivityHandler = async (
    activityId: string,
    updates: Partial<Activity>
  ) => {
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
    }
  };

  const deleteActivityHandler = async (activityId: string) => {
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
    }
  };

  const createTaskHandler = async (
    activityId: string,
    taskData: {
      name: string;
      description: string;
      startDate: string;
      endDate: string;
    }
  ) => {
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

      if (result.data) {
        setActivities((prev) =>
          prev.map((activity) => {
            if (activity.id !== activityId) return activity;
            const tasks = [...activity.tasks, result.data!];
            return {
              ...activity,
              tasks,
              progress: computeActivityProgress(tasks),
            };
          })
        );
      }

      return { data: result.data, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al crear la tarea';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  const updateTaskHandler = async (taskId: string, updates: Partial<Task>) => {
    setError(null);

    try {
      const result = await updateTask(taskId, updates);

      if (!result.success) {
        throw new Error(result.error);
      }

      if (result.data) {
        setActivities((prev) =>
          prev.map((activity) => {
            const taskIndex = activity.tasks.findIndex((t) => t.id === taskId);
            if (taskIndex === -1) return activity;
            const tasks = activity.tasks.map((t) =>
              t.id === taskId ? { ...t, ...result.data! } : t
            );
            return {
              ...activity,
              tasks,
              progress: computeActivityProgress(tasks),
            };
          })
        );
      }

      return { data: result.data, error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar la tarea';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }
  };

  const deleteTaskHandler = async (taskId: string) => {
    setError(null);

    try {
      const result = await deleteTask(taskId);

      if (!result.success) {
        throw new Error(result.error);
      }

      setActivities((prev) =>
        prev.map((activity) => {
          const tasks = activity.tasks.filter((t) => t.id !== taskId);
          if (tasks.length === activity.tasks.length) return activity;
          return {
            ...activity,
            tasks,
            progress: computeActivityProgress(tasks),
          };
        })
      );

      return { error: null };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Error al eliminar la tarea';
      setError(errorMessage);
      return { error: errorMessage };
    }
  };

  const toggleTaskCompletionHandler = async (taskId: string) => {
    if (togglingTasks.has(taskId)) {
      return;
    }

    setTogglingTasks((prev) => new Set(prev).add(taskId));

    const prevActivities = activities;

    setActivities((prev) =>
      prev.map((activity) => {
        const updatedActivity = {
          ...activity,
          tasks: activity.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                completed: !task.completed,
                progress: !task.completed ? 100 : 0,
              };
            }
            return task;
          }),
        };

        const hasTask = activity.tasks.some((t) => t.id === taskId);
        if (!hasTask) return activity;

        return {
          ...updatedActivity,
          progress: computeActivityProgress(updatedActivity.tasks),
        };
      })
    );

    try {
      const result = await toggleTaskCompletionAction(taskId);

      if (!result.success) {
        setActivities(prevActivities);
        setError(result.error || 'Error al actualizar la tarea');
      }
    } catch (err) {
      setActivities(prevActivities);
      setError(
        err instanceof Error ? err.message : 'Error al actualizar la tarea'
      );
    } finally {
      setTogglingTasks((prev) => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const calculateActivityProgress = (activity: Activity): number => {
    return computeActivityProgress(activity.tasks);
  };

  const updateActivityProgress = async (activityId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;

    const newProgress = calculateActivityProgress(activity);

    if (newProgress !== activity.progress) {
      await updateActivityHandler(activityId, { progress: newProgress });
    }
  };

  const calculateProjectProgressHandler = (): number => {
    if (activities.length === 0) return 0;
    const totalProgress = activities.reduce(
      (sum, activity) => sum + activity.progress,
      0
    );
    return Math.round(totalProgress / activities.length);
  };

  const updateProjectProgress = async (_projectId: string, progress: number) => {
    console.log(`Project progress: ${progress}%`);
  };

  const syncAllActivitiesProgress = async () => {
    setLoading(true);
    setError(null);

    try {
      await loadActivities(true);
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

  const reorderActivitiesHandler = async (
    startIndex: number,
    endIndex: number
  ) => {
    if (startIndex === endIndex) return;

    setError(null);

    try {
      const reorderedActivities = [...activities];
      const [movedActivity] = reorderedActivities.splice(startIndex, 1);
      reorderedActivities.splice(endIndex, 0, movedActivity);

      setActivities(reorderedActivities);

      const updates = reorderedActivities.map((activity, index) => ({
        id: activity.id,
        orderIndex: index,
      }));

      const result = await reorderActivities(updates);

      if (!result.success) {
        await loadActivities(true);
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
    }
  };

  const updateActivityStatusHandler = async (
    activityId: string,
    status: ActivityStatus
  ) => {
    const prevActivities = activities;
    setActivities((prev) =>
      prev.map((activity) =>
        activity.id === activityId ? { ...activity, status } : activity
      )
    );

    try {
      const result = await updateActivityStatusAction(activityId, status);

      if (!result.success) {
        setActivities(prevActivities);
        setError(result.error || 'Error al actualizar el status');
        return { success: false, error: result.error };
      }

      return { success: true, data: result.data };
    } catch (err) {
      setActivities(prevActivities);
      const errorMessage =
        err instanceof Error ? err.message : 'Error al actualizar el status';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const updateActivitiesState = (
    updater: (activities: Activity[]) => Activity[]
  ) => {
    setActivities((prev) => {
      const next = updater(prev);
      if (projectId) {
        queryClient.setQueryData(proyectoActivitiesKey(projectId), next);
      }
      return next;
    });
  };

  const prevProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setActivities([]);
      prevProjectIdRef.current = null;
      return;
    }

    const projectChanged = prevProjectIdRef.current !== projectId;
    prevProjectIdRef.current = projectId;

    if (initialActivities != null) {
      setActivities(initialActivities);
      queryClient.setQueryData(
        proyectoActivitiesKey(projectId),
        initialActivities
      );
      return;
    }

    // Preferir cache RQ si existe (incluye [] cargado)
    const cached = queryClient.getQueryData<Activity[]>(
      proyectoActivitiesKey(projectId)
    );
    if (cached != null) {
      setActivities(cached);
      return;
    }

    if (projectChanged) {
      void loadActivities();
    }
  }, [projectId, initialActivities, loadActivities, queryClient]);

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
    updateActivitiesState,
  };
}
