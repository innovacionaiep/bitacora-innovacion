'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const CONFIG_PATH = '/configuracion/desarrollo-tecnico';

export async function getCategoriasWithSubcategorias() {
  return prisma.desarrolloTecnicoCategoria.findMany({
    orderBy: { orden: 'asc' },
    include: {
      subcategorias: { orderBy: { orden: 'asc' } },
    },
  });
}

export async function createCategoria(nombre: string, orden: number) {
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
