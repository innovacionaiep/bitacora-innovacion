import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  CONVENIO_MAX_BYTES,
  CONVENIOS_FOLDER,
} from '@/lib/convenios-constants';

const ACCEPTED_PDF = 'application/pdf';
const ACCEPTED_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * Upload firmado (signed) a Cloudinary raw en carpeta convenios.
 * Evita el preset de evidencias, que fuerza evidencias_actividades.
 */
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
      { status: 500 }
    );
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const proyectoId = String(form.get('proyectoId') || '').trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
    }
    if (!proyectoId) {
      return NextResponse.json({ error: 'Proyecto inválido' }, { status: 400 });
    }
    if (file.size > CONVENIO_MAX_BYTES) {
      return NextResponse.json(
        { error: 'El archivo no puede superar 2 MB' },
        { status: 400 }
      );
    }

    const lower = file.name.toLowerCase();
    const isPdf = file.type === ACCEPTED_PDF || lower.endsWith('.pdf');
    const isDocx = file.type === ACCEPTED_DOCX || lower.endsWith('.docx');
    if (!isPdf && !isDocx) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos PDF o Word (.docx)' },
        { status: 400 }
      );
    }

    const safeName = isPdf
      ? file.name.replace(/\.[^.]+$/, '.pdf')
      : file.name.replace(/\.[^.]+$/, '.docx');
    // public_id relativo a folder=convenios → convenios/{proyectoId}/firmado_xxx
    const publicId = `${proyectoId}/firmado_${Date.now().toString(36)}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Firma: parámetros a firmar en orden alfabético (sin file ni api_key)
    const paramsToSign = `folder=${CONVENIOS_FOLDER}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    const uploadForm = new FormData();
    uploadForm.append('file', file, safeName);
    uploadForm.append('api_key', apiKey);
    uploadForm.append('timestamp', String(timestamp));
    uploadForm.append('signature', signature);
    uploadForm.append('folder', CONVENIOS_FOLDER);
    uploadForm.append('public_id', publicId);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;
    const res = await fetch(uploadUrl, { method: 'POST', body: uploadForm });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[convenios-upload API]', res.status, errText.slice(0, 400));
      return NextResponse.json(
        {
          error:
            'Error al subir el convenio a Cloudinary. Revisa API key/secret y permisos raw.',
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      secure_url?: string;
      public_id?: string;
    };
    if (!data.secure_url || !data.public_id) {
      return NextResponse.json(
        { error: 'Respuesta inválida de Cloudinary' },
        { status: 502 }
      );
    }

    return NextResponse.json({
      url: data.secure_url,
      publicId: data.public_id,
      nombreArchivo: safeName,
    });
  } catch (e) {
    console.error('[convenios-upload API]', e);
    return NextResponse.json(
      { error: 'Error de conexión al subir el convenio' },
      { status: 500 }
    );
  }
}
