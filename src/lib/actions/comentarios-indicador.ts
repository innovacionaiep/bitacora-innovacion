'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { createHistorialEntry } from './historial';

export interface ComentarioIndicadorData {
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

export async function getComentariosIndicador(indicadorId: string) {
  try {
    const comentarios = await prisma.comentarioIndicador.findMany({
      where: {
        indicadorId,
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

export async function createComentarioIndicador(
  indicadorId: string,
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

    // Obtener el indicador para tener su nombre y proyectoId
    const indicador = await prisma.indicador.findUnique({
      where: { id: indicadorId },
      select: {
        nombre: true,
        proyectoId: true,
      },
    });

    if (!indicador) {
      return {
        success: false,
        error: 'Indicador no encontrado',
      };
    }

    const comentario = await prisma.comentarioIndicador.create({
      data: {
        indicadorId,
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

    // Registrar en historial
    await createHistorialEntry({
      proyectoId: indicador.proyectoId,
      accion: 'Comentar',
      tabProyecto: 'Indicadores',
      elementoEspecifico: `Indicador "${indicador.nombre}"`,
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

export async function deleteComentarioIndicador(comentarioId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      };
    }

    // Verificar que el comentario pertenece al usuario
    const comentario = await prisma.comentarioIndicador.findUnique({
      where: { id: comentarioId },
    });

    if (!comentario) {
      return {
        success: false,
        error: 'Comentario no encontrado',
      };
    }

    if (comentario.userId !== user.id) {
      return {
        success: false,
        error: 'No tienes permiso para eliminar este comentario',
      };
    }

    await prisma.comentarioIndicador.delete({
      where: { id: comentarioId },
    });

    revalidatePath('/proyectos');
    return {
      success: true,
    };
  } catch (error) {
    console.error('Error al eliminar comentario:', error);
    return {
      success: false,
      error: 'Error al eliminar comentario',
    };
  }
}
