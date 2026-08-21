'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireProjectAccess } from '@/lib/authz/guards';
import {
  applyFilaPatch,
  describeFilaCambio,
  isEscalamientoNumero,
  mergePlanAccion,
  serializePlanAccion,
  type EscalamientoFila,
  type EscalamientoFilaPatch,
} from '@/lib/escalamiento-plan';
import { createHistorialEntry } from './historial';
import { getLineaTabFlagsForProyecto } from '@/lib/linea-modulos-db';

export type EscalamientoData = {
  filas: EscalamientoFila[];
};

async function assertLineaEscalamientoEnabled(
  fondoNombre: string,
  lineaNombre: string | null | undefined
) {
  const flags = await getLineaTabFlagsForProyecto(fondoNombre, lineaNombre);
  if (!flags?.tabEscalamientoEnabled) {
    return {
      ok: false as const,
      error:
        'El escalamiento no está habilitado para la línea de este proyecto',
    };
  }
  return { ok: true as const };
}

export async function getEscalamientoProyecto(proyectoId: string) {
  try {
    const [gate, proyecto] = await Promise.all([
      requireProjectAccess(proyectoId),
      prisma.proyecto.findUnique({
        where: { id: proyectoId },
        select: {
          id: true,
          fondo: true,
          linea: true,
          escalamiento: {
            select: {
              planAccion: true,
            },
          },
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

    const lineaGate = await assertLineaEscalamientoEnabled(
      proyecto.fondo,
      proyecto.linea
    );
    if (!lineaGate.ok) {
      return { success: false as const, error: lineaGate.error, data: null };
    }

    return {
      success: true as const,
      data: {
        filas: mergePlanAccion(proyecto.escalamiento?.planAccion),
      } satisfies EscalamientoData,
    };
  } catch (e) {
    console.error('[getEscalamientoProyecto]', e);
    return {
      success: false as const,
      error: 'Error al obtener escalamiento',
      data: null,
    };
  }
}

export async function updateEscalamientoFila(
  proyectoId: string,
  numero: number,
  patch: EscalamientoFilaPatch
) {
  try {
    const gate = await requireProjectAccess(proyectoId, 'projects.edit');
    if (!gate.ok) return { success: false as const, error: gate.error };

    if (!isEscalamientoNumero(numero)) {
      return { success: false as const, error: 'Número de acción inválido' };
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        fondo: true,
        linea: true,
        escalamiento: { select: { planAccion: true } },
      },
    });
    if (!proyecto) {
      return { success: false as const, error: 'Proyecto no encontrado' };
    }

    const lineaGate = await assertLineaEscalamientoEnabled(
      proyecto.fondo,
      proyecto.linea
    );
    if (!lineaGate.ok) {
      return { success: false as const, error: lineaGate.error };
    }

    const current = mergePlanAccion(proyecto.escalamiento?.planAccion);
    const applied = applyFilaPatch(current, numero, patch);
    if (!applied.ok) {
      return { success: false as const, error: applied.error };
    }

    const planAccion = serializePlanAccion(applied.filas) as object;

    await prisma.proyectoEscalamiento.upsert({
      where: { proyectoId },
      create: { proyectoId, planAccion },
      update: { planAccion },
    });

    const { elemento, cambio } = describeFilaCambio(numero, patch);
    await createHistorialEntry({
      proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Escalamiento',
      elementoEspecifico: elemento,
      cambioGenerado: cambio,
    });

    revalidatePath('/proyectos');
    return {
      success: true as const,
      data: { filas: applied.filas } satisfies EscalamientoData,
    };
  } catch (e) {
    console.error('[updateEscalamientoFila]', e);
    return {
      success: false as const,
      error: 'Error al guardar escalamiento',
    };
  }
}
