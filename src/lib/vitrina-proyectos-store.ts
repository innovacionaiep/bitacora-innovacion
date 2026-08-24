import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { VITRINA_PROYECTOS_MAX_FOTOS } from '@/lib/vitrina-proyectos';
import { mapVitrinaProyectoRow } from '@/lib/vitrina-proyectos-map';

const include = {
  fotos: { orderBy: { orden: 'asc' as const } },
  fondos: { include: { fondo: { select: { id: true, nombre: true } } } },
  lineas: { include: { linea: { select: { id: true, nombre: true } } } },
  sedes: { include: { sede: { select: { id: true, nombre: true } } } },
  escuelas: { include: { escuela: { select: { id: true, nombre: true } } } },
  socios: { include: { socio: { select: { id: true, nombre: true } } } },
  etiquetas: { include: { etiqueta: { select: { id: true, nombre: true } } } },
};

function scalars(proyecto: VitrinaProyecto) {
  return {
    nombre: proyecto.nombre,
    descripcion: proyecto.descripcion,
    encargadoNombre: proyecto.encargadoNombre,
    encargadoCorreo: proyecto.encargadoCorreo,
    encargadoCargo: proyecto.encargadoCargo,
    videoUrl: proyecto.videoUrl.trim() || null,
    coverOffsetX: proyecto.coverOffsetX,
    coverOffsetY: proyecto.coverOffsetY,
    coverZoom: proyecto.coverZoom,
    descripcionFontSize: proyecto.descripcionFontSize,
    igipInicial: proyecto.igipInicial,
    igipInicialComentario: proyecto.igipInicialComentario,
    igipProyeccion: proyecto.igipProyeccion,
    igipFinal: proyecto.igipFinal,
    igipFinalComentario: proyecto.igipFinalComentario,
    trlInicial: proyecto.trlInicial,
    trlInicialComentario: proyecto.trlInicialComentario,
    trlProyeccion: proyecto.trlProyeccion,
    trlFinal: proyecto.trlFinal,
    trlFinalComentario: proyecto.trlFinalComentario,
  };
}

async function persistProyecto(
  tx: Prisma.TransactionClient,
  proyecto: VitrinaProyecto,
  orden: number,
) {
  const data = { ...scalars(proyecto), orden };
  await tx.vitrinaProyecto.upsert({
    where: { id: proyecto.id },
    create: { id: proyecto.id, ...data },
    update: data,
  });

  await tx.vitrinaProyectoFoto.deleteMany({
    where: { vitrinaProyectoId: proyecto.id },
  });
  const fotos = proyecto.fotos.slice(0, VITRINA_PROYECTOS_MAX_FOTOS);
  if (fotos.length > 0) {
    await tx.vitrinaProyectoFoto.createMany({
      data: fotos.map((foto, index) => ({
        vitrinaProyectoId: proyecto.id,
        url: foto.url,
        publicId: foto.publicId,
        orden: index,
      })),
    });
  }

  await replaceJoins(tx, proyecto);
}

async function replaceJoins(
  tx: Prisma.TransactionClient,
  proyecto: VitrinaProyecto,
) {
  const id = proyecto.id;
  await tx.vitrinaProyectoFondo.deleteMany({ where: { vitrinaProyectoId: id } });
  await tx.vitrinaProyectoLinea.deleteMany({ where: { vitrinaProyectoId: id } });
  await tx.vitrinaProyectoSede.deleteMany({ where: { vitrinaProyectoId: id } });
  await tx.vitrinaProyectoEscuela.deleteMany({
    where: { vitrinaProyectoId: id },
  });
  await tx.vitrinaProyectoSocio.deleteMany({ where: { vitrinaProyectoId: id } });
  await tx.vitrinaProyectoEtiqueta.deleteMany({
    where: { vitrinaProyectoId: id },
  });

  if (proyecto.fondoIds.length > 0) {
    await tx.vitrinaProyectoFondo.createMany({
      data: uniqueIds(proyecto.fondoIds).map((fondoId) => ({
        vitrinaProyectoId: id,
        fondoId,
      })),
      skipDuplicates: true,
    });
  }
  if (proyecto.lineaIds.length > 0) {
    await tx.vitrinaProyectoLinea.createMany({
      data: uniqueIds(proyecto.lineaIds).map((lineaId) => ({
        vitrinaProyectoId: id,
        lineaId,
      })),
      skipDuplicates: true,
    });
  }
  if (proyecto.sedeIds.length > 0) {
    await tx.vitrinaProyectoSede.createMany({
      data: uniqueIds(proyecto.sedeIds).map((sedeId) => ({
        vitrinaProyectoId: id,
        sedeId,
      })),
      skipDuplicates: true,
    });
  }
  if (proyecto.escuelaIds.length > 0) {
    await tx.vitrinaProyectoEscuela.createMany({
      data: uniqueIds(proyecto.escuelaIds).map((escuelaId) => ({
        vitrinaProyectoId: id,
        escuelaId,
      })),
      skipDuplicates: true,
    });
  }
  if (proyecto.socioIds.length > 0) {
    await tx.vitrinaProyectoSocio.createMany({
      data: uniqueIds(proyecto.socioIds).map((socioComunitarioId) => ({
        vitrinaProyectoId: id,
        socioComunitarioId,
      })),
      skipDuplicates: true,
    });
  }
  if (proyecto.etiquetaIds.length > 0) {
    await tx.vitrinaProyectoEtiqueta.createMany({
      data: uniqueIds(proyecto.etiquetaIds).map((etiquetaId) => ({
        vitrinaProyectoId: id,
        etiquetaId,
      })),
      skipDuplicates: true,
    });
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export async function readVitrinaProyectos(): Promise<VitrinaProyecto[]> {
  try {
    const rows = await prisma.vitrinaProyecto.findMany({
      include,
      orderBy: [{ orden: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => mapVitrinaProyectoRow(row));
  } catch (e) {
    console.error('[vitrina] readVitrinaProyectos', e);
    return [];
  }
}

export async function upsertVitrinaProyectoRecord(
  proyecto: VitrinaProyecto,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.vitrinaProyecto.findUnique({
      where: { id: proyecto.id },
      select: { orden: true },
    });
    let orden = existing?.orden;
    if (orden === undefined) {
      const last = await tx.vitrinaProyecto.aggregate({
        _max: { orden: true },
      });
      orden = (last._max.orden ?? -1) + 1;
    }
    await persistProyecto(tx, proyecto, orden);
  });
}

export async function upsertVitrinaProyectosRecords(
  proyectos: VitrinaProyecto[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.vitrinaProyecto.findMany({
      select: { id: true, orden: true },
    });
    const ordenById = new Map(existing.map((row) => [row.id, row.orden]));
    let nextOrden =
      existing.reduce((max, row) => Math.max(max, row.orden), -1) + 1;
    for (const proyecto of proyectos) {
      const known = ordenById.get(proyecto.id);
      const orden = known ?? nextOrden++;
      await persistProyecto(tx, proyecto, orden);
    }
  });
}

export async function deleteVitrinaProyectoRecord(id: string): Promise<boolean> {
  const existing = await prisma.vitrinaProyecto.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.vitrinaProyecto.delete({ where: { id } });
  return true;
}

export async function updateVitrinaProyectoCover(
  id: string,
  cover: {
    coverOffsetX: number;
    coverOffsetY: number;
    coverZoom: number;
  },
): Promise<boolean> {
  const existing = await prisma.vitrinaProyecto.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return false;
  await prisma.vitrinaProyecto.update({
    where: { id },
    data: {
      coverOffsetX: cover.coverOffsetX,
      coverOffsetY: cover.coverOffsetY,
      coverZoom: cover.coverZoom,
    },
  });
  return true;
}
