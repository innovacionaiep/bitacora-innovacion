/**
 * Compresión client-side de imágenes a JPEG de máximo 250 KB.
 * Usado por evidencias de actividades/indicadores y por fotos de vitrina.
 */

export const MAX_IMAGE_BYTES = 250 * 1024;
export const MAX_IMAGE_SIDE = 1600;

export function scaleImageToMaxSide(
  width: number,
  height: number,
  maxSide = MAX_IMAGE_SIDE,
): { width: number; height: number } {
  if (width <= maxSide && height <= maxSide) {
    return { width, height };
  }
  if (width >= height) {
    return {
      width: maxSide,
      height: Math.round((height * maxSide) / width),
    };
  }
  return {
    width: Math.round((width * maxSide) / height),
    height: maxSide,
  };
}

export function jpegUploadName(originalName: string): string {
  return originalName.replace(/\.[^.]+$/, '.jpg');
}

/**
 * Comprime una imagen a máximo `maxBytes` usando canvas.
 * Reduce calidad y, si hace falta, dimensiones.
 */
export async function compressImageToMaxKb(
  file: File,
  maxBytes: number = MAX_IMAGE_BYTES,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scaled = scaleImageToMaxSide(img.naturalWidth, img.naturalHeight);
      const width = scaled.width;
      const height = scaled.height;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx2 = canvas.getContext('2d');
      if (!ctx2) {
        reject(new Error('Canvas no disponible'));
        return;
      }
      ctx2.fillStyle = '#fff';
      ctx2.fillRect(0, 0, width, height);
      ctx2.drawImage(img, 0, 0, width, height);

      let quality = 0.85;
      const tryCompress = (): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Error al comprimir imagen'));
              return;
            }
            if (blob.size <= maxBytes || quality <= 0.2) {
              resolve(blob);
              return;
            }
            quality -= 0.1;
            tryCompress();
          },
          'image/jpeg',
          quality,
        );
      };
      tryCompress();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar imagen'));
    };
    img.src = url;
  });
}
