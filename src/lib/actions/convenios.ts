'use server';

import { createHash } from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import { requireProjectAccess } from '@/lib/authz/guards';
import {
  DEFAULT_CONVENIO_BRUTO_FILENAME,
  DEFAULT_CONVENIO_BRUTO_PUBLIC_ID,
  DEFAULT_CONVENIO_BRUTO_URL,
} from '@/lib/convenios-constants';
import { createHistorialEntry } from './historial';
import { getLineaTabFlagsForProyecto } from '@/lib/linea-modulos-db';
import {
  convenioEnabledKeys,
  proyectoAplicaConvenio,
} from '@/lib/linea-modulos';

export type ConvenioDashboardRow = {
  id: string;
  proyecto: string;
  fondo: string;
  firmado: boolean;
  convenioFirmadoUrl: string | null;
  convenioFirmadoNombre: string | null;
  convenioFirmadoAt: Date | null;
};

async function deleteRawFromCloudinary(publicId: string): Promise<boolean> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    console.warn(
      'Cloudinary API key/secret no configurados; no se elimina el archivo en Cloudinary.'
    );
    return false;
  }
  const timestamp = Math.floor(Date.now() / 1000);
  const params = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash('sha1')
    .update(params + apiSecret)
    .digest('hex');
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/raw/destroy`;
  const body = new URLSearchParams({
    invalidate: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
    signature,
    api_key: apiKey,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Cloudinary destroy (convenio) error:', res.status, err);
    return false;
  }
  return true;
}

async function userCanAccessProyecto(
  proyectoId: string,
  userId: string,
  userEmail: string | null | undefined,
  availableRoles: readonly string[]
): Promise<boolean> {
  if (await userHasPermission(availableRoles, 'projects.view_all')) {
    return true;
  }
  const participacion = await prisma.proyectoParticipante.findFirst({
    where: {
      proyectoId,
      OR: [
        { userId },
        ...(userEmail
          ? [{ email: { equals: userEmail, mode: 'insensitive' as const } }]
          : []),
      ],
    },
    select: { id: true },
  });
  return Boolean(participacion);
}

async function getAccessibleProyectoIds(
  userId: string,
  userEmail: string | null | undefined,
  availableRoles: readonly string[]
): Promise<string[] | 'all'> {
  if (await userHasPermission(availableRoles, 'projects.view_all')) {
    return 'all';
  }
  const participaciones = await prisma.proyectoParticipante.findMany({
    where: {
      OR: [
        { userId },
        ...(userEmail
          ? [{ email: { equals: userEmail, mode: 'insensitive' as const } }]
          : []),
      ],
    },
    select: { proyectoId: true },
  });
  return [...new Set(participaciones.map((p) => p.proyectoId))];
}

export async function getConvenioBrutoMeta() {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const publicId =
    process.env.NEXT_PUBLIC_CONVENIO_BRUTO_PUBLIC_ID?.trim() ||
    DEFAULT_CONVENIO_BRUTO_PUBLIC_ID;
  const filename =
    process.env.NEXT_PUBLIC_CONVENIO_BRUTO_FILENAME?.trim() ||
    DEFAULT_CONVENIO_BRUTO_FILENAME;
  const overrideUrl =
    process.env.NEXT_PUBLIC_CONVENIO_BRUTO_URL?.trim() ||
    DEFAULT_CONVENIO_BRUTO_URL;
  const encodedPublicId = publicId
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  const url =
    overrideUrl ||
    (cloudName
      ? `https://res.cloudinary.com/${cloudName}/raw/upload/${encodedPublicId}`
      : '');
  return { success: true as const, data: { url, filename, publicId } };
}

async function assertProyectoConvenioEnabled(
  fondo: string,
  linea: string | null | undefined
) {
  const flags = await getLineaTabFlagsForProyecto(fondo, linea);
  if (!flags?.tabConvenioEnabled) {
    return {
      ok: false as const,
      error:
        'Los convenios no están habilitados para la línea de este proyecto',
    };
  }
  return { ok: true as const };
}

async function loadConvenioEnabledKeys() {
  const lineas = await prisma.linea.findMany({
    where: { tabConvenioEnabled: true },
    select: { nombre: true, fondo: { select: { nombre: true } } },
  });
  return convenioEnabledKeys(
    lineas.map((l) => ({
      nombre: l.nombre,
      fondoNombre: l.fondo.nombre,
      tabConvenioEnabled: true,
    }))
  );
}

export async function guardarConvenioFirmado(data: {
  proyectoId: string;
  url: string;
  publicId: string;
  nombreArchivo: string;
}) {
  try {
    const gate = await requireProjectAccess(data.proyectoId);
    if (!gate.ok) return { success: false, error: gate.error };
    const user = gate.user;

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: data.proyectoId },
      select: {
        id: true,
        fondo: true,
        linea: true,
        proyecto: true,
        convenioFirmadoPublicId: true,
      },
    });
    if (!proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    const lineaGate = await assertProyectoConvenioEnabled(
      proyecto.fondo,
      proyecto.linea
    );
    if (!lineaGate.ok) {
      return { success: false, error: lineaGate.error };
    }

    if (
      !data.url.startsWith('https://res.cloudinary.com/') ||
      !data.publicId.trim()
    ) {
      return { success: false, error: 'Archivo inválido' };
    }

    const prevPublicId = proyecto.convenioFirmadoPublicId;
    if (prevPublicId && prevPublicId !== data.publicId) {
      await deleteRawFromCloudinary(prevPublicId);
    }

    const updated = await prisma.proyecto.update({
      where: { id: data.proyectoId },
      data: {
        convenioFirmadoUrl: data.url,
        convenioFirmadoPublicId: data.publicId,
        convenioFirmadoNombre: data.nombreArchivo,
        convenioFirmadoAt: new Date(),
        convenioFirmadoByUserId: user.id,
      },
      select: {
        id: true,
        convenioFirmadoUrl: true,
        convenioFirmadoPublicId: true,
        convenioFirmadoNombre: true,
        convenioFirmadoAt: true,
        convenioFirmadoByUserId: true,
      },
    });

    await createHistorialEntry({
      proyectoId: data.proyectoId,
      accion: prevPublicId ? 'Reemplazar convenio firmado' : 'Subir convenio firmado',
      tabProyecto: 'Convenio',
      elementoEspecifico: data.nombreArchivo,
      cambioGenerado: '',
    });

    revalidatePath('/proyectos');
    revalidatePath('/dashboard');
    return { success: true, data: updated };
  } catch (e) {
    console.error('[guardarConvenioFirmado]', e);
    return { success: false, error: 'Error al guardar el convenio firmado' };
  }
}

export async function eliminarConvenioFirmado(proyectoId: string) {
  try {
    const gate = await requireProjectAccess(proyectoId);
    if (!gate.ok) return { success: false, error: gate.error };

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: {
        id: true,
        fondo: true,
        linea: true,
        convenioFirmadoPublicId: true,
        convenioFirmadoNombre: true,
        convenioFirmadoUrl: true,
      },
    });
    if (!proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }
    if (!proyecto.convenioFirmadoUrl && !proyecto.convenioFirmadoPublicId) {
      return { success: false, error: 'No hay convenio firmado para eliminar' };
    }

    const lineaGate = await assertProyectoConvenioEnabled(
      proyecto.fondo,
      proyecto.linea
    );
    if (!lineaGate.ok) {
      return { success: false, error: lineaGate.error };
    }

    if (proyecto.convenioFirmadoPublicId) {
      await deleteRawFromCloudinary(proyecto.convenioFirmadoPublicId);
    }

    await prisma.proyecto.update({
      where: { id: proyectoId },
      data: {
        convenioFirmadoUrl: null,
        convenioFirmadoPublicId: null,
        convenioFirmadoNombre: null,
        convenioFirmadoAt: null,
        convenioFirmadoByUserId: null,
      },
    });

    await createHistorialEntry({
      proyectoId,
      accion: 'Eliminar convenio firmado',
      tabProyecto: 'Convenio',
      elementoEspecifico: proyecto.convenioFirmadoNombre || 'convenio firmado',
      cambioGenerado: '',
    });

    revalidatePath('/proyectos');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (e) {
    console.error('[eliminarConvenioFirmado]', e);
    return { success: false, error: 'Error al eliminar el convenio firmado' };
  }
}

export async function getConveniosDashboard() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'No autenticado',
        data: [] as ConvenioDashboardRow[],
      };
    }
    const availableRoles = user.availableRoles ?? [];
    const userEmail = user.email;
    const canDash = await userHasPermission(availableRoles, 'view.dashboard');
    if (!canDash) {
      return {
        success: false,
        error: 'Sin permiso',
        data: [] as ConvenioDashboardRow[],
      };
    }

    const keys = await loadConvenioEnabledKeys();
    if (keys.size === 0) {
      return { success: true, data: [] as ConvenioDashboardRow[] };
    }

    const accessible = await getAccessibleProyectoIds(
      user.id,
      userEmail,
      availableRoles
    );

    const proyectos = await prisma.proyecto.findMany({
      where: {
        ...(accessible === 'all' ? {} : { id: { in: accessible } }),
      },
      select: {
        id: true,
        proyecto: true,
        fondo: true,
        linea: true,
        convenioFirmadoUrl: true,
        convenioFirmadoNombre: true,
        convenioFirmadoAt: true,
      },
      orderBy: { proyecto: 'asc' },
    });

    const data: ConvenioDashboardRow[] = proyectos
      .filter((p) => proyectoAplicaConvenio(p.fondo, p.linea, keys))
      .map((p) => ({
        id: p.id,
        proyecto: p.proyecto,
        fondo: p.fondo,
        firmado: Boolean(p.convenioFirmadoUrl),
        convenioFirmadoUrl: p.convenioFirmadoUrl,
        convenioFirmadoNombre: p.convenioFirmadoNombre,
        convenioFirmadoAt: p.convenioFirmadoAt,
      }));

    return { success: true, data };
  } catch (e) {
    console.error('[getConveniosDashboard]', e);
    return {
      success: false,
      error: 'Error al obtener convenios',
      data: [] as ConvenioDashboardRow[],
    };
  }
}

/** Convenios de proyectos de un fondo (panel Fondos). */
export async function getConveniosPorFondo(fondoNombre: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'No autenticado',
        data: [] as ConvenioDashboardRow[],
      };
    }
    const availableRoles = user.availableRoles ?? [];
    const userEmail = user.email;
    const canFondos = await userHasPermission(availableRoles, 'view.fondos');
    if (!canFondos) {
      return {
        success: false,
        error: 'Sin permiso',
        data: [] as ConvenioDashboardRow[],
      };
    }

    const nombre = fondoNombre?.trim();
    if (!nombre) {
      return {
        success: false,
        error: 'Fondo requerido',
        data: [] as ConvenioDashboardRow[],
      };
    }

    const fondo = await prisma.fondo.findFirst({
      where: { nombre },
      select: { id: true },
    });
    if (!fondo) {
      return {
        success: false,
        error: 'Fondo no encontrado',
        data: [] as ConvenioDashboardRow[],
      };
    }

    const keys = await loadConvenioEnabledKeys();

    const accessible = await getAccessibleProyectoIds(
      user.id,
      userEmail,
      availableRoles
    );

    const proyectos = await prisma.proyecto.findMany({
      where: {
        fondo: nombre,
        ...(accessible === 'all' ? {} : { id: { in: accessible } }),
      },
      select: {
        id: true,
        proyecto: true,
        fondo: true,
        linea: true,
        convenioFirmadoUrl: true,
        convenioFirmadoNombre: true,
        convenioFirmadoAt: true,
      },
      orderBy: { proyecto: 'asc' },
    });

    const data: ConvenioDashboardRow[] = proyectos
      .filter((p) => proyectoAplicaConvenio(p.fondo, p.linea, keys))
      .map((p) => ({
        id: p.id,
        proyecto: p.proyecto,
        fondo: p.fondo,
        firmado: Boolean(p.convenioFirmadoUrl),
        convenioFirmadoUrl: p.convenioFirmadoUrl,
        convenioFirmadoNombre: p.convenioFirmadoNombre,
        convenioFirmadoAt: p.convenioFirmadoAt,
      }));

    return { success: true, data };
  } catch (e) {
    console.error('[getConveniosPorFondo]', e);
    return {
      success: false,
      error: 'Error al obtener convenios del fondo',
      data: [] as ConvenioDashboardRow[],
    };
  }
}
