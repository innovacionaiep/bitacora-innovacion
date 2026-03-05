'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const CONFIG_PATH = '/configuracion/validacion';

// ----- Sedes -----
export async function getSedes() {
  return prisma.sede.findMany({
    orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
  });
}

export async function createSede(nombre: string, orden?: number) {
  try {
    await prisma.sede.create({
      data: { nombre: nombre.trim(), orden: orden ?? 0 },
    });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear sede' };
  }
}

export async function updateSede(id: string, nombre: string, orden?: number) {
  try {
    await prisma.sede.update({
      where: { id },
      data: { nombre: nombre.trim(), ...(orden !== undefined && { orden }) },
    });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar sede' };
  }
}

export async function deleteSede(id: string) {
  try {
    const enUso = await prisma.proyectoParticipante.count({
      where: { sedeId: id },
    });
    if (enUso > 0) {
      return {
        success: false,
        error: 'No se puede eliminar: hay participantes que usan esta sede',
      };
    }
    await prisma.sede.delete({ where: { id } });
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al eliminar sede' };
  }
}

/** Rellena la tabla Sedes con los valores distintos de Proyecto.sede que aún no existan. */
export async function backfillSedesFromProyectos(): Promise<{
  success: boolean;
  created?: number;
  error?: string;
}> {
  try {
    const proyectos = await prisma.proyecto.findMany({
      select: { sede: true },
    });
    const nombres = Array.from(
      new Set(proyectos.map((p) => p.sede?.trim()).filter(Boolean))
    ).sort();
    if (nombres.length === 0) {
      return { success: true, created: 0 };
    }
    const existentes = await prisma.sede.findMany({ select: { nombre: true } });
    const setExistentes = new Set(existentes.map((e) => e.nombre));
    const aCrear = nombres.filter((n) => !setExistentes.has(n));
    for (let i = 0; i < aCrear.length; i++) {
      await prisma.sede.create({
        data: { nombre: aCrear[i], orden: i },
      });
    }
    revalidatePath(CONFIG_PATH);
    revalidatePath('/proyectos');
    return { success: true, created: aCrear.length };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al cargar sedes desde proyectos' };
  }
}

// ----- Comunas -----
export async function getComunas() {
  return prisma.comuna.findMany({
    orderBy: [{ region: 'asc' }, { nombre: 'asc' }],
  });
}

export async function createComuna(nombre: string, region: string) {
  try {
    await prisma.comuna.create({
      data: { nombre: nombre.trim(), region: region.trim() },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear comuna' };
  }
}

export async function updateComuna(id: string, nombre: string, region: string) {
  try {
    await prisma.comuna.update({
      where: { id },
      data: { nombre: nombre.trim(), region: region.trim() },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar comuna' };
  }
}

export async function deleteComuna(id: string) {
  try {
    const inUse = await prisma.proyectoComuna.count({
      where: { comunaId: id },
    });
    if (inUse > 0) {
      return {
        success: false,
        error: 'No se puede eliminar: hay proyectos que usan esta comuna',
      };
    }
    await prisma.comuna.delete({ where: { id } });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al eliminar comuna' };
  }
}

// ----- Escuelas -----
export async function getEscuelas() {
  return prisma.escuela.findMany({ orderBy: { nombre: 'asc' } });
}

export async function createEscuela(nombre: string, codigo: string) {
  try {
    await prisma.escuela.create({
      data: { nombre: nombre.trim(), codigo: codigo.trim().toUpperCase() },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear escuela' };
  }
}

export async function updateEscuela(
  id: string,
  nombre: string,
  codigo: string
) {
  try {
    await prisma.escuela.update({
      where: { id },
      data: { nombre: nombre.trim(), codigo: codigo.trim().toUpperCase() },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar escuela' };
  }
}

export async function deleteEscuela(id: string) {
  try {
    const inUse =
      (await prisma.proyectoEscuela.count({ where: { escuelaId: id } })) > 0 ||
      (await prisma.proyectoParticipante.count({ where: { escuelaId: id } })) >
        0;
    if (inUse) {
      return {
        success: false,
        error:
          'No se puede eliminar: hay proyectos o participantes que usan esta escuela',
      };
    }
    await prisma.escuela.delete({ where: { id } });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al eliminar escuela' };
  }
}

// ----- Carreras -----
export async function getCarreras() {
  return prisma.carrera.findMany({
    orderBy: { nombre: 'asc' },
  });
}

export async function createCarrera(nombre: string) {
  try {
    await prisma.carrera.create({
      data: { nombre: nombre.trim() },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear carrera' };
  }
}

export async function updateCarrera(id: string, nombre: string) {
  try {
    await prisma.carrera.update({
      where: { id },
      data: { nombre: nombre.trim() },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar carrera' };
  }
}

export async function deleteCarrera(id: string) {
  try {
    const inUse = await prisma.proyectoCarrera.count({
      where: { carreraId: id },
    });
    if (inUse > 0) {
      return {
        success: false,
        error: 'No se puede eliminar: hay proyectos que usan esta carrera',
      };
    }
    await prisma.carrera.delete({ where: { id } });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al eliminar carrera' };
  }
}

// ----- Grupos de interés -----
export async function getGruposInteres() {
  return prisma.grupoInteres.findMany({ orderBy: { nombre: 'asc' } });
}

export async function createGrupoInteres(nombre: string, descripcion?: string) {
  try {
    await prisma.grupoInteres.create({
      data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear grupo de interés' };
  }
}

export async function updateGrupoInteres(
  id: string,
  nombre: string,
  descripcion?: string
) {
  try {
    await prisma.grupoInteres.update({
      where: { id },
      data: { nombre: nombre.trim(), descripcion: descripcion?.trim() || null },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar grupo de interés' };
  }
}

export async function deleteGrupoInteres(id: string) {
  try {
    const inUse = await prisma.proyectoGrupoInteres.count({
      where: { grupoInteresId: id },
    });
    if (inUse > 0) {
      return {
        success: false,
        error: 'No se puede eliminar: hay proyectos que usan este grupo',
      };
    }
    await prisma.grupoInteres.delete({ where: { id } });
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al eliminar grupo de interés' };
  }
}
