'use client';

import { useState, useRef, useCallback } from 'react';
import { X, ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

export interface UploadedImage {
  url: string;
  publicId: string;
}

interface ImageUploaderProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB - Límite de Cloudinary plan gratuito

export function ImageUploader({
  images,
  onImagesChange,
  maxImages = 4,
  disabled = false,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToCloudinary = async (file: File): Promise<UploadedImage | null> => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      setError('Configuración de Cloudinary no encontrada');
      return null;
    }

    // Validar tamaño del archivo antes de subir
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setError(`La imagen "${file.name}" es muy grande (${sizeMB} MB). Máximo permitido: 10 MB`);
      return null;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'gestor-proyectos/posts');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

    try {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        // Intentar extraer mensaje de error de Cloudinary
        try {
          const errorData = JSON.parse(errorBody);
          if (errorData.error?.message?.includes('File size too large')) {
            throw new Error('La imagen excede el tamaño máximo de 10 MB');
          }
          throw new Error(errorData.error?.message || 'Error al subir imagen');
        } catch {
          throw new Error('Error al subir imagen');
        }
      }

      const data = await response.json();
      return {
        url: data.secure_url,
        publicId: data.public_id,
      };
    } catch (err) {
      console.error('Error uploading to Cloudinary:', err);
      return null;
    }
  };

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - images.length;
      if (remainingSlots <= 0) {
        setError(`Máximo ${maxImages} imágenes permitidas`);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots);
      setUploading(true);
      setError(null);

      const uploadPromises = filesToUpload.map(uploadToCloudinary);
      const results = await Promise.all(uploadPromises);

      const successfulUploads = results.filter(
        (result): result is UploadedImage => result !== null
      );

      if (successfulUploads.length < filesToUpload.length) {
        setError('Algunas imágenes no pudieron subirse');
      }

      onImagesChange([...images, ...successfulUploads]);
      setUploading(false);

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [images, maxImages, onImagesChange]
  );

  const removeImage = useCallback(
    (index: number) => {
      const newImages = [...images];
      newImages.splice(index, 1);
      onImagesChange(newImages);
    },
    [images, onImagesChange]
  );

  const canAddMore = images.length < maxImages && !disabled;

  return (
    <div className="space-y-3">
      {/* Preview de imágenes */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((image, index) => (
            <div key={image.publicId} className="relative group aspect-video rounded-lg overflow-hidden bg-muted">
              <Image
                src={image.url}
                alt={`Imagen ${index + 1}`}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={disabled}
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Botón para agregar imágenes */}
      {canAddMore && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading || disabled}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || disabled}
            className="gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4" />
                Agregar imágenes ({images.length}/{maxImages})
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
