'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import { requireProjectAccess } from '@/lib/authz/guards';
import { createHistorialEntry } from './historial';

export type FondoEscalamientoConfig = {
  id: string;
  nombre: string;
  orden: number;
  escalamientoEnabled: boolean;
};

export type EscalamientoCampo =
  | 'nuevaInstancia1'
  | 'nuevaInstancia2'
  | 'acuerdoContinuidad';

export type EscalamientoData = {
  nuevaInstancia1: string;
  nuevaInstancia2: string;
  acuerdoContinuidad: string;
};

const CAMPO_LABELS: Record<EscalamientoCampo, string> = {
  nuevaInstancia1: 'Nuevas instancias potenciales identificadas (1)',
  nuevaInstancia2: 'Nuevas instancias potenciales identificadas (2)',
  acuerdoContinuidad: 'Acuerdos o compromisos de continuidad o expansión',
};

function truncateCambio(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'contenido vaciado';
  return trimmed.length > 120
    ? `${trimmed.slice(0, 120)}…`
    : trimmed;
}

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
    const gate = await requireProjectAccess(proyectoId);
    if (!gate.ok) {
      return { success: false as const, error: gate.error, data: null };
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, fondo: true },
    });
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

    const row = await prisma.proyectoEscalamiento.findUnique({
      where: { proyectoId },
      select: {
        nuevaInstancia1: true,
        nuevaInstancia2: true,
        acuerdoContinuidad: true,
      },
    });

    return {
      success: true as const,
      data: {
        nuevaInstancia1: row?.nuevaInstancia1 ?? '',
        nuevaInstancia2: row?.nuevaInstancia2 ?? '',
        acuerdoContinuidad: row?.acuerdoContinuidad ?? '',
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

export async function updateEscalamientoCampo(
  proyectoId: string,
  field: EscalamientoCampo,
  value: string
) {
  try {
    const gate = await requireProjectAccess(proyectoId, 'projects.edit');
    if (!gate.ok) return { success: false as const, error: gate.error };

    if (!CAMPO_LABELS[field]) {
      return { success: false as const, error: 'Campo inválido' };
    }

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, fondo: true },
    });
    if (!proyecto) {
      return { success: false as const, error: 'Proyecto no encontrado' };
    }

    const fondoGate = await assertFondoEscalamientoEnabled(proyecto.fondo);
    if (!fondoGate.ok) {
      return { success: false as const, error: fondoGate.error };
    }

    const trimmed = value.trim();
    const fieldValue = trimmed || null;

    await prisma.proyectoEscalamiento.upsert({
      where: { proyectoId },
      create: {
        proyectoId,
        nuevaInstancia1: field === 'nuevaInstancia1' ? fieldValue : null,
        nuevaInstancia2: field === 'nuevaInstancia2' ? fieldValue : null,
        acuerdoContinuidad:
          field === 'acuerdoContinuidad' ? fieldValue : null,
      },
      update: { [field]: fieldValue },
    });

    await createHistorialEntry({
      proyectoId,
      accion: 'Actualizar',
      tabProyecto: 'Escalamiento',
      elementoEspecifico: CAMPO_LABELS[field],
      cambioGenerado: truncateCambio(trimmed),
    });

    revalidatePath('/proyectos');
    return {
      success: true as const,
      data: {
        field,
        value: trimmed,
      },
    };
  } catch (e) {
    console.error('[updateEscalamientoCampo]', e);
    return {
      success: false as const,
      error: 'Error al guardar escalamiento',
    };
  }
}
