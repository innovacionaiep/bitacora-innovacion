import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { VITRINA_PROYECTOS_MAX_FOTOS, VITRINA_UPSERT_TX_OPTIONS, catalogIdSetsDiffer, vitrinaFotosDiffer } from '@/lib/vitrina-proyectos';
import { mapVitrinaProyectoRow } from '@/lib/vitrina-proyectos-map';

const include = {
  fotos: { orderBy: { orden: 'asc' as const } },
  fondos: { include: { fondo: { select: { id: true, nombre: true } } } },
  lineas: { include: { linea: { select: { id: true, nombre: true } } } },
  sedes: { include: { sede: { select: { id: true, nombre: true } } } },
  escuelas: { include: { escuela: { select: { id: true, nombre: true } } } },
  socios: { include: { socio: { select: { id: true, nombre: true } } } },
  comunas: { include: { comuna: { select: { id: true, nombre: true } } } },
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
    igipInicialOriginalidad: proyecto.igipInicialOriginalidad,
    igipInicialEstadoDelArte: proyecto.igipInicialEstadoDelArte,
    igipInicialContribucionSocial: proyecto.igipInicialContribucionSocial,
    igipInicialContribucionConocimiento:
      proyecto.igipInicialContribucionConocimiento,
    igipInicialPotencialExpansion: proyecto.igipInicialPotencialExpansion,
    igipInicialTransferenciaTecnologica:
      proyecto.igipInicialTransferenciaTecnologica,
    igipProyeccionOriginalidad: proyecto.igipProyeccionOriginalidad,
    igipProyeccionEstadoDelArte: proyecto.igipProyeccionEstadoDelArte,
    igipProyeccionContribucionSocial: proyecto.igipProyeccionContribucionSocial,
    igipProyeccionContribucionConocimiento:
      proyecto.igipProyeccionContribucionConocimiento,
    igipProyeccionPotencialExpansion: proyecto.igipProyeccionPotencialExpansion,
    igipProyeccionTransferenciaTecnologica:
      proyecto.igipProyeccionTransferenciaTecnologica,
    igipFinalOriginalidad: proyecto.igipFinalOriginalidad,
    igipFinalEstadoDelArte: proyecto.igipFinalEstadoDelArte,
    igipFinalContribucionSocial: proyecto.igipFinalContribucionSocial,
    igipFinalContribucionConocimiento:
      proyecto.igipFinalContribucionConocimiento,
    igipFinalPotencialExpansion: proyecto.igipFinalPotencialExpansion,
    igipFinalTransferenciaTecnologica:
      proyecto.igipFinalTransferenciaTecnologica,
    trlInicial: proyecto.trlInicial,
    trlInicialComentario: proyecto.trlInicialComentario,
    trlProyeccion: proyecto.trlProyeccion,
    trlFinal: proyecto.trlFinal,
    trlFinalComentario: proyecto.trlFinalComentario,
  };
}

type ExistingJoins = {
  fotos: Array<{ url: string; publicId: string }>;
  fondos: Array<{ fondoId: string }>;
  lineas: Array<{ lineaId: string }>;
  sedes: Array<{ sedeId: string }>;
  escuelas: Array<{ escuelaId: string }>;
  socios: Array<{ socioComunitarioId: string }>;
  comunas: Array<{ comunaId: string }>;
  etiquetas: Array<{ etiquetaId: string }>;
};

const joinSelect = {
  orden: true,
  fotos: {
    select: { url: true, publicId: true },
    orderBy: { orden: 'asc' as const },
  },
  fondos: { select: { fondoId: true } },
  lineas: { select: { lineaId: true } },
  sedes: { select: { sedeId: true } },
  escuelas: { select: { escuelaId: true } },
  socios: { select: { socioComunitarioId: true } },
  comunas: { select: { comunaId: true } },
  etiquetas: { select: { etiquetaId: true } },
} as const;

async function persistProyecto(
  tx: Prisma.TransactionClient,
  proyecto: VitrinaProyecto,
  orden: number,
  existing: ExistingJoins | null,
) {
  const data = { ...scalars(proyecto), orden };
  const id = proyecto.id;
  await tx.vitrinaProyecto.upsert({
    where: { id },
    create: { id, ...data },
    update: data,
  });

  const fotos = proyecto.fotos.slice(0, VITRINA_PROYECTOS_MAX_FOTOS);
  const deletes: Prisma.PrismaPromise<unknown>[] = [];
  const creates: Prisma.PrismaPromise<unknown>[] = [];

  const syncJoin = (
    changed: boolean,
    deleteOp: Prisma.PrismaPromise<unknown>,
    createOp: Prisma.PrismaPromise<unknown> | null,
  ) => {
    if (!changed) return;
    if (existing) deletes.push(deleteOp);
    if (createOp) creates.push(createOp);
  };

  syncJoin(
    vitrinaFotosDiffer(existing?.fotos ?? [], fotos),
    tx.vitrinaProyectoFoto.deleteMany({ where: { vitrinaProyectoId: id } }),
    fotos.length > 0
      ? tx.vitrinaProyectoFoto.createMany({
          data: fotos.map((foto, index) => ({
            vitrinaProyectoId: id,
            url: foto.url,
            publicId: foto.publicId,
            orden: index,
          })),
        })
      : null,
  );
  syncJoin(
    catalogIdSetsDiffer(
      (existing?.fondos ?? []).map((row) => row.fondoId),
      proyecto.fondoIds,
    ),
    tx.vitrinaProyectoFondo.deleteMany({ where: { vitrinaProyectoId: id } }),
    proyecto.fondoIds.length > 0
      ? tx.vitrinaProyectoFondo.createMany({
          data: uniqueIds(proyecto.fondoIds).map((fondoId) => ({
            vitrinaProyectoId: id,
            fondoId,
          })),
          skipDuplicates: true,
        })
      : null,
  );
  syncJoin(
    catalogIdSetsDiffer(
      (existing?.lineas ?? []).map((row) => row.lineaId),
      proyecto.lineaIds,
    ),
    tx.vitrinaProyectoLinea.deleteMany({ where: { vitrinaProyectoId: id } }),
    proyecto.lineaIds.length > 0
      ? tx.vitrinaProyectoLinea.createMany({
          data: uniqueIds(proyecto.lineaIds).map((lineaId) => ({
            vitrinaProyectoId: id,
            lineaId,
          })),
          skipDuplicates: true,
        })
      : null,
  );
  syncJoin(
    catalogIdSetsDiffer(
      (existing?.sedes ?? []).map((row) => row.sedeId),
      proyecto.sedeIds,
    ),
    tx.vitrinaProyectoSede.deleteMany({ where: { vitrinaProyectoId: id } }),
    proyecto.sedeIds.length > 0
      ? tx.vitrinaProyectoSede.createMany({
          data: uniqueIds(proyecto.sedeIds).map((sedeId) => ({
            vitrinaProyectoId: id,
            sedeId,
          })),
          skipDuplicates: true,
        })
      : null,
  );
  syncJoin(
    catalogIdSetsDiffer(
      (existing?.escuelas ?? []).map((row) => row.escuelaId),
      proyecto.escuelaIds,
    ),
    tx.vitrinaProyectoEscuela.deleteMany({ where: { vitrinaProyectoId: id } }),
    proyecto.escuelaIds.length > 0
      ? tx.vitrinaProyectoEscuela.createMany({
          data: uniqueIds(proyecto.escuelaIds).map((escuelaId) => ({
            vitrinaProyectoId: id,
            escuelaId,
          })),
          skipDuplicates: true,
        })
      : null,
  );
  syncJoin(
    catalogIdSetsDiffer(
      (existing?.socios ?? []).map((row) => row.socioComunitarioId),
      proyecto.socioIds,
    ),
    tx.vitrinaProyectoSocio.deleteMany({ where: { vitrinaProyectoId: id } }),
    proyecto.socioIds.length > 0
      ? tx.vitrinaProyectoSocio.createMany({
          data: uniqueIds(proyecto.socioIds).map((socioComunitarioId) => ({
            vitrinaProyectoId: id,
            socioComunitarioId,
          })),
          skipDuplicates: true,
        })
      : null,
  );
  syncJoin(
    catalogIdSetsDiffer(
      (existing?.comunas ?? []).map((row) => row.comunaId),
      proyecto.comunaIds,
    ),
    tx.vitrinaProyectoComuna.deleteMany({ where: { vitrinaProyectoId: id } }),
    proyecto.comunaIds.length > 0
      ? tx.vitrinaProyectoComuna.createMany({
          data: uniqueIds(proyecto.comunaIds).map((comunaId) => ({
            vitrinaProyectoId: id,
            comunaId,
          })),
          skipDuplicates: true,
        })
      : null,
  );
  syncJoin(
    catalogIdSetsDiffer(
      (existing?.etiquetas ?? []).map((row) => row.etiquetaId),
      proyecto.etiquetaIds,
    ),
    tx.vitrinaProyectoEtiqueta.deleteMany({ where: { vitrinaProyectoId: id } }),
    proyecto.etiquetaIds.length > 0
      ? tx.vitrinaProyectoEtiqueta.createMany({
          data: uniqueIds(proyecto.etiquetaIds).map((etiquetaId) => ({
            vitrinaProyectoId: id,
            etiquetaId,
          })),
          skipDuplicates: true,
        })
      : null,
  );

  if (deletes.length > 0) await Promise.all(deletes);
  if (creates.length > 0) await Promise.all(creates);
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
      select: joinSelect,
    });
    let orden = existing?.orden;
    if (orden === undefined) {
      const last = await tx.vitrinaProyecto.aggregate({
        _max: { orden: true },
      });
      orden = (last._max.orden ?? -1) + 1;
    }
    await persistProyecto(tx, proyecto, orden, existing);
  }, VITRINA_UPSERT_TX_OPTIONS);
}

export async function upsertVitrinaProyectosRecords(
  proyectos: VitrinaProyecto[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.vitrinaProyecto.findMany({
      select: { id: true, ...joinSelect },
    });
    const ordenById = new Map(existing.map((row) => [row.id, row.orden]));
    const joinsById = new Map(existing.map((row) => [row.id, row]));
    let nextOrden =
      existing.reduce((max, row) => Math.max(max, row.orden), -1) + 1;
    for (const proyecto of proyectos) {
      const known = ordenById.get(proyecto.id);
      const orden = known ?? nextOrden++;
      await persistProyecto(
        tx,
        proyecto,
        orden,
        joinsById.get(proyecto.id) ?? null,
      );
    }
  }, VITRINA_UPSERT_TX_OPTIONS);
}

export async function readVitrinaProyectoCoverById(id: string) {
  return prisma.vitrinaProyecto.findUnique({
    where: { id },
    select: {
      id: true,
      coverOffsetX: true,
      coverOffsetY: true,
      coverZoom: true,
    },
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
