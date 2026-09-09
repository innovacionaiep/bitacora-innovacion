import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_IMAGE_BYTES } from '@/lib/compress-image';
import { EVIDENCIAS_UPLOAD_PATH } from '@/lib/evidencias-constants';

const compressImageToMaxKb = vi.fn();

vi.mock('@/lib/compress-image', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/compress-image')>();
  return {
    ...actual,
    compressImageToMaxKb: (...args: unknown[]) => compressImageToMaxKb(...args),
  };
});

import {
  uploadEvidenciaFile,
  uploadEvidenciaImage,
  uploadEvidenciaPdf,
} from '@/lib/evidencias-upload';

describe('uploadEvidenciaFile', () => {
  beforeEach(() => {
    compressImageToMaxKb.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('rechaza formatos que no son JPG ni PDF', async () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });
    await expect(uploadEvidenciaFile(file)).resolves.toEqual({
      error: 'Formato no permitido. Usa JPG, JPEG o PDF.',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sube JPG comprimido como File a la API propia, no a Cloudinary', async () => {
    const original = new File(['orig'], 'evidencia.jpeg', { type: 'image/jpeg' });
    const blob = new Blob(['compressed'], { type: 'image/jpeg' });
    compressImageToMaxKb.mockResolvedValue(blob);

    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          url: 'https://res.cloudinary.com/x/image/upload/a.jpg',
          publicId: 'evidencias_actividades/a',
          tipo: 'image',
          nombreArchivo: 'evidencia.jpg',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await uploadEvidenciaImage(original);

    expect(compressImageToMaxKb).toHaveBeenCalledWith(original, MAX_IMAGE_BYTES);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(EVIDENCIAS_UPLOAD_PATH);
    expect(url).not.toContain('api.cloudinary.com');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    const sent = body.get('file') as File;
    expect(sent).toBeInstanceOf(File);
    expect(sent.name).toBe('evidencia.jpg');
    expect(sent.type).toBe('image/jpeg');
    expect(result).toEqual({
      url: 'https://res.cloudinary.com/x/image/upload/a.jpg',
      publicId: 'evidencias_actividades/a',
      tipo: 'image',
      nombreArchivo: 'evidencia.jpeg',
    });
  });

  it('muestra el error del servidor en vez de enmascararlo como conexión', async () => {
    compressImageToMaxKb.mockResolvedValue(
      new Blob(['ok'], { type: 'image/jpeg' }),
    );
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      uploadEvidenciaImage(
        new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
      ),
    ).resolves.toEqual({ error: 'No autorizado' });
  });

  it('usa mensaje de conexión si fetch lanza', async () => {
    compressImageToMaxKb.mockResolvedValue(
      new Blob(['ok'], { type: 'image/jpeg' }),
    );
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(
      uploadEvidenciaImage(
        new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
      ),
    ).resolves.toEqual({ error: 'Error de conexión al subir imagen' });
  });

  it('sube PDF a la API propia', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          url: 'https://res.cloudinary.com/x/raw/upload/b.pdf',
          publicId: 'evidencias_actividades/b',
          tipo: 'pdf',
          nombreArchivo: 'informe.pdf',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const pdf = new File(['%PDF'], 'informe.pdf', { type: 'application/pdf' });
    const result = await uploadEvidenciaPdf(pdf);

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toBe(EVIDENCIAS_UPLOAD_PATH);
    expect(result).toMatchObject({
      tipo: 'pdf',
      publicId: 'evidencias_actividades/b',
    });
  });

  it('rechaza PDF mayores a 2 MB', async () => {
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.pdf', {
      type: 'application/pdf',
    });
    await expect(uploadEvidenciaPdf(big)).resolves.toEqual({
      error: 'El PDF no puede superar 2 MB',
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
