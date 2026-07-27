/**
 * Upload cliente de convenios firmados (PDF / DOCX).
 * Sube vía API firmada del servidor a la carpeta Cloudinary `convenios`
 * (evita el preset unsigned de evidencias_actividades).
 * Máximo: 2 MB.
 */

import {
  CONVENIO_MAX_BYTES,
  CONVENIOS_FOLDER,
  DEFAULT_CONVENIO_BRUTO_FILENAME,
  DEFAULT_CONVENIO_BRUTO_PUBLIC_ID,
  DEFAULT_CONVENIO_BRUTO_URL,
} from '@/lib/convenios-constants';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export const ACCEPTED_PDF_TYPE = 'application/pdf';
export const ACCEPTED_DOCX_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const CONVENIO_ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export {
  CONVENIO_MAX_BYTES,
  CONVENIOS_FOLDER,
  DEFAULT_CONVENIO_BRUTO_FILENAME,
  DEFAULT_CONVENIO_BRUTO_PUBLIC_ID,
  DEFAULT_CONVENIO_BRUTO_URL,
} from '@/lib/convenios-constants';

export interface UploadConvenioResult {
  url: string;
  publicId: string;
  nombreArchivo: string;
}

function buildBrutoUrlFromPublicId(publicId: string): string {
  if (!CLOUD_NAME || !publicId) return '';
  const encoded = publicId
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${encoded}`;
}

export function getConvenioBrutoMetaClient(): {
  url: string;
  filename: string;
  publicId: string;
} {
  const publicId =
    process.env.NEXT_PUBLIC_CONVENIO_BRUTO_PUBLIC_ID?.trim() ||
    DEFAULT_CONVENIO_BRUTO_PUBLIC_ID;
  const filename =
    process.env.NEXT_PUBLIC_CONVENIO_BRUTO_FILENAME?.trim() ||
    DEFAULT_CONVENIO_BRUTO_FILENAME;
  const overrideUrl =
    process.env.NEXT_PUBLIC_CONVENIO_BRUTO_URL?.trim() ||
    DEFAULT_CONVENIO_BRUTO_URL;
  const url = overrideUrl || buildBrutoUrlFromPublicId(publicId);
  return { url, filename, publicId };
}

function isAcceptedConvenioFile(file: File): boolean {
  if (file.type === ACCEPTED_PDF_TYPE || file.type === ACCEPTED_DOCX_TYPE) {
    return true;
  }
  const lower = file.name.toLowerCase();
  return lower.endsWith('.pdf') || lower.endsWith('.docx');
}

/**
 * Sube un convenio firmado (PDF o DOCX) vía API server → Cloudinary carpeta convenios.
 */
export async function uploadConvenioFirmado(
  file: File,
  proyectoId: string
): Promise<UploadConvenioResult | { error: string }> {
  if (!isAcceptedConvenioFile(file)) {
    return { error: 'Solo se permiten archivos PDF o Word (.docx)' };
  }
  if (file.size > CONVENIO_MAX_BYTES) {
    return { error: 'El archivo no puede superar 2 MB' };
  }
  if (!proyectoId.trim()) {
    return { error: 'Proyecto inválido' };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('proyectoId', proyectoId);

  try {
    const response = await fetch('/api/convenios-upload', {
      method: 'POST',
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
      publicId?: string;
      nombreArchivo?: string;
      error?: string;
    };
    if (!response.ok) {
      return {
        error: data.error || 'Error al subir el convenio. Intenta de nuevo.',
      };
    }
    if (!data.url || !data.publicId) {
      return { error: 'Respuesta inválida al subir el convenio' };
    }
    return {
      url: data.url,
      publicId: data.publicId,
      nombreArchivo: data.nombreArchivo || file.name,
    };
  } catch {
    return { error: 'Error de conexión al subir el convenio' };
  }
}

/** Helper para descargar/ver vía proxy autenticado. */
export function buildCloudinaryDownloadUrl(
  url: string,
  filename: string,
  options?: { disposition?: 'attachment' | 'inline' }
): string {
  const disposition = options?.disposition ?? 'attachment';
  return `/api/cloudinary-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&disposition=${disposition}`;
}
