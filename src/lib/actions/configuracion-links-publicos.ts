'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz/guards';
import {
  canGeneratePublicLink,
  isPublicLinkActive,
  publicLinkAbsoluteUrl,
  resolvePublicLinkOrigin,
} from '@/lib/public-link';
import { newPublicLinkToken } from '@/lib/public-link-db';

const CONFIG_PATH = '/configuracion/links-publicos';

function prismaLinkError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (
    msg.includes("Cannot read properties of undefined") ||
    msg.includes('proyectoLinkPublico')
  ) {
    return 'Falta regenerar Prisma Client. Reinicia el servidor tras `pnpm exec prisma generate`.';
  }
  if (msg.includes('does not exist') || msg.includes('P2021')) {
    return 'Falta aplicar la migración de links públicos (`pnpm exec prisma migrate deploy`).';
  }
  return 'Error al generar el link público';
}

export type ProyectoNombreRow = {
  id: string;
  proyecto: string;
};

export type LinkPublicoActivo = {
  token: string;
  proyectoId: string;
  createdAt: Date;
  url: string;
};

export type LinkPublicoActivoRow = LinkPublicoActivo & {
  proyecto: string;
};

function toLinkPublicoActivo(row: {
  token: string;
  proyectoId: string;
  createdAt: Date;
}): LinkPublicoActivo {
  return {
    token: row.token,
    proyectoId: row.proyectoId,
    createdAt: row.createdAt,
    url: publicLinkAbsoluteUrl(
      resolvePublicLinkOrigin(process.env.NEXTAUTH_URL),
      row.token
    ),
  };
}

export async function listProyectosNombresLinksPublicos(): Promise<{
  success: boolean;
  data?: ProyectoNombreRow[];
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  try {
    const data = await prisma.proyecto.findMany({
      orderBy: { proyecto: 'asc' },
      select: { id: true, proyecto: true },
    });
    return { success: true, data };
  } catch (e) {
    console.error('[listProyectosNombresLinksPublicos]', e);
    return { success: false, error: 'Error al listar proyectos' };
  }
}

export async function listLinksPublicosActivos(): Promise<{
  success: boolean;
  data?: LinkPublicoActivoRow[];
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  try {
    const rows = await prisma.proyectoLinkPublico.findMany({
      where: { revokedAt: null },
      orderBy: { proyecto: { proyecto: 'asc' } },
      select: {
        token: true,
        proyectoId: true,
        createdAt: true,
        proyecto: { select: { proyecto: true } },
      },
    });
    return {
      success: true,
      data: rows.map((row) => ({
        ...toLinkPublicoActivo(row),
        proyecto: row.proyecto.proyecto,
      })),
    };
  } catch (e) {
    console.error('[listLinksPublicosActivos]', e);
    return { success: false, error: prismaLinkError(e) };
  }
}

export async function getLinkPublicoActivo(proyectoId: string): Promise<{
  success: boolean;
  data?: LinkPublicoActivo | null;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!proyectoId) {
    return { success: false, error: 'Proyecto no especificado' };
  }
  try {
    const link = await prisma.proyectoLinkPublico.findFirst({
      where: { proyectoId, revokedAt: null },
      select: { token: true, proyectoId: true, createdAt: true, revokedAt: true },
    });
    if (!isPublicLinkActive(link) || !link) {
      return { success: true, data: null };
    }
    return {
      success: true,
      data: toLinkPublicoActivo(link),
    };
  } catch (e) {
    console.error('[getLinkPublicoActivo]', e);
    return { success: false, error: prismaLinkError(e) };
  }
}

export async function generarLinkPublico(proyectoId: string): Promise<{
  success: boolean;
  data?: LinkPublicoActivo;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!proyectoId) {
    return { success: false, error: 'Proyecto no especificado' };
  }
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true },
    });
    if (!proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const existing = await prisma.proyectoLinkPublico.findFirst({
      where: { proyectoId, revokedAt: null },
      select: { id: true },
    });
    if (!canGeneratePublicLink(Boolean(existing))) {
      return {
        success: false,
        error: 'Este proyecto ya tiene un link público activo',
      };
    }

    const created = await prisma.proyectoLinkPublico.create({
      data: {
        token: newPublicLinkToken(),
        proyectoId,
        createdById: gate.user.id,
      },
      select: { token: true, proyectoId: true, createdAt: true },
    });
    revalidatePath(CONFIG_PATH);
    return { success: true, data: toLinkPublicoActivo(created) };
  } catch (e) {
    console.error('[generarLinkPublico]', e);
    return { success: false, error: prismaLinkError(e) };
  }
}

export async function caducarLinkPublico(proyectoId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  if (!proyectoId) {
    return { success: false, error: 'Proyecto no especificado' };
  }
  try {
    const updated = await prisma.proyectoLinkPublico.updateMany({
      where: { proyectoId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (updated.count === 0) {
      return { success: false, error: 'No hay un link público activo' };
    }
    revalidatePath(CONFIG_PATH);
    return { success: true };
  } catch (e) {
    console.error('[caducarLinkPublico]', e);
    return { success: false, error: 'Error al caducar el link público' };
  }
}
