'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/authz/guards';

const CONFIG_PATH = '/configuracion/desarrollo-tecnico';

export async function getCategoriasWithSubcategorias() {
  return prisma.desarrolloTecnicoCategoria.findMany({
    orderBy: { orden: 'asc' },
    include: {
      subcategorias: {
        orderBy: { orden: 'asc' },
        include: {
          lineasExcluidas: { select: { lineaId: true } },
        },
      },
    },
  });
}

/** Fondos con sus líneas, para configurar aplicabilidad por elemento. */
export async function getFondosConLineasParaDt() {
  return prisma.fondo.findMany({
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
    include: {
      lineas: {
        orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        select: { id: true, nombre: true, orden: true },
      },
    },
  });
}

/**
 * Activa o desactiva un elemento de DT para una línea.
 * Activo = sin fila de exclusión; inactivo = crea exclusión.
 */
export async function setSubcategoriaLineaEnabled(
  subcategoriaId: string,
  lineaId: string,
  enabled: boolean
) {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    if (!subcategoriaId.trim() || !lineaId.trim()) {
      return { success: false, error: 'Datos incompletos' };
    }
    const [sub, linea] = await Promise.all([
      prisma.desarrolloTecnicoSubcategoria.findUnique({
        where: { id: subcategoriaId },
        select: { id: true },
      }),
      prisma.linea.findUnique({
        where: { id: lineaId },
        select: { id: true },
      }),
    ]);
    if (!sub) return { success: false, error: 'Subcategoría no encontrada' };
    if (!linea) return { success: false, error: 'Línea no encontrada' };

    if (enabled) {
      await prisma.desarrolloTecnicoSubcategoriaLineaExcluida.deleteMany({
        where: { subcategoriaId, lineaId },
      });
    } else {
      await prisma.desarrolloTecnicoSubcategoriaLineaExcluida.upsert({
        where: {
          subcategoriaId_lineaId: { subcategoriaId, lineaId },
        },
        create: { subcategoriaId, lineaId },
        update: {},
      });
    }

    revalidatePath(CONFIG_PATH);
    revalidatePath('/configuracion/lineas');
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar aplicabilidad' };
  }
}

export async function createCategoria(nombre: string, orden: number) {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    await prisma.desarrolloTecnicoCategoria.create({
      data: { nombre: nombre.trim(), orden },
    });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear categoría' };
  }
}

export async function updateCategoria(
  id: string,
  nombre: string,
  orden: number
) {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    await prisma.desarrolloTecnicoCategoria.update({
      where: { id },
      data: { nombre: nombre.trim(), orden },
    });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar categoría' };
  }
}

export async function deleteCategoria(id: string) {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    await prisma.desarrolloTecnicoCategoria.delete({ where: { id } });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al eliminar categoría' };
  }
}

export async function createSubcategoria(
  categoriaId: string,
  nombre: string,
  icono: string,
  orden: number
) {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    await prisma.desarrolloTecnicoSubcategoria.create({
      data: {
        categoriaId,
        nombre: nombre.trim(),
        icono: icono || 'FileText',
        orden,
      },
    });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear subcategoría' };
  }
}

export async function updateSubcategoria(
  id: string,
  data: {
    nombre?: string;
    categoriaId?: string;
    icono?: string;
    orden?: number;
  }
) {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    await prisma.desarrolloTecnicoSubcategoria.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre.trim() }),
        ...(data.categoriaId !== undefined && {
          categoriaId: data.categoriaId,
        }),
        ...(data.icono !== undefined && { icono: data.icono }),
        ...(data.orden !== undefined && { orden: data.orden }),
      },
    });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar subcategoría' };
  }
}

export async function deleteSubcategoria(id: string) {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    await prisma.desarrolloTecnicoSubcategoria.delete({ where: { id } });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al eliminar subcategoría' };
  }
}
