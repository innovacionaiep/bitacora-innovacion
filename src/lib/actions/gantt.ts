'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Activity, Task, ActivityStatus } from '@prisma/client';
import { requireProjectAccess } from '@/lib/authz/guards';
import { createHistorialEntry } from './historial';

export type ActivityData = Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateActivityInput = ActivityData;
export type TaskData = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export type ActivityWithTasks = Activity & {
  tasks: Task[];
  _count?: { evidencias: number };
};

/**
 * Obtener una actividad por ID (con tareas)
 */
export async function getActivityById(actividadId: string) {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: actividadId },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!activity) {
      return { success: false, error: 'Actividad no encontrada', data: null };
    }
    return { success: true, data: activity };
  } catch (error) {
    console.error('Error getting activity:', error);
    return { success: false, error: 'Error al obtener actividad', data: null };
  }
}

/**
 * Obtener actividades de un proyecto
 */
export async function getActivities(projectId: string) {
  try {
    const gate = await requireProjectAccess(projectId, 'view.proyectos');
    if (!gate.ok) {
      return { success: false, error: gate.error };
    }

    const activities = await prisma.activity.findMany({
      where: { projectId },
      include: {
        tasks: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        _count: { select: { evidencias: true } },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });

    return { success: true, data: activities };
  } catch (error) {
    console.error('Error getting activities:', error);
    return { success: false, error: 'Error al obtener actividades' };
  }
}

/**
 * Crear una nueva actividad
 */
export async function createActivity(data: CreateActivityInput) {
  try {
    const gate = await requireProjectAccess(data.projectId, 'view.proyectos');
    if (!gate.ok) return { success: false, error: gate.error };

    // Verificar que el proyecto existe
    const project = await prisma.proyecto.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    if (data.name && data.name.length > 60) {
      return {
        success: false,
        error: 'El nombre de la actividad no puede exceder 60 caracteres',
      };
    }

    const activity = await prisma.activity.create({
      data: {
        name: data.name.length > 60 ? data.name.substring(0, 60) : data.name,
        description: data.description || '',
        progress: 0,
        projectId: data.projectId,
        color: data.color || 'bg-gray-700',
        orderIndex: data.orderIndex || 0,
      },
      include: {
        tasks: true,
      },
    });

    // Registrar en historial
    await createHistorialEntry({
      proyectoId: data.projectId,
      accion: 'Crear',
      tabProyecto: 'Actividades',
      elementoEspecifico: 'la actividad',
      cambioGenerado: activity.name,
    });

    revalidatePath('/gantt');
    return { success: true, data: activity };
  } catch (error) {
    console.error('Error creating activity:', error);
    return { success: false, error: 'Error al crear actividad' };
  }
}

/**
 * Actualizar una actividad
 */
export async function updateActivity(id: string, data: Partial<ActivityData>) {
  try {
    if (data.name !== undefined && data.name.length > 60) {
      return {
        success: false,
        error: 'El nombre de la actividad no puede exceder 60 caracteres',
      };
    }

    const activityBefore = await prisma.activity.findUnique({
      where: { id },
      select: { name: true, projectId: true },
    });
    if (!activityBefore) {
      return { success: false, error: 'Actividad no encontrada' };
    }

    const gate = await requireProjectAccess(
      activityBefore.projectId,
      'view.proyectos'
    );
    if (!gate.ok) return { success: false, error: gate.error };

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        ...(data.name !== undefined && {
          name: data.name.length > 60 ? data.name.substring(0, 60) : data.name,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.progress !== undefined && { progress: data.progress }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.orderIndex !== undefined && { orderIndex: data.orderIndex }),
      },
      include: {
        tasks: true,
      },
    });

    const hayCambios =
      data.name !== undefined ||
      data.description !== undefined ||
      data.color !== undefined;
    if (hayCambios) {
      const partes: string[] = [];
      if (data.name !== undefined) partes.push('el nombre');
      if (data.description !== undefined) partes.push('la descripción');
      if (data.color !== undefined) partes.push('el color');
      const campoTexto =
        partes.length === 1
          ? partes[0]
          : partes.length === 2
            ? `${partes[0]} y ${partes[1]}`
            : `${partes[0]}, ${partes[1]} y ${partes[2]}`;
      const cambioValores: string[] = [];
      if (data.name !== undefined) cambioValores.push(activity.name);
      if (data.description !== undefined)
        cambioValores.push(activity.description ?? '');
      if (data.color !== undefined) cambioValores.push(activity.color);
      await createHistorialEntry({
        proyectoId: activityBefore.projectId,
        accion: 'Actualizar',
        tabProyecto: 'Actividades',
        elementoEspecifico: `${campoTexto} de la actividad "${activity.name}"`,
        cambioGenerado: cambioValores.join('; '),
      });
    }

    revalidatePath('/gantt');
    return { success: true, data: activity };
  } catch (error) {
    console.error('Error updating activity:', error);
    return { success: false, error: 'Error al actualizar actividad' };
  }
}

/**
 * Eliminar una actividad
 */
export async function deleteActivity(id: string) {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id },
      select: { name: true, projectId: true },
    });
    if (!activity) {
      return { success: false, error: 'Actividad no encontrada' };
    }

    const gate = await requireProjectAccess(
      activity.projectId,
      'view.proyectos'
    );
    if (!gate.ok) return { success: false, error: gate.error };

    // Las tareas se eliminan automáticamente por el onDelete: Cascade
    await prisma.activity.delete({
      where: { id },
    });

    await createHistorialEntry({
      proyectoId: activity.projectId,
      accion: 'Eliminar',
      tabProyecto: 'Actividades',
      elementoEspecifico: `Actividad "${activity.name}"`,
      cambioGenerado: '',
    });

    revalidatePath('/gantt');
    return { success: true };
  } catch (error) {
    console.error('Error deleting activity:', error);
    return { success: false, error: 'Error al eliminar actividad' };
  }
}

/**
 * Reordenar actividades
 */
export async function reorderActivities(
  updates: { id: string; orderIndex: number }[]
) {
  try {
    if (updates.length > 0) {
      const first = await prisma.activity.findUnique({
        where: { id: updates[0].id },
        select: { projectId: true },
      });
      if (!first) {
        return { success: false, error: 'Actividad no encontrada' };
      }
      const gate = await requireProjectAccess(
        first.projectId,
        'view.proyectos'
      );
      if (!gate.ok) return { success: false, error: gate.error };
    }

    await prisma.$transaction(
      updates.map((update) =>
        prisma.activity.update({
          where: { id: update.id },
          data: { orderIndex: update.orderIndex },
        })
      )
    );

    revalidatePath('/proyectos');
    return { success: true };
  } catch (error) {
    console.error('Error reordering activities:', error);
    return { success: false, error: 'Error al reordenar actividades' };
  }
}

/**
 * Reordenar actividades en Kanban (usa kanbanOrderIndex)
 */
export async function reorderActivitiesKanban(
  updates: { id: string; kanbanOrderIndex: number }[]
) {
  try {
    if (updates.length > 0) {
      const first = await prisma.activity.findUnique({
        where: { id: updates[0].id },
        select: { projectId: true },
      });
      if (!first) {
        return { success: false, error: 'Actividad no encontrada' };
      }
      const gate = await requireProjectAccess(
        first.projectId,
        'view.proyectos'
      );
      if (!gate.ok) return { success: false, error: gate.error };
    }

    await prisma.$transaction(
      updates.map((update) =>
        prisma.activity.update({
          where: { id: update.id },
          data: { kanbanOrderIndex: update.kanbanOrderIndex },
        })
      )
    );

    // NO llamar revalidatePath aquí para evitar re-fetch automático
    return { success: true };
  } catch (error) {
    console.error('Error reordering activities in Kanban:', error);
    return {
      success: false,
      error: 'Error al reordenar actividades en Kanban',
    };
  }
}

/**
 * Crear una nueva tarea
 */
export async function createTask(data: TaskData) {
  try {
    // Validar que el nombre de la tarea no exceda 60 caracteres
    if (data.name && data.name.length > 60) {
      return {
        success: false,
        error: 'El nombre de la tarea no puede exceder 60 caracteres',
      };
    }

    const activity = await prisma.activity.findUnique({
      where: { id: data.activityId },
      select: { projectId: true },
    });
    if (!activity) {
      return { success: false, error: 'Actividad no encontrada' };
    }
    const gate = await requireProjectAccess(
      activity.projectId,
      'view.proyectos'
    );
    if (!gate.ok) return { success: false, error: gate.error };

    const task = await prisma.task.create({
      data: {
        name: data.name.length > 60 ? data.name.substring(0, 60) : data.name,
        description: data.description || '',
        completed: false,
        startDate: data.startDate,
        endDate: data.endDate,
        progress: 0,
        activityId: data.activityId,
      },
      include: {
        activity: { select: { name: true, projectId: true } },
      },
    });

    await createHistorialEntry({
      proyectoId: task.activity.projectId,
      accion: 'Crear',
      tabProyecto: 'Actividades',
      elementoEspecifico: 'la tarea',
      cambioGenerado: task.name,
    });

    // Recalcular progreso de la actividad
    await recalculateActivityProgress(data.activityId);

    revalidatePath('/gantt');
    return { success: true, data: task };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: 'Error al crear tarea' };
  }
}

/**
 * Actualizar una tarea
 */
export async function updateTask(id: string, data: Partial<TaskData>) {
  try {
    // Validar que el nombre de la tarea no exceda 60 caracteres
    if (data.name !== undefined && data.name.length > 60) {
      return {
        success: false,
        error: 'El nombre de la tarea no puede exceder 60 caracteres',
      };
    }

    const taskBefore = await prisma.task.findUnique({
      where: { id },
      include: {
        activity: { select: { name: true, projectId: true } },
      },
    });
    if (!taskBefore) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const gate = await requireProjectAccess(
      taskBefore.activity.projectId,
      'view.proyectos'
    );
    if (!gate.ok) return { success: false, error: gate.error };

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(data.name !== undefined && {
          name: data.name.length > 60 ? data.name.substring(0, 60) : data.name,
        }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.completed !== undefined && { completed: data.completed }),
        ...(data.startDate !== undefined && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        ...(data.progress !== undefined && { progress: data.progress }),
      },
    });

    const hayEdicionInfo =
      data.name !== undefined ||
      data.description !== undefined ||
      data.startDate !== undefined ||
      data.endDate !== undefined;
    if (hayEdicionInfo) {
      const partes: string[] = [];
      if (data.name !== undefined) partes.push('el nombre');
      if (data.description !== undefined) partes.push('la descripción');
      if (data.startDate !== undefined || data.endDate !== undefined)
        partes.push('las fechas');
      const campoTexto =
        partes.length === 1
          ? partes[0]
          : partes.length === 2
            ? `${partes[0]} y ${partes[1]}`
            : `${partes[0]}, ${partes[1]} y ${partes[2]}`;
      const cambioValores: string[] = [];
      if (data.name !== undefined) cambioValores.push(task.name);
      if (data.description !== undefined)
        cambioValores.push(task.description ?? '');
      if (data.startDate !== undefined || data.endDate !== undefined) {
        const start = task.startDate
          ? new Date(task.startDate).toLocaleDateString('es-CL')
          : '';
        const end = task.endDate
          ? new Date(task.endDate).toLocaleDateString('es-CL')
          : '';
        cambioValores.push(start && end ? `${start} - ${end}` : start || end);
      }
      await createHistorialEntry({
        proyectoId: taskBefore.activity.projectId,
        accion: 'Actualizar',
        tabProyecto: 'Actividades',
        elementoEspecifico: `${campoTexto} de la tarea "${task.name}"`,
        cambioGenerado: cambioValores.join('; '),
      });
    }

    // Recalcular progreso de la actividad
    await recalculateActivityProgress(task.activityId);

    revalidatePath('/gantt');
    return { success: true, data: task };
  } catch (error) {
    console.error('Error updating task:', error);
    return { success: false, error: 'Error al actualizar tarea' };
  }
}

/**
 * Eliminar una tarea
 */
export async function deleteTask(id: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        activity: { select: { name: true, projectId: true } },
      },
    });

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const gate = await requireProjectAccess(
      task.activity.projectId,
      'view.proyectos'
    );
    if (!gate.ok) return { success: false, error: gate.error };

    await prisma.task.delete({
      where: { id },
    });

    await createHistorialEntry({
      proyectoId: task.activity.projectId,
      accion: 'Eliminar',
      tabProyecto: 'Actividades',
      elementoEspecifico: `Tarea "${task.name}"`,
      cambioGenerado: '',
    });

    // Recalcular progreso de la actividad
    await recalculateActivityProgress(task.activityId);

    revalidatePath('/gantt');
    return { success: true };
  } catch (error) {
    console.error('Error deleting task:', error);
    return { success: false, error: 'Error al eliminar tarea' };
  }
}

/**
 * Toggle completar tarea
 */
export async function toggleTaskCompletion(id: string) {
  try {
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        completed: true,
        activityId: true,
        name: true,
        activity: {
          select: {
            name: true,
            projectId: true,
          },
        },
      },
    });

    if (!task) {
      return { success: false, error: 'Tarea no encontrada' };
    }

    const gate = await requireProjectAccess(
      task.activity.projectId,
      'view.proyectos'
    );
    if (!gate.ok) return { success: false, error: gate.error };

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        completed: !task.completed,
        progress: !task.completed ? 100 : 0,
      },
    });

    // Registrar en historial solo si se marca como completada (no cuando se desmarca)
    if (updatedTask.completed && !task.completed) {
      await createHistorialEntry({
        proyectoId: task.activity.projectId,
        accion: 'Marcar realizada',
        tabProyecto: 'Actividades',
        elementoEspecifico: `la tarea: "${task.name}"`,
        cambioGenerado: '',
      });
    }

    // Recalcular progreso de la actividad
    await recalculateActivityProgress(task.activityId);

    return { success: true, data: updatedTask };
  } catch (error) {
    console.error('Error toggling task completion:', error);
    return { success: false, error: 'Error al actualizar tarea' };
  }
}

/**
 * Recalcular el progreso de una actividad basado en sus tareas
 */
async function recalculateActivityProgress(activityId: string) {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        tasks: true,
        project: true,
      },
    });

    if (!activity) return;

    // Calcular progreso
    const totalTasks = activity.tasks.length;
    const completedTasks = activity.tasks.filter((t) => t.completed).length;
    const newProgress =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Actualizar progreso de la actividad
    await prisma.activity.update({
      where: { id: activityId },
      data: { progress: newProgress },
    });

    // Recalcular progreso del proyecto
    const projectActivities = await prisma.activity.findMany({
      where: { projectId: activity.projectId },
    });

    const totalProgress = projectActivities.reduce((sum, act) => {
      if (act.id === activityId) {
        return sum + newProgress;
      }
      return sum + act.progress;
    }, 0);

    const projectProgress =
      projectActivities.length > 0
        ? Math.round(totalProgress / projectActivities.length)
        : 0;

    // Actualizar progreso del proyecto
    await prisma.proyecto.update({
      where: { id: activity.projectId },
      data: { avanceGantt: projectProgress },
    });
  } catch (error) {
    console.error('Error recalculating activity progress:', error);
  }
}

/**
 * Calcular progreso general del proyecto
 */
export async function calculateProjectProgress(projectId: string) {
  try {
    const activities = await prisma.activity.findMany({
      where: { projectId },
      select: { progress: true },
    });

    if (activities.length === 0) {
      return { success: true, progress: 0 };
    }

    const totalProgress = activities.reduce(
      (sum, act) => sum + act.progress,
      0
    );
    const progress = Math.round(totalProgress / activities.length);

    return { success: true, progress };
  } catch (error) {
    console.error('Error calculating project progress:', error);
    return { success: false, error: 'Error al calcular progreso' };
  }
}

/**
 * Actualizar el status de una actividad
 */
export async function updateActivityStatus(
  activityId: string,
  status: ActivityStatus
) {
  try {
    // Obtener la actividad actual para tener el nombre y proyectoId
    const activityBefore = await prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        name: true,
        projectId: true,
        status: true,
      },
    });

    if (!activityBefore) {
      return { success: false, error: 'Actividad no encontrada' };
    }

    const gate = await requireProjectAccess(
      activityBefore.projectId,
      'view.proyectos'
    );
    if (!gate.ok) return { success: false, error: gate.error };

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: { status },
      include: {
        tasks: true,
      },
    });

    // Registrar en historial cambio de estado en kanban (excepto Marcar realizada)
    const STATUS_LABELS: Record<ActivityStatus, string> = {
      TODO: 'Por hacer',
      WAITING: 'En espera',
      IN_PROGRESS: 'En proceso',
      DONE: 'Finalizada',
    };
    if (activityBefore.status !== status && status !== 'DONE') {
      await createHistorialEntry({
        proyectoId: activityBefore.projectId,
        accion: 'Cambio de estado en kanban',
        tabProyecto: 'Actividades',
        elementoEspecifico: `el estado de la actividad "${activity.name}"`,
        cambioGenerado: STATUS_LABELS[status],
      });
    }

    revalidatePath('/proyectos');
    return { success: true, data: activity };
  } catch (error) {
    console.error('Error updating activity status:', error);
    return {
      success: false,
      error: 'Error al actualizar el status de la actividad',
    };
  }
}
