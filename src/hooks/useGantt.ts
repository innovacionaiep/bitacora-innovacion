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
  setTasksCompletion as setTasksCompletionAction,
  reorderActivities,
  calculateProjectProgress,
  updateActivityStatus as updateActivityStatusAction,
  type ActivityWithTasks,
} from '@/lib/actions/gantt';
import { ActivityStatus } from '@prisma/client';
import { proyectoActivitiesKey } from '@/lib/query-keys';
import { runOptimisticMutation } from '@/lib/ui/optimistic-mutation';


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
  const [activities, setActivities] = useState<Activity[]>(() => {
    if (initialActivities != null) return initialActivities;
    if (!projectId) return [];
    const cached = queryClient.getQueryData<Activity[]>(
      proyectoActivitiesKey(projectId)
    );
    return cached ?? [];
  });
  // true hasta que haya datos iniciales/caché o termine el fetch (evita flash de vacío)
  const [loading, setLoading] = useState(() => {
    if (!projectId) return false;
    if (initialActivities != null) return false;
    return (
      queryClient.getQueryData<Activity[]>(proyectoActivitiesKey(projectId)) ==
      null
    );
  });
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  /** Último estado completed deseado por taskId (aún no confirmado en BD). */
  const pendingCompletionRef = useRef<Map<string, boolean>>(new Map());
  /** Último estado completed confirmado en BD por taskId. */
  const savedCompletionRef = useRef<Map<string, boolean>>(new Map());
  /** Cola FIFO de taskIds a persistir (sin duplicados; el estado sale de pending). */
  const completionQueueRef = useRef<string[]>([]);
  const completionProcessingRef = useRef(false);
  const completionIdleWaitersRef = useRef<Array<() => void>>([]);
  const pumpCompletionQueueRef = useRef<() => void>(() => undefined);

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

    const result = await runOptimisticMutation({
      apply: () => {
        let snapshot: Activity[] = [];
        setActivities((prev) => {
          snapshot = prev;
          return prev.map((activity) =>
            activity.id === activityId ? { ...activity, ...updates } : activity
          );
        });
        return snapshot;
      },
      mutate: () => updateActivity(activityId, updates),
      rollback: (snapshot) => {
        if (snapshot) setActivities(snapshot);
      },
      commit: (data) => {
        setActivities((prev) =>
          prev.map((activity) =>
            activity.id === activityId ? data : activity
          )
        );
      },
    });

    if (!result.ok) {
      const errorMessage =
        result.error ?? 'Error al actualizar la actividad';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }

    return { data: result.data, error: null };
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

    const result = await runOptimisticMutation({
      apply: () => {
        let snapshot: Activity[] = [];
        setActivities((prev) => {
          snapshot = prev;
          return prev.map((activity) => {
            const taskIndex = activity.tasks.findIndex((t) => t.id === taskId);
            if (taskIndex === -1) return activity;
            const tasks = activity.tasks.map((t) =>
              t.id === taskId ? { ...t, ...updates } : t
            );
            return {
              ...activity,
              tasks,
              progress: computeActivityProgress(tasks),
            };
          });
        });
        return snapshot;
      },
      mutate: () => updateTask(taskId, updates),
      rollback: (snapshot) => {
        if (snapshot) setActivities(snapshot);
      },
      commit: (data) => {
        setActivities((prev) =>
          prev.map((activity) => {
            const taskIndex = activity.tasks.findIndex((t) => t.id === taskId);
            if (taskIndex === -1) return activity;
            const tasks = activity.tasks.map((t) =>
              t.id === taskId ? { ...t, ...data } : t
            );
            return {
              ...activity,
              tasks,
              progress: computeActivityProgress(tasks),
            };
          })
        );
      },
    });

    if (!result.ok) {
      const errorMessage = result.error ?? 'Error al actualizar la tarea';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    }

    return { data: result.data, error: null };
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

  const patchTaskCompletionLocal = useCallback(
    (taskId: string, completed: boolean) => {
      setActivities((prev) => {
        let changed = false;
        const next = prev.map((activity) => {
          const hasTask = activity.tasks.some((t) => t.id === taskId);
          if (!hasTask) return activity;
          changed = true;
          const tasks = activity.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  completed,
                  progress: completed ? 100 : 0,
                }
              : task
          );
          return {
            ...activity,
            tasks,
            progress: computeActivityProgress(tasks),
          };
        });
        if (changed && projectId) {
          queryClient.setQueryData(proyectoActivitiesKey(projectId), next);
        }
        return changed ? next : prev;
      });
    },
    [projectId, queryClient]
  );

  const notifyCompletionIdle = useCallback(() => {
    if (
      completionProcessingRef.current ||
      completionQueueRef.current.length > 0
    ) {
      return;
    }
    const waiters = completionIdleWaitersRef.current;
    completionIdleWaitersRef.current = [];
    for (const resolve of waiters) resolve();
  }, []);

  const enqueueTaskCompletionSave = useCallback((taskId: string) => {
    if (!completionQueueRef.current.includes(taskId)) {
      completionQueueRef.current.push(taskId);
    }
    pumpCompletionQueueRef.current();
  }, []);

  const pumpCompletionQueue = useCallback(async () => {
    if (completionProcessingRef.current) return;
    completionProcessingRef.current = true;

    try {
      while (completionQueueRef.current.length > 0) {
        // Vaciar cola actual en un solo batch (1 round-trip al servidor)
        const batchIds = completionQueueRef.current.splice(
          0,
          completionQueueRef.current.length
        );
        const updates: Array<{ id: string; completed: boolean }> = [];

        for (const taskId of batchIds) {
          const desired = pendingCompletionRef.current.get(taskId);
          if (desired === undefined) continue;
          if (savedCompletionRef.current.get(taskId) === desired) {
            pendingCompletionRef.current.delete(taskId);
            continue;
          }
          updates.push({ id: taskId, completed: desired });
        }

        if (updates.length === 0) continue;

        try {
          const result = await setTasksCompletionAction(updates);

          if (!result.success) {
            for (const { id } of updates) {
              const saved = savedCompletionRef.current.get(id);
              if (saved !== undefined) {
                patchTaskCompletionLocal(id, saved);
              }
              pendingCompletionRef.current.delete(id);
            }
            setError(result.error || 'Error al actualizar la tarea');
            continue;
          }

          for (const { id, completed: target } of updates) {
            savedCompletionRef.current.set(id, target);
            const latest = pendingCompletionRef.current.get(id);
            if (latest === undefined || latest === target) {
              pendingCompletionRef.current.delete(id);
            } else if (!completionQueueRef.current.includes(id)) {
              completionQueueRef.current.push(id);
            }
          }

          if (projectId) {
            queryClient.setQueryData(
              proyectoActivitiesKey(projectId),
              (prev: Activity[] | undefined) => {
                if (!prev) return prev;
                const targetById = new Map(
                  updates.map((u) => [u.id, u.completed] as const)
                );
                return prev.map((activity) => {
                  let changed = false;
                  const tasks = activity.tasks.map((task) => {
                    if (!targetById.has(task.id)) return task;
                    const latest = pendingCompletionRef.current.get(task.id);
                    const completed =
                      latest !== undefined
                        ? latest
                        : targetById.get(task.id)!;
                    if (
                      task.completed === completed &&
                      task.progress === (completed ? 100 : 0)
                    ) {
                      return task;
                    }
                    changed = true;
                    return {
                      ...task,
                      completed,
                      progress: completed ? 100 : 0,
                    };
                  });
                  if (!changed) return activity;
                  return {
                    ...activity,
                    tasks,
                    progress: computeActivityProgress(tasks),
                  };
                });
              }
            );
          }
        } catch (err) {
          for (const { id } of updates) {
            const saved = savedCompletionRef.current.get(id);
            if (saved !== undefined) {
              patchTaskCompletionLocal(id, saved);
            }
            pendingCompletionRef.current.delete(id);
          }
          setError(
            err instanceof Error ? err.message : 'Error al actualizar la tarea'
          );
        }
      }
    } finally {
      completionProcessingRef.current = false;
      if (completionQueueRef.current.length > 0) {
        void pumpCompletionQueueRef.current();
      } else {
        notifyCompletionIdle();
      }
    }
  }, [notifyCompletionIdle, patchTaskCompletionLocal, projectId, queryClient]);

  pumpCompletionQueueRef.current = () => {
    void pumpCompletionQueue();
  };

  const whenTaskCompletionSavesIdle = useCallback((): Promise<void> => {
    if (
      !completionProcessingRef.current &&
      completionQueueRef.current.length === 0
    ) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      completionIdleWaitersRef.current.push(resolve);
    });
  }, []);

  const toggleTaskCompletionHandler = useCallback(
    (taskId: string) => {
      setError(null);

      setActivities((prev) => {
        let found = false;
        let previousCompleted = false;
        let nextCompleted = false;

        const next = prev.map((activity) => {
          const taskIndex = activity.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return activity;

          found = true;
          const task = activity.tasks[taskIndex];
          previousCompleted = task.completed;
          nextCompleted = !task.completed;

          const tasks = activity.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  completed: nextCompleted,
                  progress: nextCompleted ? 100 : 0,
                }
              : t
          );

          return {
            ...activity,
            tasks,
            progress: computeActivityProgress(tasks),
          };
        });

        if (!found) return prev;

        if (!savedCompletionRef.current.has(taskId)) {
          savedCompletionRef.current.set(taskId, previousCompleted);
        }
        pendingCompletionRef.current.set(taskId, nextCompleted);

        if (projectId) {
          queryClient.setQueryData(proyectoActivitiesKey(projectId), next);
        }

        return next;
      });

      // Encolar de inmediato (sin debounce): el pump serializa en orden
      enqueueTaskCompletionSave(taskId);
    },
    [enqueueTaskCompletionSave, projectId, queryClient]
  );

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
    const result = await runOptimisticMutation({
      apply: () => {
        let snapshot: Activity[] = [];
        setActivities((prev) => {
          snapshot = prev;
          return prev.map((activity) =>
            activity.id === activityId ? { ...activity, status } : activity
          );
        });
        return snapshot;
      },
      mutate: () => updateActivityStatusAction(activityId, status),
      rollback: (snapshot) => {
        if (snapshot) setActivities(snapshot);
      },
      commit: (data) => {
        setActivities((prev) =>
          prev.map((activity) =>
            activity.id === activityId ? data : activity
          )
        );
      },
    });

    if (!result.ok) {
      setError(result.error ?? 'Error al actualizar el status');
      return { success: false, error: result.error };
    }

    return { success: true, data: result.data };
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
      setLoading(false);
      prevProjectIdRef.current = null;
      pendingCompletionRef.current.clear();
      savedCompletionRef.current.clear();
      completionQueueRef.current = [];
      completionProcessingRef.current = false;
      const waiters = completionIdleWaitersRef.current;
      completionIdleWaitersRef.current = [];
      for (const resolve of waiters) resolve();
      return;
    }

    const projectChanged = prevProjectIdRef.current !== projectId;
    prevProjectIdRef.current = projectId;

    if (projectChanged) {
      pendingCompletionRef.current.clear();
      savedCompletionRef.current.clear();
      completionQueueRef.current = [];
      completionProcessingRef.current = false;
      const waiters = completionIdleWaitersRef.current;
      completionIdleWaitersRef.current = [];
      for (const resolve of waiters) resolve();
    }

    if (initialActivities != null) {
      setActivities(initialActivities);
      setLoading(false);
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
      setLoading(false);
      return;
    }

    if (projectChanged) {
      setActivities([]);
      setLoading(true);
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
    whenTaskCompletionSavesIdle,
    calculateProjectProgress: calculateProjectProgressHandler,
    updateProjectProgress,
    syncAllActivitiesProgress,
    loadActivities,
    reorderActivities: reorderActivitiesHandler,
    updateActivityStatus: updateActivityStatusHandler,
    updateActivitiesState,
  };
}
