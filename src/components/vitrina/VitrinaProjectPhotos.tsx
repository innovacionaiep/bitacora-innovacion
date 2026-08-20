'use client';

import { useCallback, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  MAX_IMAGE_BYTES,
  compressImageToMaxKb,
  jpegUploadName,
} from '@/lib/compress-image';
import type { VitrinaProyectoFoto } from '@/lib/vitrina-proyectos';
import { VITRINA_PROYECTOS_MAX_FOTOS } from '@/lib/vitrina-proyectos';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const FOLDER = 'vitrina';
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type Props = {
  fotos: VitrinaProyectoFoto[];
  onChange: (fotos: VitrinaProyectoFoto[]) => void;
  disabled?: boolean;
  readOnly?: boolean;
  size?: 'sm' | 'lg';
};

async function uploadToCloudinary(file: File): Promise<VitrinaProyectoFoto> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error('Configuración de Cloudinary no encontrada');
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('La imagen excede el tamaño máximo de 10 MB');
  }

  let blob: Blob;
  try {
    blob = await compressImageToMaxKb(file, MAX_IMAGE_BYTES);
  } catch {
    throw new Error('No se pudo comprimir la imagen');
  }

  const formData = new FormData();
  formData.append('file', blob, jpegUploadName(file.name));
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', FOLDER);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData },
  );
  if (!response.ok) {
    throw new Error('Error al subir imagen');
  }
  const data = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
  };
  if (!data.secure_url || !data.public_id) {
    throw new Error('Error al subir imagen');
  }
  return { url: data.secure_url, publicId: data.public_id };
}

export function VitrinaProjectPhotos({
  fotos,
  onChange,
  disabled,
  readOnly = false,
  size = 'sm',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files?.length) return;
      const remaining = VITRINA_PROYECTOS_MAX_FOTOS - fotos.length;
      if (remaining <= 0) return;

      setUploading(true);
      setError('');
      const slice = Array.from(files).slice(0, remaining);
      const results: VitrinaProyectoFoto[] = [];
      for (const file of slice) {
        try {
          results.push(await uploadToCloudinary(file));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Error al subir imagen');
        }
      }
      if (results.length) onChange([...fotos, ...results]);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    },
    [fotos, onChange],
  );

  const canAdd =
    !readOnly && fotos.length < VITRINA_PROYECTOS_MAX_FOTOS && !disabled;
  const thumbClass =
    size === 'lg'
      ? 'relative h-20 w-28 overflow-hidden rounded-lg bg-slate-100'
      : 'relative h-12 w-16 overflow-hidden rounded-md bg-slate-100';

  return (
    <div className="flex min-w-[11rem] flex-col gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {fotos.map((foto, index) => (
          <div
            key={foto.publicId}
            className={thumbClass}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt={index === 0 ? 'Portada' : `Foto ${index + 1}`}
              className="h-full w-full object-cover"
            />
            {readOnly ? null : (
              <button
                type="button"
                onClick={() => onChange(fotos.filter((_, i) => i !== index))}
                disabled={disabled}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                aria-label={`Quitar foto ${index + 1}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      {canAdd ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={uploading || disabled}
            onChange={(e) => void handleFiles(e)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-fit text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || disabled}
          >
            {uploading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="mr-1 h-3.5 w-3.5" />
            )}
            Fotos ({fotos.length}/{VITRINA_PROYECTOS_MAX_FOTOS})
          </Button>
          <p className="text-[10px] text-slate-500">
            Imágenes máx. 250 KB (se comprimen automáticamente).
          </p>
        </>
      ) : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
