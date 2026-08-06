'use server';

import prisma from '@/lib/prisma';
import { requireSession } from '@/lib/authz/guards';
import type { ProyectoFormPayload } from '@/types/proyecto';

export type BorradorListItem = {
  id: string;
  nombre: string;
  updatedAt: Date;
};

export async function getProyectoBorradores(): Promise<{
  success: boolean;
  data?: BorradorListItem[];
  error?: string;
}> {
  try {
    const gate = await requireSession();
    if (!gate.ok) return { success: false, error: gate.error };
    const user = gate.user;
    const list = await prisma.proyectoBorrador.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, nombre: true, updatedAt: true },
    });
    return { success: true, data: list };
  } catch (error) {
    console.error('Error getProyectoBorradores:', error);
    return { success: false, error: 'Error al listar borradores' };
  }
}

export async function getProyectoBorrador(id: string): Promise<{
  success: boolean;
  data?: { id: string; nombre: string; payload: ProyectoFormPayload };
  error?: string;
}> {
  try {
    const gate = await requireSession();
    if (!gate.ok) return { success: false, error: gate.error };
    const user = gate.user;
    const borrador = await prisma.proyectoBorrador.findFirst({
      where: { id, userId: user.id },
      select: { id: true, nombre: true, payload: true },
    });
    if (!borrador) {
      return { success: false, error: 'Borrador no encontrado' };
    }
    return {
      success: true,
      data: {
        id: borrador.id,
        nombre: borrador.nombre,
        payload: borrador.payload as ProyectoFormPayload,
      },
    };
  } catch (error) {
    console.error('Error getProyectoBorrador:', error);
    return { success: false, error: 'Error al obtener borrador' };
  }
}

export async function saveProyectoBorrador(data: {
  id?: string;
  nombre: string;
  payload: ProyectoFormPayload;
}): Promise<{ success: boolean; data?: { id: string }; error?: string }> {
  try {
    const gate = await requireSession();
    if (!gate.ok) return { success: false, error: gate.error };
    const user = gate.user;
    const nombre = (data.nombre || 'Sin nombre').trim() || 'Sin nombre';
    const payload = data.payload as object;

    if (data.id) {
      const updated = await prisma.proyectoBorrador.updateMany({
        where: { id: data.id, userId: user.id },
        data: { nombre, payload, updatedAt: new Date() },
      });
      if (updated.count === 0) {
        return { success: false, error: 'Borrador no encontrado' };
      }
      return { success: true, data: { id: data.id } };
    }

    const created = await prisma.proyectoBorrador.create({
      data: { userId: user.id, nombre, payload },
      select: { id: true },
    });
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error('Error saveProyectoBorrador:', error);
    return { success: false, error: 'Error al guardar borrador' };
  }
}

export async function deleteProyectoBorrador(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const gate = await requireSession();
    if (!gate.ok) return { success: false, error: gate.error };
    const user = gate.user;
    await prisma.proyectoBorrador.deleteMany({
      where: { id, userId: user.id },
    });
    return { success: true };
  } catch (error) {
    console.error('Error deleteProyectoBorrador:', error);
    return { success: false, error: 'Error al eliminar borrador' };
  }
}
