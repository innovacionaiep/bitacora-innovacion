'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireProjectAccess } from '@/lib/authz/guards';
import { createHistorialEntry } from './historial';

export interface ComentarioItemPresupuestoData {
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

export async function getComentariosItemPresupuesto(itemPresupuestoId: string) {
  try {
    const comentarios = await prisma.comentarioItemPresupuesto.findMany({
      where: {
        itemPresupuestoId,
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

export async function createComentarioItemPresupuesto(
  itemPresupuestoId: string,
  contenido: string
) {
  try {
    // Obtener el ítem de presupuesto para tener su nombre y proyectoId
    const itemPresupuesto = await prisma.itemPresupuesto.findUnique({
      where: { id: itemPresupuestoId },
      select: {
        item: true,
        proyectoId: true,
      },
    });

    if (!itemPresupuesto) {
      return {
        success: false,
        error: 'Ítem de presupuesto no encontrado',
      };
    }

    const gate = await requireProjectAccess(
      itemPresupuesto.proyectoId,
      'view.proyectos'
    );
    if (!gate.ok) return { success: false, error: gate.error };

    const comentario = await prisma.comentarioItemPresupuesto.create({
      data: {
        itemPresupuestoId,
        userId: gate.user.id,
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
      proyectoId: itemPresupuesto.proyectoId,
      accion: 'Comentar',
      tabProyecto: 'Presupuesto',
      elementoEspecifico: `Gasto "${itemPresupuesto.item}"`,
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
