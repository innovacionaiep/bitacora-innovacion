'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyConfigUnlock } from '@/lib/actions/configuracion-usuarios';
import { deleteProyecto } from '@/lib/actions/proyectos';

export type ProyectoListRow = {
  id: string;
  proyecto: string;
  fondo: string;
  sede: string;
  participantes: number;
  createdAt: Date;
};

/**
 * Listar todos los proyectos para el panel de configuración (solo Admin).
 */
export async function listProyectosConfig(): Promise<{
  success: boolean;
  data?: ProyectoListRow[];
  error?: string;
}> {
  try {
    const proyectos = await prisma.proyecto.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        proyecto: true,
        fondo: true,
        sede: true,
        participantes: true,
        createdAt: true,
      },
    });
    return { success: true, data: proyectos as ProyectoListRow[] };
  } catch (e) {
    console.error('listProyectosConfig:', e);
    return { success: false, error: 'Error al listar proyectos' };
  }
}

/**
 * Eliminar un proyecto y todo su contenido (cascade). Requiere contraseña de desbloqueo "bitacora".
 */
export async function deleteProyectoConfig(
  proyectoId: string,
  unlockPassword: string
): Promise<{ success: boolean; error?: string }> {
  const verified = await verifyConfigUnlock(unlockPassword);
  if (!verified.success) {
    return { success: false, error: verified.error ?? 'Contraseña incorrecta' };
  }
  const result = await deleteProyecto(proyectoId);
  if (result.success) {
    revalidatePath('/configuracion/proyectos');
    revalidatePath('/configuracion/usuarios');
    revalidatePath('/proyectos');
  }
  return result;
}
