import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export type Task = {
  id: string;
  name: string;
  completed: boolean;
  start_date: string;
  end_date: string;
  progress: number;
  activity_id: string;
  created_at: string;
  updated_at: string;
};

export type Activity = {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  progress: number;
  project_id: string;
  color: string;
  created_at: string;
  updated_at: string;
  tasks: Task[];
};

export function useGantt(projectId: string | null) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Colores para las actividades
  const ACTIVITY_COLORS = [
    'bg-blue-500',
    'bg-green-500', 
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-red-500',
    'bg-teal-500'
  ];

  // Cargar actividades del proyecto
  const loadActivities = async () => {
    if (!projectId) {
      setActivities([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Cargar actividades
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (activitiesError) throw activitiesError;

      // Cargar tareas para cada actividad
      const activitiesWithTasks = await Promise.all(
        (activitiesData || []).map(async (activity) => {
          const { data: tasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('activity_id', activity.id)
            .order('created_at', { ascending: true });

          if (tasksError) throw tasksError;

          return {
            ...activity,
            tasks: tasksData || []
          };
        })
      );

      setActivities(activitiesWithTasks);
    } catch (err) {
      console.error('Error loading activities:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar las actividades');
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva actividad
  const createActivity = async (activityData: {
    name: string;
    description: string;
    start_date: string;
    end_date: string;
  }) => {
    if (!projectId) throw new Error('No hay proyecto seleccionado');

    setLoading(true);
    setError(null);

    try {
      const color = ACTIVITY_COLORS[activities.length % ACTIVITY_COLORS.length];
      
      const { data, error } = await supabase
        .from('activities')
        .insert({
          ...activityData,
          project_id: projectId,
          color,
          progress: 0
        })
        .select()
        .single();

      if (error) throw error;

      const newActivity = {
        ...data,
        tasks: []
      };

      setActivities(prev => [...prev, newActivity]);
      return { data: newActivity, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear la actividad';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Actualizar actividad
  const updateActivity = async (activityId: string, updates: Partial<Activity>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('activities')
        .update(updates)
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;

      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, ...data }
            : activity
        )
      );

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar la actividad';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Eliminar actividad
  const deleteActivity = async (activityId: string) => {
    setLoading(true);
    setError(null);

    try {
      // Primero eliminar todas las tareas de la actividad
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('activity_id', activityId);

      if (tasksError) throw tasksError;

      // Luego eliminar la actividad
      const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      setActivities(prev => prev.filter(activity => activity.id !== activityId));
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar la actividad';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Crear nueva tarea
  const createTask = async (activityId: string, taskData: {
    name: string;
    start_date: string;
    end_date: string;
  }) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          activity_id: activityId,
          completed: false,
          progress: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Actualizar la actividad con la nueva tarea
      setActivities(prev => 
        prev.map(activity => 
          activity.id === activityId 
            ? { ...activity, tasks: [...activity.tasks, data] }
            : activity
        )
      );

      // Recalcular progreso de la actividad
      await updateActivityProgress(activityId);

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al crear la tarea';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Actualizar tarea
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      // Actualizar la tarea en el estado local
      setActivities(prev => 
        prev.map(activity => ({
          ...activity,
          tasks: activity.tasks.map(task => 
            task.id === taskId ? { ...task, ...data } : task
          )
        }))
      );

      // Recalcular progreso de la actividad
      const activity = activities.find(a => a.tasks.some(t => t.id === taskId));
      if (activity) {
        await updateActivityProgress(activity.id);
      }

      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al actualizar la tarea';
      setError(errorMessage);
      return { data: null, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Eliminar tarea
  const deleteTask = async (taskId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Encontrar la actividad de la tarea
      const activity = activities.find(a => a.tasks.some(t => t.id === taskId));
      
      if (activity) {
        // Actualizar el estado local
        setActivities(prev => 
          prev.map(a => 
            a.id === activity.id 
              ? { ...a, tasks: a.tasks.filter(t => t.id !== taskId) }
              : a
          )
        );

        // Recalcular progreso de la actividad
        await updateActivityProgress(activity.id);
      }

      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al eliminar la tarea';
      setError(errorMessage);
      return { error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Toggle completar tarea
  const toggleTaskCompletion = async (taskId: string) => {
    const task = activities
      .flatMap(a => a.tasks)
      .find(t => t.id === taskId);

    if (!task) return;

    const updates = {
      completed: !task.completed,
      progress: !task.completed ? 100 : 0
    };

    return await updateTask(taskId, updates);
  };

  // Calcular progreso de una actividad
  const calculateActivityProgress = (activity: Activity): number => {
    if (activity.tasks.length === 0) return 0;
    const completedTasks = activity.tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / activity.tasks.length) * 100);
  };

  // Actualizar progreso de una actividad
  const updateActivityProgress = async (activityId: string) => {
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    const newProgress = calculateActivityProgress(activity);
    
    if (newProgress !== activity.progress) {
      await updateActivity(activityId, { progress: newProgress });
    }
  };

  // Calcular progreso general del proyecto
  const calculateProjectProgress = (): number => {
    if (activities.length === 0) return 0;
    const totalProgress = activities.reduce((sum, activity) => sum + activity.progress, 0);
    return Math.round(totalProgress / activities.length);
  };

  // Cargar actividades cuando cambie el proyecto
  useEffect(() => {
    loadActivities();
  }, [projectId]);

  return {
    activities,
    loading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    calculateProjectProgress,
    loadActivities
  };
}
