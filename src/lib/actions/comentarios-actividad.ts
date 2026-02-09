'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { createHistorialEntry } from './historial';

export interface ComentarioActividadData {
  id: string;
  contenido: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export async function getComentariosActividad(actividadId: string) {
  try {
    const comentarios = await prisma.comentarioActividad.findMany({
      where: {
        actividadId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      success: true,
      data: comentarios,
    };
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    return {
      success: false,
      error: 'Error al obtener comentarios',
      data: [],
    };
  }
}

export async function createComentarioActividad(
  actividadId: string,
  contenido: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      };
    }

    const actividad = await prisma.activity.findUnique({
      where: { id: actividadId },
      select: {
        name: true,
        projectId: true,
      },
    });

    if (!actividad) {
      return {
        success: false,
        error: 'Actividad no encontrada',
      };
    }

    const comentario = await prisma.comentarioActividad.create({
      data: {
        actividadId,
        userId: user.id,
        contenido,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    await createHistorialEntry({
      proyectoId: actividad.projectId,
      accion: 'Comentar',
      tabProyecto: 'Actividades',
      elementoEspecifico: `Actividad "${actividad.name}"`,
      cambioGenerado: contenido,
    });

    revalidatePath('/proyectos');
    return {
      success: true,
      data: comentario,
    };
  } catch (error) {
    console.error('Error al crear comentario:', error);
    return {
      success: false,
      error: 'Error al crear comentario',
    };
  }
}
