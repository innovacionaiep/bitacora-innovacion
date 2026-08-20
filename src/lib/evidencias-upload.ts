/**
 * Utilidad cliente para subir evidencias (imágenes y PDF) a Cloudinary.
 * Carpeta: evidencias_actividades
 * Imágenes: compresión a máximo 250 KB. Solo JPG/JPEG.
 * PDF: máximo 2 MB.
 */

import {
  MAX_IMAGE_BYTES,
  compressImageToMaxKb,
  jpegUploadName,
} from '@/lib/compress-image';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const UPLOAD_PRESET_RAW =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_RAW ??
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
/** Preset dedicado para evidencias (imágenes). Debe tener en Cloudinary Folder = "evidencias_actividades". Si no está definido, se usa el preset general y se envía folder por API (el dashboard puede seguir mostrando la carpeta del preset). */
const EVIDENCIAS_PRESET_IMAGE =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_EVIDENCIAS;
/** Preset dedicado para evidencias (PDF/raw). Debe tener en Cloudinary Folder = "evidencias_actividades" y Resource type = Raw. */
const EVIDENCIAS_PRESET_RAW =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET_EVIDENCIAS_RAW;
const EVIDENCIAS_FOLDER = 'evidencias_actividades';
const MAX_PDF_BYTES = 2 * 1024 * 1024; // 2 MB

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg'];
export const ACCEPTED_PDF_TYPE = 'application/pdf';

export interface UploadEvidenciaResult {
  url: string;
  publicId: string;
  tipo: 'image' | 'pdf';
  nombreArchivo?: string;
}

/**
 * Sube una imagen (JPG) a Cloudinary en la carpeta evidencias_actividades.
 * Comprime a máximo 250 KB antes de subir.
 */
export async function uploadEvidenciaImage(
  file: File
): Promise<UploadEvidenciaResult | { error: string }> {
  const preset = EVIDENCIAS_PRESET_IMAGE || UPLOAD_PRESET;
  if (!CLOUD_NAME || !preset) {
    return { error: 'Configuración de Cloudinary no encontrada' };
  }
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Solo se permiten imágenes en formato JPG o JPEG' };
  }

  let blob: Blob;
  try {
    blob = await compressImageToMaxKb(file, MAX_IMAGE_BYTES);
  } catch (e) {
    return { error: 'No se pudo comprimir la imagen' };
  }

  const formData = new FormData();
  formData.append('file', blob, jpegUploadName(file.name));
  formData.append('upload_preset', preset);
  if (!EVIDENCIAS_PRESET_IMAGE) formData.append('folder', EVIDENCIAS_FOLDER);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  try {
    const response = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!response.ok) {
      const errText = await response.text();
      return { error: 'Error al subir imagen. Intenta de nuevo.' };
    }
    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
      tipo: 'image',
      nombreArchivo: file.name,
    };
  } catch {
    return { error: 'Error de conexión al subir imagen' };
  }
}

/**
 * Sube un PDF a Cloudinary en la carpeta evidencias_actividades.
 * Tamaño máximo: 2 MB.
 */
export async function uploadEvidenciaPdf(
  file: File
): Promise<UploadEvidenciaResult | { error: string }> {
  const preset = EVIDENCIAS_PRESET_RAW || UPLOAD_PRESET_RAW;
  if (!CLOUD_NAME || !preset) {
    return { error: 'Configuración de Cloudinary no encontrada' };
  }
  if (file.type !== ACCEPTED_PDF_TYPE) {
    return { error: 'Solo se permiten archivos PDF' };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { error: 'El PDF no puede superar 2 MB' };
  }

  const formData = new FormData();
  formData.append('file', file, file.name.replace(/\.[^.]+$/, '.pdf'));
  formData.append('upload_preset', preset);
  if (!EVIDENCIAS_PRESET_RAW) formData.append('folder', EVIDENCIAS_FOLDER);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;
  try {
    const response = await fetch(uploadUrl, { method: 'POST', body: formData });
    if (!response.ok) {
      return {
        error:
          'Error al subir PDF. Verifica que el preset de Cloudinary permita archivos raw.',
      };
    }
    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id,
      tipo: 'pdf',
      nombreArchivo: file.name,
    };
  } catch (err) {
    return { error: 'Error de conexión al subir PDF' };
  }
}

/**
 * Sube un archivo de evidencia (imagen JPG o PDF) según su tipo.
 */
export async function uploadEvidenciaFile(
  file: File
): Promise<UploadEvidenciaResult | { error: string }> {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return uploadEvidenciaImage(file);
  }
  if (file.type === ACCEPTED_PDF_TYPE) {
    return uploadEvidenciaPdf(file);
  }
  return { error: 'Formato no permitido. Usa JPG, JPEG o PDF.' };
}
