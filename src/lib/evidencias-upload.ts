/**
 * Utilidad cliente para subir evidencias (imágenes y PDF).
 * Imágenes: compresión a máximo 250 KB, luego POST a /api/evidencias-upload.
 * PDF: máximo 2 MB. El servidor hace el upload firmado a Cloudinary.
 */

import {
  MAX_IMAGE_BYTES,
  compressImageToMaxKb,
  jpegUploadName,
} from '@/lib/compress-image';
import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPE,
  EVIDENCIAS_UPLOAD_PATH,
  MAX_PDF_BYTES,
} from '@/lib/evidencias-constants';

export {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_PDF_TYPE,
} from '@/lib/evidencias-constants';

export interface UploadEvidenciaResult {
  url: string;
  publicId: string;
  tipo: 'image' | 'pdf';
  nombreArchivo?: string;
}

async function postEvidenciaFile(
  file: File,
  fallbackNombre: string,
  connectionError: string,
  fallbackHttpError: string,
): Promise<UploadEvidenciaResult | { error: string }> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(EVIDENCIAS_UPLOAD_PATH, {
      method: 'POST',
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as {
      url?: string;
      publicId?: string;
      tipo?: 'image' | 'pdf';
      nombreArchivo?: string;
      error?: string;
    };
    if (!response.ok) {
      return { error: data.error || fallbackHttpError };
    }
    if (!data.url || !data.publicId || !data.tipo) {
      return { error: 'Respuesta inválida al subir evidencia' };
    }
    return {
      url: data.url,
      publicId: data.publicId,
      tipo: data.tipo,
      nombreArchivo: fallbackNombre,
    };
  } catch {
    return { error: connectionError };
  }
}

/**
 * Sube una imagen (JPG) vía API del servidor. Comprime a máximo 250 KB antes.
 */
export async function uploadEvidenciaImage(
  file: File,
): Promise<UploadEvidenciaResult | { error: string }> {
  if (file.type !== 'image/jpeg') {
    return { error: 'Solo se permiten imágenes en formato JPG o JPEG' };
  }

  let blob: Blob;
  try {
    blob = await compressImageToMaxKb(file, MAX_IMAGE_BYTES);
  } catch {
    return { error: 'No se pudo comprimir la imagen' };
  }

  const jpegFile = new File([blob], jpegUploadName(file.name), {
    type: 'image/jpeg',
  });

  return postEvidenciaFile(
    jpegFile,
    file.name,
    'Error de conexión al subir imagen',
    'Error al subir imagen. Intenta de nuevo.',
  );
}

/**
 * Sube un PDF vía API del servidor. Tamaño máximo: 2 MB.
 */
export async function uploadEvidenciaPdf(
  file: File,
): Promise<UploadEvidenciaResult | { error: string }> {
  if (file.type !== ACCEPTED_PDF_TYPE) {
    return { error: 'Solo se permiten archivos PDF' };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { error: 'El PDF no puede superar 2 MB' };
  }

  const pdfFile = new File(
    [file],
    file.name.replace(/\.[^.]+$/, '.pdf'),
    { type: ACCEPTED_PDF_TYPE },
  );

  return postEvidenciaFile(
    pdfFile,
    file.name,
    'Error de conexión al subir PDF',
    'Error al subir PDF. Intenta de nuevo.',
  );
}

/**
 * Sube un archivo de evidencia (imagen JPG o PDF) según su tipo.
 */
export async function uploadEvidenciaFile(
  file: File,
): Promise<UploadEvidenciaResult | { error: string }> {
  if (file.type === 'image/jpeg') {
    return uploadEvidenciaImage(file);
  }
  if (file.type === ACCEPTED_PDF_TYPE) {
    return uploadEvidenciaPdf(file);
  }
  return { error: 'Formato no permitido. Usa JPG, JPEG o PDF.' };
}
