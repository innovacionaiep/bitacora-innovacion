'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
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

export type FondoEscalamientoConfig = {
  id: string;
  nombre: string;
  orden: number;
  escalamientoEnabled: boolean;
};

export type EscalamientoData = {
  filas: EscalamientoFila[];
};

async function assertFondoEscalamientoEnabled(fondoNombre: string) {
  const fondoOk = await prisma.fondo.findFirst({
    where: { nombre: fondoNombre, escalamientoEnabled: true },
    select: { id: true },
  });
  if (!fondoOk) {
    return {
      ok: false as const,
      error:
        'El escalamiento no está habilitado para el fondo de este proyecto',
    };
  }
  return { ok: true as const };
}

export async function getFondosEscalamientoConfig() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'No autenticado',
        data: [] as FondoEscalamientoConfig[],
      };
    }
    const canAjustes = await userHasPermission(
      user.availableRoles ?? [],
      'view.ajustes'
    );
    if (!canAjustes) {
      return {
        success: false,
        error: 'Sin permiso',
        data: [] as FondoEscalamientoConfig[],
      };
    }
    const fondos = await prisma.fondo.findMany({
      orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
      select: {
        id: true,
        nombre: true,
        orden: true,
        escalamientoEnabled: true,
      },
    });
    return { success: true, data: fondos as FondoEscalamientoConfig[] };
  } catch (e) {
    console.error('[getFondosEscalamientoConfig]', e);
    return {
      success: false,
      error: 'Error al obtener fondos',
      data: [] as FondoEscalamientoConfig[],
    };
  }
}

export async function setFondoEscalamientoEnabled(
  fondoId: string,
  enabled: boolean
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return { success: false, error: 'No autenticado' };
    }
    const canAjustes = await userHasPermission(
      user.availableRoles ?? [],
      'view.ajustes'
    );
    if (!canAjustes) {
      return { success: false, error: 'Sin permiso' };
    }
    await prisma.fondo.update({
      where: { id: fondoId },
      data: { escalamientoEnabled: enabled },
    });
    revalidatePath('/configuracion/escalamiento');
    revalidatePath('/proyectos');
    return { success: true };
  } catch (e) {
    console.error('[setFondoEscalamientoEnabled]', e);
    return { success: false, error: 'Error al actualizar fondo' };
  }
}

/** Nombres de fondos con escalamiento habilitado. */
export async function getNombresFondosConEscalamiento() {
  try {
    const fondos = await prisma.fondo.findMany({
      where: { escalamientoEnabled: true },
      select: { nombre: true },
    });
    return {
      success: true as const,
      data: fondos.map((f) => f.nombre),
    };
  } catch (e) {
    console.error('[getNombresFondosConEscalamiento]', e);
    return { success: false as const, error: 'Error', data: [] as string[] };
  }
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

    const fondoGate = await assertFondoEscalamientoEnabled(proyecto.fondo);
    if (!fondoGate.ok) {
      return { success: false as const, error: fondoGate.error, data: null };
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
        escalamiento: { select: { planAccion: true } },
      },
    });
    if (!proyecto) {
      return { success: false as const, error: 'Proyecto no encontrado' };
    }

    const fondoGate = await assertFondoEscalamientoEnabled(proyecto.fondo);
    if (!fondoGate.ok) {
      return { success: false as const, error: fondoGate.error };
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
