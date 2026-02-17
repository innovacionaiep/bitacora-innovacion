'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Activity, Task, ActivityStatus } from '@prisma/client';
import { createHistorialEntry } from './historial';
import { getSession } from '@/lib/auth-utils';

export type ActivityData = Omit<Activity, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateActivityInput = Omit<
  ActivityData,
  'validadoPorCoordinador' | 'validadoPorCoordinadorId'
>;
export type TaskData = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

export type ActivityWithTasks = Activity & {
  tasks: Task[];
  validadoPorCoordinadorPor?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
};

/**
 * Obtener una actividad por ID (con tareas y validación)
 */
export async function getActivityById(actividadId: string) {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: actividadId },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' },
        },
        validadoPorCoordinadorPor: {
          select: { id: true, name: true, image: true },
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
    const activities = await prisma.activity.findMany({
      where: { projectId },
      include: {
        tasks: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        validadoPorCoordinadorPor: {
          select: { id: true, name: true, image: true },
        },
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
    // Verificar que el proyecto existe
    const project = await prisma.proyecto.findUnique({
      where: { id: data.projectId },
    });

    if (!project) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    if (data.name && data.name.length > 50) {
      return {
        success: false,
        error: 'El nombre de la actividad no puede exceder 50 caracteres',
      };
    }

    const activity = await prisma.activity.create({
      data: {
        name: data.name.length > 50 ? data.name.substring(0, 50) : data.name,
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
      elementoEspecifico: `Actividad "${activity.name}"`,
      cambioGenerado: `Nueva actividad creada: ${activity.name}`,
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
    if (data.name !== undefined && data.name.length > 50) {
      return {
        success: false,
        error: 'El nombre de la actividad no puede exceder 50 caracteres',
      };
    }

    const activityBefore = await prisma.activity.findUnique({
      where: { id },
      select: { name: true, projectId: true },
    });
    if (!activityBefore) {
      return { success: false, error: 'Actividad no encontrada' };
    }

    const activity = await prisma.activity.update({
      where: { id },
      data: {
        ...(data.name !== undefined && {
          name: data.name.length > 50 ? data.name.substring(0, 50) : data.name,
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
      await createHistorialEntry({
        proyectoId: activityBefore.projectId,
        accion: 'Actualizar',
        tabProyecto: 'Actividades',
        elementoEspecifico: `Actividad "${activity.name}"`,
        cambioGenerado: 'Información de la actividad editada',
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
 * Verificar si el usuario es coordinador del proyecto
 */
async function isCoordinatorOfProject(
  userId: string,
  projectId: string
): Promise<boolean> {
  const participante = await prisma.proyectoParticipante.findFirst({
    where: {
      proyectoId: projectId,
      userId,
      rol: 'Coordinador',
    },
  });
  return !!participante;
}

/**
 * Marcar o desmarcar validación de coordinador en una actividad.
 * Solo coordinadores del proyecto pueden validar. La actividad debe tener todas las tareas completadas para poder validar.
 */
export async function toggleActivityValidation(activityId: string) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return { success: false, error: 'Debes iniciar sesión' };
    }

    const activity = await prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        tasks: true,
        validadoPorCoordinadorPor: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (!activity) {
      return { success: false, error: 'Actividad no encontrada' };
    }

    const isCoordinator = await isCoordinatorOfProject(
      session.user.id,
      activity.projectId
    );
    if (!isCoordinator) {
      return {
        success: false,
        error: 'Solo los coordinadores del proyecto pueden validar actividades',
      };
    }

    const allTasksCompleted =
      activity.tasks.length > 0 && activity.tasks.every((t) => t.completed);
    if (!allTasksCompleted && !activity.validadoPorCoordinador) {
      return {
        success: false,
        error:
          'La actividad debe tener todas las tareas completadas para poder validar',
      };
    }

    const newValidado = !activity.validadoPorCoordinador;
    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: {
        validadoPorCoordinador: newValidado,
        validadoPorCoordinadorId: newValidado ? session.user.id : null,
      },
      include: {
        tasks: true,
        validadoPorCoordinadorPor: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    if (newValidado) {
      await createHistorialEntry({
        proyectoId: activity.projectId,
        accion: 'Validar',
        tabProyecto: 'Actividades',
        elementoEspecifico: `Actividad "${activity.name}"`,
        cambioGenerado: 'Validada por coordinador',
      });
    }

    revalidatePath('/proyectos');
    revalidatePath('/gantt');
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error toggling activity validation:', error);
    return { success: false, error: 'Error al validar actividad' };
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
    // Las tareas se eliminan automáticamente por el onDelete: Cascade
    await prisma.activity.delete({
      where: { id },
    });

    await createHistorialEntry({
      proyectoId: activity.projectId,
      accion: 'Eliminar',
      tabProyecto: 'Actividades',
      elementoEspecifico: `Actividad "${activity.name}"`,
      cambioGenerado: 'Actividad eliminada',
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
      elementoEspecifico: `Tarea "${task.name}" en Actividad "${task.activity.name}"`,
      cambioGenerado: 'Nueva tarea agregada',
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
      await createHistorialEntry({
        proyectoId: taskBefore.activity.projectId,
        accion: 'Actualizar',
        tabProyecto: 'Actividades',
        elementoEspecifico: `Tarea "${task.name}" de Actividad "${taskBefore.activity.name}"`,
        cambioGenerado: 'Información de la tarea editada',
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

    await prisma.task.delete({
      where: { id },
    });

    await createHistorialEntry({
      proyectoId: task.activity.projectId,
      accion: 'Eliminar',
      tabProyecto: 'Actividades',
      elementoEspecifico: `Tarea "${task.name}" de Actividad "${task.activity.name}"`,
      cambioGenerado: 'Tarea eliminada',
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
        elementoEspecifico: `Tarea "${task.name}" de Actividad "${task.activity.name}"`,
        cambioGenerado: '', // No mostrar cambioGenerado para tareas completadas
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

    const activity = await prisma.activity.update({
      where: { id: activityId },
      data: { status },
      include: {
        tasks: true,
      },
    });

    // Registrar en historial cualquier cambio de estado en kanban
    if (activityBefore.status !== status) {
      const accion =
        status === 'DONE'
          ? 'Marcar realizada'
          : 'Cambio de estado en kanban';
      const cambioGenerado =
        status === 'DONE'
          ? `Actividad "${activity.name}" marcada como realizada`
          : `Estado: ${activityBefore.status} → ${status}`;
      await createHistorialEntry({
        proyectoId: activityBefore.projectId,
        accion,
        tabProyecto: 'Actividades',
        elementoEspecifico: `Actividad "${activity.name}"`,
        cambioGenerado,
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
