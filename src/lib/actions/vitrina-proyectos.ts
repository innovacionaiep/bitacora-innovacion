'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz/guards';
import {
  freezeCatalogPair,
  clampCoverOffset,
  clampCoverZoom,
  clampCoverOffsetY,
  normalizeVitrinaProyectos,
  type VitrinaCatalogOption,
  type VitrinaProyecto,
} from '@/lib/vitrina-proyectos';
import {
  deleteVitrinaProyectoRecord,
  readVitrinaProyectos,
  updateVitrinaProyectoCover,
  upsertVitrinaProyectoRecord,
  upsertVitrinaProyectosRecords,
} from '@/lib/vitrina-proyectos-store';

export type VitrinaLineaOption = VitrinaCatalogOption & { fondoId: string };

export type VitrinaProjectCatalogs = {
  fondos: VitrinaCatalogOption[];
  lineas: VitrinaLineaOption[];
  sedes: VitrinaCatalogOption[];
  escuelas: VitrinaCatalogOption[];
  socios: VitrinaCatalogOption[];
  etiquetas: VitrinaCatalogOption[];
};

export async function getVitrinaProjectCatalogs(): Promise<VitrinaProjectCatalogs> {
  const [fondos, lineas, sedes, escuelas, socios, etiquetas] = await Promise.all([
    prisma.fondo.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true },
    }),
    prisma.linea.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true, fondoId: true },
    }),
    prisma.sede.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: { id: true, nombre: true },
    }),
    prisma.escuela.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    }),
    prisma.socioComunitario.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    }),
    prisma.etiqueta.findMany({
      orderBy: { nombre: 'asc' },
      select: { id: true, nombre: true },
    }),
  ]);

  return { fondos, lineas, sedes, escuelas, socios, etiquetas };
}

function freezeProyecto(
  proyecto: VitrinaProyecto,
  catalogs: VitrinaProjectCatalogs,
): VitrinaProyecto {
  const fondos = freezeCatalogPair(proyecto.fondoIds, proyecto.fondos, catalogs.fondos);
  const lineas = freezeCatalogPair(proyecto.lineaIds, proyecto.lineas, catalogs.lineas);
  const sedes = freezeCatalogPair(proyecto.sedeIds, proyecto.sedes, catalogs.sedes);
  const escuelas = freezeCatalogPair(
    proyecto.escuelaIds,
    proyecto.escuelas,
    catalogs.escuelas,
  );
  const socios = freezeCatalogPair(proyecto.socioIds, proyecto.socios, catalogs.socios);
  const etiquetas = freezeCatalogPair(
    proyecto.etiquetaIds,
    proyecto.etiquetas,
    catalogs.etiquetas,
  );
  return {
    ...proyecto,
    fondoIds: fondos.ids,
    fondos: fondos.names,
    lineaIds: lineas.ids,
    lineas: lineas.names,
    sedeIds: sedes.ids,
    sedes: sedes.names,
    escuelaIds: escuelas.ids,
    escuelas: escuelas.names,
    socioIds: socios.ids,
    socios: socios.names,
    etiquetaIds: etiquetas.ids,
    etiquetas: etiquetas.names,
  };
}

export async function saveVitrinaProyectos(input: {
  proyectos: unknown;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const normalized = normalizeVitrinaProyectos(input.proyectos);
  if (!normalized.ok) {
    return { success: false, error: normalized.error };
  }

  try {
    const catalogs = await getVitrinaProjectCatalogs();
    const proyectos = normalized.proyectos.map((p) => freezeProyecto(p, catalogs));
    await upsertVitrinaProyectosRecords(proyectos);
    revalidatePath('/vitrina');
    return { success: true };
  } catch (e) {
    console.error('[vitrina] saveVitrinaProyectos', e);
    return { success: false, error: 'No se pudieron guardar los proyectos' };
  }
}

export async function upsertVitrinaProyecto(input: {
  proyecto: unknown;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const normalized = normalizeVitrinaProyectos(
    input.proyecto ? [input.proyecto] : [],
  );
  if (!normalized.ok) {
    return { success: false, error: normalized.error };
  }
  const proyecto = normalized.proyectos[0];
  if (!proyecto) {
    return { success: false, error: 'El nombre es obligatorio' };
  }

  try {
    const catalogs = await getVitrinaProjectCatalogs();
    await upsertVitrinaProyectoRecord(freezeProyecto(proyecto, catalogs));
    revalidatePath('/vitrina');
    return { success: true };
  } catch (e) {
    console.error('[vitrina] upsertVitrinaProyecto', e);
    return { success: false, error: 'No se pudo guardar el proyecto' };
  }
}

export async function deleteVitrinaProyecto(input: {
  id: string;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const id = typeof input.id === 'string' ? input.id.trim() : '';
  if (!id) {
    return { success: false, error: 'Proyecto no válido' };
  }

  try {
    const removed = await deleteVitrinaProyectoRecord(id);
    if (!removed) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    revalidatePath('/vitrina');
    return { success: true };
  } catch (e) {
    console.error('[vitrina] deleteVitrinaProyecto', e);
    return { success: false, error: 'No se pudo eliminar el proyecto' };
  }
}

export async function saveVitrinaProyectoCoverOffset(input: {
  id: string;
  coverOffsetX?: number;
  coverOffsetY?: number;
  coverZoom?: number;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const id = input.id?.trim();
  if (!id) {
    return { success: false, error: 'Proyecto no válido' };
  }

  try {
    const current = (await readVitrinaProyectos()).find((p) => p.id === id);
    if (!current) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    const updated = await updateVitrinaProyectoCover(id, {
      coverOffsetX: clampCoverOffset(
        input.coverOffsetX ?? current.coverOffsetX,
      ),
      coverOffsetY: clampCoverOffsetY(
        input.coverOffsetY ?? current.coverOffsetY,
      ),
      coverZoom: clampCoverZoom(input.coverZoom ?? current.coverZoom),
    });
    if (!updated) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    revalidatePath('/vitrina');
    return { success: true };
  } catch (e) {
    console.error('[vitrina] saveVitrinaProyectoCoverOffset', e);
    return { success: false, error: 'No se pudo guardar la posición' };
  }
}
