'use server';

import prisma from '@/lib/prisma';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requirePermission } from '@/lib/authz/guards';
import {
  isOptionalEmailValid,
  normalizeSocioComunitarioFields,
  socioComunitarioIsInUse,
} from '@/lib/socios-comunitarios';
import { applySocioNombreToVitrinaProyectos } from '@/lib/vitrina-proyectos';
import {
  readVitrinaProyectos,
  writeVitrinaProyectos,
} from '@/lib/vitrina-proyectos-store';

const CONFIG_PATH = '/configuracion/socios-comunitarios';

function revalidateSocioCatalog() {
  revalidatePath(CONFIG_PATH);
  revalidatePath('/proyectos');
  revalidatePath('/dashboard');
  revalidatePath('/vitrina');
  revalidateTag('proyectos');
  revalidateTag('proyectos-dashboard');
}

export type SocioComunitarioProyectoRef = {
  id: string;
  proyecto: string;
};

export type SocioComunitarioAdminRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  nombreContacto: string | null;
  email: string | null;
  proyectos: SocioComunitarioProyectoRef[];
};

export type SocioComunitarioAdminInput = {
  nombre: string;
  descripcion?: string | null;
  nombreContacto?: string | null;
  email?: string | null;
};

function validateInput(input: SocioComunitarioAdminInput): {
  ok: true;
  data: ReturnType<typeof normalizeSocioComunitarioFields>;
} | { ok: false; error: string } {
  const data = normalizeSocioComunitarioFields(input);
  if (!data.nombre) {
    return { ok: false, error: 'El nombre es obligatorio' };
  }
  if (!isOptionalEmailValid(data.email)) {
    return { ok: false, error: 'El email no es válido' };
  }
  return { ok: true, data };
}

export async function listSociosComunitariosAdmin(): Promise<{
  success: boolean;
  data?: SocioComunitarioAdminRow[];
  error?: string;
}> {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const socios = await prisma.socioComunitario.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        proyectos: {
          select: {
            proyecto: {
              select: { id: true, proyecto: true },
            },
          },
        },
      },
    });
    return {
      success: true,
      data: socios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        descripcion: s.descripcion,
        nombreContacto: s.nombreContacto,
        email: s.email,
        proyectos: s.proyectos.map((rel) => ({
          id: rel.proyecto.id,
          proyecto: rel.proyecto.proyecto,
        })),
      })),
    };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al obtener socios comunitarios' };
  }
}

export async function createSocioComunitarioAdmin(
  input: SocioComunitarioAdminInput
): Promise<{ success: boolean; error?: string }> {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  const parsed = validateInput(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  try {
    await prisma.socioComunitario.create({ data: parsed.data });
    revalidateSocioCatalog();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al crear socio comunitario' };
  }
}

export async function updateSocioComunitarioAdmin(
  id: string,
  input: SocioComunitarioAdminInput
): Promise<{ success: boolean; error?: string }> {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  if (!id) return { success: false, error: 'Socio no especificado' };

  const parsed = validateInput(input);
  if (!parsed.ok) return { success: false, error: parsed.error };

  try {
    const existing = await prisma.socioComunitario.findUnique({
      where: { id },
      select: { nombre: true },
    });
    if (!existing) {
      return { success: false, error: 'Socio no encontrado' };
    }

    await prisma.socioComunitario.update({
      where: { id },
      data: parsed.data,
    });

    if (existing.nombre !== parsed.data.nombre) {
      const vitrina = await readVitrinaProyectos();
      const synced = applySocioNombreToVitrinaProyectos(
        vitrina,
        id,
        parsed.data.nombre
      );
      if (synced.changed) {
        await writeVitrinaProyectos(synced.proyectos);
      }
    }

    revalidateSocioCatalog();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al actualizar socio comunitario' };
  }
}

export async function deleteSocioComunitarioAdmin(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requirePermission('view.ajustes');
  if (!gate.ok) return { success: false, error: gate.error };

  if (!id) return { success: false, error: 'Socio no especificado' };

  try {
    const [proyectos, participantes] = await Promise.all([
      prisma.proyectoSocioComunitario.count({
        where: { socioComunitarioId: id },
      }),
      prisma.proyectoParticipante.count({
        where: { socioComunitarioId: id },
      }),
    ]);
    if (socioComunitarioIsInUse({ proyectos, participantes })) {
      return {
        success: false,
        error:
          'No se puede eliminar: hay proyectos o participantes que usan este socio',
      };
    }
    await prisma.socioComunitario.delete({ where: { id } });
    revalidateSocioCatalog();
    return { success: true };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al eliminar socio comunitario' };
  }
}
