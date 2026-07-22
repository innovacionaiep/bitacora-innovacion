'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { revalidatePath } from 'next/cache';
import { createHistorialEntry } from './historial';

const ROLE_PRIORITY = [
  'Encargado',
  'Coordinador',
  'Colaborador',
  'Docente',
  'Estudiante',
  'Beneficiario',
] as const;

function pickPrimaryRole(roles: string[]): string | null {
  if (roles.length === 0) return null;
  const sorted = [...roles].sort((a, b) => {
    const ia = ROLE_PRIORITY.indexOf(a as (typeof ROLE_PRIORITY)[number]);
    const ib = ROLE_PRIORITY.indexOf(b as (typeof ROLE_PRIORITY)[number]);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
  return sorted[0] ?? null;
}

async function resolveRolesForUsers(
  proyectoId: string,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const uniqueIds = [...new Set(userIds)];
  const map = new Map<string, string | null>();
  if (uniqueIds.length === 0) return map;

  const [participaciones, adminRoles] = await Promise.all([
    prisma.proyectoParticipante.findMany({
      where: { proyectoId, userId: { in: uniqueIds } },
      select: { userId: true, rol: true },
    }),
    prisma.userRole.findMany({
      where: { userId: { in: uniqueIds }, role: 'Admin' },
      select: { userId: true },
    }),
  ]);

  const rolesByUser = new Map<string, string[]>();
  for (const p of participaciones) {
    const list = rolesByUser.get(p.userId) ?? [];
    list.push(p.rol);
    rolesByUser.set(p.userId, list);
  }

  const adminSet = new Set(adminRoles.map((r) => r.userId));

  for (const userId of uniqueIds) {
    const primary = pickPrimaryRole(rolesByUser.get(userId) ?? []);
    if (primary) {
      map.set(userId, primary);
    } else if (adminSet.has(userId)) {
      map.set(userId, 'Admin');
    } else {
      map.set(userId, null);
    }
  }

  return map;
}

export interface ComentarioActividadData {
  id: string;
  contenido: string;
  createdAt: Date;
  updatedAt: Date;
  /** Rol del autor en el proyecto (o Admin si aplica) */
  rolEnProyecto: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

export async function getComentariosActividad(actividadId: string) {
  try {
    const actividad = await prisma.activity.findUnique({
      where: { id: actividadId },
      select: { projectId: true },
    });

    const comentarios = await prisma.comentarioActividad.findMany({
      where: {
        actividadId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const roleMap = actividad
      ? await resolveRolesForUsers(
          actividad.projectId,
          comentarios.map((c) => c.user.id)
        )
      : new Map<string, string | null>();

    const data: ComentarioActividadData[] = comentarios.map((c) => ({
      ...c,
      rolEnProyecto: roleMap.get(c.user.id) ?? null,
    }));

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error al obtener comentarios:', error);
    return {
      success: false,
      error: 'Error al obtener comentarios',
      data: [] as ComentarioActividadData[],
    };
  }
}

export async function createComentarioActividad(
  actividadId: string,
  contenido: string
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: 'Usuario no autenticado',
      };
    }

    const actividad = await prisma.activity.findUnique({
      where: { id: actividadId },
      select: {
        name: true,
        projectId: true,
      },
    });

    if (!actividad) {
      return {
        success: false,
        error: 'Actividad no encontrada',
      };
    }

    const comentario = await prisma.comentarioActividad.create({
      data: {
        actividadId,
        userId: user.id,
        contenido,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    await createHistorialEntry({
      proyectoId: actividad.projectId,
      accion: 'Comentar',
      tabProyecto: 'Actividades',
      elementoEspecifico: `Actividad "${actividad.name}"`,
      cambioGenerado: contenido,
    });

    const roleMap = await resolveRolesForUsers(actividad.projectId, [
      comentario.user.id,
    ]);

    const data: ComentarioActividadData = {
      ...comentario,
      rolEnProyecto: roleMap.get(comentario.user.id) ?? null,
    };

    revalidatePath('/proyectos');
    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error('Error al crear comentario:', error);
    return {
      success: false,
      error: 'Error al crear comentario',
    };
  }
}
