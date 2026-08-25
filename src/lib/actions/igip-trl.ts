'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireProjectAccess } from '@/lib/authz/guards';
import { getLineaTabFlagsForProyecto } from '@/lib/linea-modulos-db';
import {
  describeIgipTrlCambio,
  emptyIgipTrlData,
  validateIgipTrlPatch,
  type IgipTrlData,
  type IgipTrlPatch,
} from '@/lib/igip-trl';
import { createHistorialEntry } from './historial';

const LINEA_DISABLED_ERROR =
  'IGIP-TRL no está habilitado para la línea de este proyecto';

async function assertLineaIgipTrlEnabled(
  fondoNombre: string,
  lineaNombre: string | null | undefined
) {
  const flags = await getLineaTabFlagsForProyecto(fondoNombre, lineaNombre);
  if (!flags?.tabIgipTrlEnabled) {
    return { ok: false as const, error: LINEA_DISABLED_ERROR };
  }
  return { ok: true as const };
}

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  if (
    typeof value === 'object' &&
    value !== null &&
    'toNumber' in value &&
    typeof (value as { toNumber: unknown }).toNumber === 'function'
  ) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function rowToData(row: {
  originalidad: number | null;
  estadoDelArte: number | null;
  contribucionSocial: number | null;
  contribucionConocimiento: number | null;
  potencialExpansion: number | null;
  transferenciaTecnologica: number | null;
  igip: unknown;
  trl: number | null;
} | null): IgipTrlData {
  if (!row) return emptyIgipTrlData();
  return {
    originalidad: row.originalidad,
    estadoDelArte: row.estadoDelArte,
    contribucionSocial: row.contribucionSocial,
    contribucionConocimiento: row.contribucionConocimiento,
    potencialExpansion: row.potencialExpansion,
    transferenciaTecnologica: row.transferenciaTecnologica,
    igip: decimalToNumber(row.igip),
    trl: row.trl,
  };
}

function applyPatch(current: IgipTrlData, patch: IgipTrlPatch): IgipTrlData {
  const next = { ...current };
  for (const key of Object.keys(patch) as (keyof IgipTrlPatch)[]) {
    if (patch[key] !== undefined) {
      (next[key] as number | null) = patch[key] as number | null;
    }
  }
  return next;
}

const IGIP_SELECT = {
  originalidad: true,
  estadoDelArte: true,
  contribucionSocial: true,
  contribucionConocimiento: true,
  potencialExpansion: true,
  transferenciaTecnologica: true,
  igip: true,
  trl: true,
} as const;

export async function getIgipTrlProyecto(proyectoId: string) {
  try {
    const [gate, proyecto] = await Promise.all([
      requireProjectAccess(proyectoId, 'view.proyectos'),
      prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          fondo: true,
          linea: true,
          igipTrl: { select: IGIP_SELECT },
        },
      }),
    ]);
    if (!gate.ok) {
      return { success: false as const, error: gate.error, data: null };
    }
    if (!proyecto) {
      return {
        success: false as const,
        error: 'Proyecto no encontrado',
        data: null,
      };
    }

    const lineaGate = await assertLineaIgipTrlEnabled(
      proyecto.fondo,
      proyecto.linea
    );
    if (!lineaGate.ok) {
      return { success: false as const, error: lineaGate.error, data: null };
    }

    return {
      success: true as const,
      data: rowToData(proyecto.igipTrl),
    };
  } catch (e) {
    console.error('[getIgipTrlProyecto]', e);
    return {
      success: false as const,
      error: 'Error al obtener IGIP-TRL',
      data: null,
    };
  }
}

export async function upsertIgipTrlProyecto(
  proyectoId: string,
  patch: IgipTrlPatch
) {
  try {
    const gate = await requireProjectAccess(proyectoId, 'view.proyectos');
    if (!gate.ok) return { success: false as const, error: gate.error };

    const parsed = validateIgipTrlPatch(patch);
    if (!parsed.ok) {
      return { success: false as const, error: parsed.error };
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        fondo: true,
        linea: true,
        igipTrl: { select: IGIP_SELECT },
      },
    });
    if (!proyecto) {
      return { success: false as const, error: 'Proyecto no encontrado' };
    }

    const lineaGate = await assertLineaIgipTrlEnabled(
      proyecto.fondo,
      proyecto.linea
    );
    if (!lineaGate.ok) {
      return { success: false as const, error: lineaGate.error };
    }

    const next = applyPatch(rowToData(proyecto.igipTrl), patch);
    const persist = {
      originalidad: next.originalidad,
      estadoDelArte: next.estadoDelArte,
      contribucionSocial: next.contribucionSocial,
      contribucionConocimiento: next.contribucionConocimiento,
      potencialExpansion: next.potencialExpansion,
      transferenciaTecnologica: next.transferenciaTecnologica,
      igip: next.igip,
      trl: next.trl,
    };

    await prisma.proyectoIgip.upsert({
      where: { proyectoId },
      create: { proyectoId, ...persist },
      update: persist,
    });

    const { elemento, cambio } = describeIgipTrlCambio(patch);
    await createHistorialEntry({
      proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'IGIP-TRL',
      elementoEspecifico: elemento,
      cambioGenerado: cambio,
    });

    revalidatePath('/proyectos');
    return { success: true as const, data: next };
  } catch (e) {
    console.error('[upsertIgipTrlProyecto]', e);
    return {
      success: false as const,
      error: 'Error al guardar IGIP-TRL',
    };
  }
}
