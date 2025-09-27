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

  // Color gris oscuro para todas las actividades
  const ACTIVITY_COLORS = [
    'bg-gray-700'
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

          const tasks = tasksData || [];
          
          // Recalcular el progreso basado en las tareas reales
          const completedTasks = tasks.filter(task => task.completed).length;
          const correctProgress = tasks.length > 0 
            ? Math.round((completedTasks / tasks.length) * 100) 
            : 0;

          console.log(`Loading activity ${activity.name}:`);
          console.log(`  Tasks:`, tasks.map(t => ({ name: t.name, completed: t.completed })));
          console.log(`  Completed tasks: ${completedTasks}/${tasks.length}`);
          console.log(`  DB progress: ${activity.progress}%, Calculated progress: ${correctProgress}%`);

          return {
            ...activity,
            color: 'bg-gray-700', // Forzar color gris oscuro para todas las actividades
            tasks,
            progress: correctProgress // Usar el progreso calculado, no el de la DB
          };
        })
      );

      setActivities(activitiesWithTasks);

      // Sincronizar automáticamente el progreso y color en la base de datos si hay inconsistencias
      for (const activity of activitiesWithTasks) {
        const dbActivity = activitiesData.find(a => a.id === activity.id);
        const dbProgress = dbActivity?.progress || 0;
        const dbColor = dbActivity?.color || 'bg-blue-500';
        
        if (dbProgress !== activity.progress || dbColor !== 'bg-gray-700') {
          console.log(`Syncing activity ${activity.name} progress: ${dbProgress}% -> ${activity.progress}% and color: ${dbColor} -> bg-gray-700`);
          updateActivity(activity.id, { progress: activity.progress, color: 'bg-gray-700' });
        }
      }

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
      // Verificar que el proyecto existe
      const { data: projectData, error: projectError } = await supabase
        .from('proyectos')
        .select('id')
        .eq('id', projectId)
        .single();

      if (projectError || !projectData) {
        throw new Error('El proyecto seleccionado no existe');
      }

      const color = ACTIVITY_COLORS[activities.length % ACTIVITY_COLORS.length];
      
      console.log('Creating activity with data:', {
        ...activityData,
        project_id: projectId,
        color,
        progress: 0
      });
      
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

      console.log('Supabase response:', { data, error });

      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      const newActivity = {
        ...data,
        tasks: []
      };

      setActivities(prev => [...prev, newActivity]);
      return { data: newActivity, error: null };
    } catch (err) {
      console.error('Error creating activity:', err);
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

      // Actualizar la tarea en el estado local y recalcular progreso
      setActivities(prev => {
        const updatedActivities = prev.map(activity => ({
          ...activity,
          tasks: activity.tasks.map(task => 
            task.id === taskId ? { ...task, ...data } : task
          )
        }));
        
        // Encontrar la actividad actualizada y recalcular su progreso
        const activity = updatedActivities.find(a => a.tasks.some(t => t.id === taskId));
        if (activity) {
          const newProgress = calculateActivityProgress(activity);
          if (newProgress !== activity.progress) {
            // Actualizar el progreso de la actividad
            const finalActivities = updatedActivities.map(a => 
              a.id === activity.id ? { ...a, progress: newProgress } : a
            );
            
            // Actualizar el progreso del proyecto en la base de datos
            if (projectId) {
              const projectProgress = Math.round(
                finalActivities.reduce((sum, act) => sum + act.progress, 0) / finalActivities.length
              );
              updateProjectProgress(projectId, projectProgress);
            }
            
            return finalActivities;
          }
        }
        
        return updatedActivities;
      });

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

  // Toggle completar tarea (solo estado local)
  const toggleTaskCompletion = (taskId: string) => {
    setActivities(prev => {
      console.log('=== TOGGLE TASK COMPLETION ===');
      console.log('Task ID:', taskId);
      console.log('Current activities:', prev);
      
      // Encontrar la tarea y la actividad que la contiene
      let targetActivity = null;
      let targetTask = null;
      
      for (const activity of prev) {
        const task = activity.tasks.find(t => t.id === taskId);
        if (task) {
          targetActivity = activity;
          targetTask = task;
          break;
        }
      }

      if (!targetActivity || !targetTask) {
        console.log('Task or activity not found');
        return prev;
      }

      console.log('Found task:', targetTask.name, 'completed:', targetTask.completed);
      console.log('Found activity:', targetActivity.name, 'progress:', targetActivity.progress);

      // Crear la tarea actualizada
      const updatedTask = {
        ...targetTask,
        completed: !targetTask.completed,
        progress: !targetTask.completed ? 100 : 0
      };

      console.log('Updated task:', updatedTask.name, 'completed:', updatedTask.completed);

      // Actualizar la actividad con la tarea modificada
      const updatedActivity = {
        ...targetActivity,
        tasks: targetActivity.tasks.map(t => 
          t.id === taskId ? updatedTask : t
        )
      };

      // Recalcular el progreso de la actividad
      const completedTasks = updatedActivity.tasks.filter(task => task.completed).length;
      const newProgress = updatedActivity.tasks.length > 0 
        ? Math.round((completedTasks / updatedActivity.tasks.length) * 100) 
        : 0;

      console.log('Activity progress calculation:', completedTasks, '/', updatedActivity.tasks.length, '=', newProgress + '%');

      const finalActivity = {
        ...updatedActivity,
        progress: newProgress
      };

      console.log('Final activity:', finalActivity.name, 'progress:', finalActivity.progress);

      // Actualizar el array de actividades
      const result = prev.map(activity => 
        activity.id === targetActivity.id ? finalActivity : activity
      );

      console.log('Final activities:', result);
      console.log('=== END TOGGLE ===');
      
      return result;
    });
  };

  // Calcular progreso de una actividad
  const calculateActivityProgress = (activity: Activity): number => {
    if (activity.tasks.length === 0) return 0;
    const completedTasks = activity.tasks.filter(task => task.completed).length;
    return Math.round((completedTasks / activity.tasks.length) * 100);
  };

  // Actualizar progreso de una actividad
  const updateActivityProgress = async (activityId: string) => {
    setActivities(prev => {
      const activity = prev.find(a => a.id === activityId);
      if (!activity) return prev;

      const newProgress = calculateActivityProgress(activity);
      
      if (newProgress !== activity.progress) {
        // Actualizar la actividad en la base de datos
        updateActivity(activityId, { progress: newProgress });
        
        // Actualizar el progreso del proyecto en la base de datos
        if (projectId) {
          const updatedActivities = prev.map(a => 
            a.id === activityId ? { ...a, progress: newProgress } : a
          );
          const projectProgress = Math.round(
            updatedActivities.reduce((sum, act) => sum + act.progress, 0) / updatedActivities.length
          );
          updateProjectProgress(projectId, projectProgress);
        }

        // Actualizar el estado local
        return prev.map(a => 
          a.id === activityId ? { ...a, progress: newProgress } : a
        );
      }
      
      return prev;
    });
  };

  // Calcular progreso general del proyecto
  const calculateProjectProgress = (): number => {
    if (activities.length === 0) return 0;
    const totalProgress = activities.reduce((sum, activity) => sum + activity.progress, 0);
    return Math.round(totalProgress / activities.length);
  };

  // Actualizar el avance del proyecto en la base de datos
  const updateProjectProgress = async (projectId: string, progress: number) => {
    try {
      const { error } = await supabase
        .from('proyectos')
        .update({ avance_gantt: progress })
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project progress:', error);
      } else {
        console.log(`Project progress updated to ${progress}%`);
      }
    } catch (err) {
      console.error('Error updating project progress:', err);
    }
  };


  // Sincronizar progreso de todas las actividades (función manual)
  const syncAllActivitiesProgress = async () => {
    setLoading(true);
    setError(null);

    try {
      // Obtener el estado actual de las actividades
      const currentActivities = activities;
      
      // Actualizar cada tarea en la base de datos
      for (const activity of currentActivities) {
        for (const task of activity.tasks) {
          await updateTask(task.id, {
            completed: task.completed,
            progress: task.completed ? 100 : 0
          });
        }
      }

      // Actualizar cada actividad en la base de datos
      for (const activity of currentActivities) {
        const correctProgress = calculateActivityProgress(activity);
        if (correctProgress !== activity.progress) {
          await updateActivity(activity.id, { progress: correctProgress });
        }
      }

      // Actualizar el progreso del proyecto
      if (projectId) {
        const projectProgress = Math.round(
          currentActivities.reduce((sum, act) => sum + calculateActivityProgress(act), 0) / currentActivities.length
        );
        await updateProjectProgress(projectId, projectProgress);
      }

      // Recargar actividades para verificar que todo esté sincronizado
      await loadActivities();

      return { success: true, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al sincronizar el progreso';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
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
    updateProjectProgress,
    syncAllActivitiesProgress,
    loadActivities
  };
}
