/**
 * Upload firmado de evidencias (JPG / PDF) a Cloudinary.
 * El cliente comprime imágenes; esta ruta evita el POST unsigned desde el navegador.
 */

import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { MAX_IMAGE_BYTES } from '@/lib/compress-image';
import {
  ACCEPTED_PDF_TYPE,
  EVIDENCIAS_FOLDER,
  MAX_PDF_BYTES,
} from '@/lib/evidencias-constants';

function isJpeg(file: File): boolean {
  if (file.type === 'image/jpeg') return true;
  const lower = file.name.toLowerCase();
  return lower.endsWith('.jpg') || lower.endsWith('.jpeg');
}

function isPdf(file: File): boolean {
  if (file.type === ACCEPTED_PDF_TYPE) return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

function signParams(params: Record<string, string>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex');
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Configuración de Cloudinary incompleta en el servidor' },
      { status: 500 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }

    const jpeg = isJpeg(file);
    const pdf = isPdf(file);
    if (!jpeg && !pdf) {
      return NextResponse.json(
        { error: 'Formato no permitido. Usa JPG, JPEG o PDF.' },
        { status: 400 },
      );
    }

    if (jpeg && file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'La imagen no puede superar 250 KB' },
        { status: 400 },
      );
    }
    if (pdf && file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: 'El PDF no puede superar 2 MB' },
        { status: 400 },
      );
    }

    const tipo = jpeg ? 'image' : 'pdf';
    const safeName = jpeg
      ? file.name.replace(/\.[^.]+$/, '.jpg')
      : file.name.replace(/\.[^.]+$/, '.pdf');
    const publicId = `ev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const signed = {
      folder: EVIDENCIAS_FOLDER,
      public_id: publicId,
      timestamp: String(timestamp),
    };
    const signature = signParams(signed, apiSecret);

    const uploadForm = new FormData();
    uploadForm.append('file', file, safeName);
    uploadForm.append('api_key', apiKey);
    uploadForm.append('timestamp', signed.timestamp);
    uploadForm.append('signature', signature);
    uploadForm.append('folder', signed.folder);
    uploadForm.append('public_id', signed.public_id);

    const resource = jpeg ? 'image' : 'raw';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resource}/upload`;
    const res = await fetch(uploadUrl, { method: 'POST', body: uploadForm });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[evidencias-upload API]', res.status, errText.slice(0, 400));
      return NextResponse.json(
        { error: 'Error al subir evidencia. Intenta de nuevo.' },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      secure_url?: string;
      public_id?: string;
    };
    if (!data.secure_url || !data.public_id) {
      return NextResponse.json(
        { error: 'Respuesta inválida de Cloudinary' },
        { status: 502 },
      );
    }

    return NextResponse.json({
      url: data.secure_url,
      publicId: data.public_id,
      tipo,
      nombreArchivo: file.name,
    });
  } catch (e) {
    console.error('[evidencias-upload API]', e);
    return NextResponse.json(
      { error: 'Error de conexión al subir evidencia' },
      { status: 500 },
    );
  }
}
