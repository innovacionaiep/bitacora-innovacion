'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createHash } from 'crypto';

export interface EvidenciaIndicadorData {
  id: string;
  url: string;
  publicId: string;
  tipo: 'image' | 'pdf';
  nombreArchivo: string | null;
  createdAt: Date;
}

export async function getEvidenciasIndicador(indicadorId: string) {
  try {
    const evidencias = await prisma.evidenciaIndicador.findMany({
      where: { indicadorId },
      orderBy: { createdAt: 'asc' },
    });
    return {
      success: true,
      data: evidencias as EvidenciaIndicadorData[],
    };
  } catch (error) {
    console.error('Error al obtener evidencias del indicador:', error);
    return { success: false, error: 'Error al obtener evidencias', data: [] };
  }
}

export async function createEvidenciaIndicador(
  indicadorId: string,
  data: {
    url: string;
    publicId: string;
    tipo: 'image' | 'pdf';
    nombreArchivo?: string;
  }
) {
  try {
    const indicador = await prisma.indicador.findUnique({
      where: { id: indicadorId },
      select: { id: true },
    });
    if (!indicador) {
      return { success: false, error: 'Indicador no encontrado' };
    }

    const evidencia = await prisma.evidenciaIndicador.create({
      data: {
        indicadorId,
        url: data.url,
        publicId: data.publicId,
        tipo: data.tipo,
        nombreArchivo: data.nombreArchivo ?? null,
      },
    });
    revalidatePath('/proyectos');
    return { success: true, data: evidencia as EvidenciaIndicadorData };
  } catch (error) {
    console.error('Error al crear evidencia del indicador:', error);
    return { success: false, error: 'Error al crear evidencia' };
  }
}

async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'raw'
): Promise<boolean> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
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
  if (!res.ok) return false;
  return true;
}

export async function deleteEvidenciaIndicador(id: string) {
  try {
    const evidencia = await prisma.evidenciaIndicador.findUnique({
      where: { id },
      select: { publicId: true, tipo: true },
    });
    if (!evidencia) {
      return { success: false, error: 'Evidencia no encontrada' };
    }
    const resourceType = evidencia.tipo === 'pdf' ? 'raw' : 'image';
    await deleteFromCloudinary(evidencia.publicId, resourceType);
    await prisma.evidenciaIndicador.delete({
      where: { id },
    });
    revalidatePath('/proyectos');
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar evidencia del indicador:', error);
    return { success: false, error: 'Error al eliminar evidencia' };
  }
}
