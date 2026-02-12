'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createHash } from 'crypto';
import { createHistorialEntry } from './historial';

export interface EvidenciaActividadData {
  id: string;
  url: string;
  publicId: string;
  tipo: 'image' | 'pdf';
  nombreArchivo: string | null;
  createdAt: Date;
}

export async function getEvidenciasActividad(actividadId: string) {
  try {
    const evidencias = await prisma.evidenciaActividad.findMany({
      where: { actividadId },
      orderBy: { createdAt: 'asc' },
    });
    return {
      success: true,
      data: evidencias as EvidenciaActividadData[],
    };
  } catch (error) {
    console.error('Error al obtener evidencias:', error);
    return { success: false, error: 'Error al obtener evidencias', data: [] };
  }
}

export async function createEvidenciaActividad(
  actividadId: string,
  data: {
    url: string;
    publicId: string;
    tipo: 'image' | 'pdf';
    nombreArchivo?: string;
  }
) {
  try {
    const activity = await prisma.activity.findUnique({
      where: { id: actividadId },
      select: { projectId: true, name: true },
    });
    if (!activity) {
      return { success: false, error: 'Actividad no encontrada' };
    }

    const evidencia = await prisma.evidenciaActividad.create({
      data: {
        actividadId,
        url: data.url,
        publicId: data.publicId,
        tipo: data.tipo,
        nombreArchivo: data.nombreArchivo ?? null,
      },
    });

    await createHistorialEntry({
      proyectoId: activity.projectId,
      accion: 'Subir evidencia',
      tabProyecto: 'Actividades',
      elementoEspecifico: `Actividad "${activity.name}"`,
      cambioGenerado: data.nombreArchivo
        ? `Evidencia subida: ${data.nombreArchivo}`
        : 'Nueva evidencia subida',
    });

    revalidatePath('/proyectos');
    return { success: true, data: evidencia as EvidenciaActividadData };
  } catch (error) {
    console.error('Error al crear evidencia:', error);
    return { success: false, error: 'Error al crear evidencia' };
  }
}

/**
 * Elimina un asset en Cloudinary (Admin API destroy).
 * resourceType: 'image' | 'raw'
 */
async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw'
): Promise<boolean> {
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
  const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`;
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
    console.error('Cloudinary destroy error:', res.status, err);
    return false;
  }
  return true;
}

export async function deleteEvidenciaActividad(id: string) {
  try {
    const evidencia = await prisma.evidenciaActividad.findUnique({
      where: { id },
      select: {
        publicId: true,
        tipo: true,
        actividad: { select: { projectId: true, name: true } },
        nombreArchivo: true,
      },
    });
    if (!evidencia) {
      return { success: false, error: 'Evidencia no encontrada' };
    }
    const resourceType = evidencia.tipo === 'pdf' ? 'raw' : 'image';
    await deleteFromCloudinary(evidencia.publicId, resourceType);
    await prisma.evidenciaActividad.delete({
      where: { id },
    });

    await createHistorialEntry({
      proyectoId: evidencia.actividad.projectId,
      accion: 'Eliminar evidencia',
      tabProyecto: 'Actividades',
      elementoEspecifico: `Actividad "${evidencia.actividad.name}"`,
      cambioGenerado: evidencia.nombreArchivo
        ? `Evidencia eliminada: ${evidencia.nombreArchivo}`
        : 'Evidencia eliminada',
    });

    revalidatePath('/proyectos');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar evidencia:', error);
    return { success: false, error: 'Error al eliminar evidencia' };
  }
}
