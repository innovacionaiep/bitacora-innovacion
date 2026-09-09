/** @vitest-environment node */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EVIDENCIAS_FOLDER } from '@/lib/evidencias-constants';

const getServerSession = vi.fn();

vi.mock('next-auth/next', () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock('@/lib/auth-options', () => ({
  authOptions: {},
}));

describe('POST /api/evidencias-upload', () => {
  beforeEach(() => {
    getServerSession.mockReset();
    vi.unstubAllGlobals();
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
  });

  async function postFile(file: File) {
    const { POST } = await import('./route');
    const form = new FormData();
    form.append('file', file);
    const request = new Request('http://localhost/api/evidencias-upload', {
      method: 'POST',
      body: form,
    });
    return POST(request as never);
  }

  it('exige sesión', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await postFile(
      new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
    );
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'No autorizado' });
  });

  it('sube JPEG firmado a image/upload en evidencias_actividades', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1' } });
    const cloudinaryFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          secure_url: 'https://res.cloudinary.com/demo/image/upload/ev.jpg',
          public_id: `${EVIDENCIAS_FOLDER}/ev`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', cloudinaryFetch);

    const res = await postFile(
      new File(['jpeg-bytes'], 'foto.jpg', { type: 'image/jpeg' }),
    );
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/ev.jpg',
      publicId: `${EVIDENCIAS_FOLDER}/ev`,
      tipo: 'image',
      nombreArchivo: 'foto.jpg',
    });

    expect(cloudinaryFetch).toHaveBeenCalledTimes(1);
    const [url, init] = cloudinaryFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/image/upload');
    const sent = init.body as FormData;
    expect(sent.get('folder')).toBe(EVIDENCIAS_FOLDER);
    expect(sent.get('api_key')).toBe('key');
    expect(sent.get('signature')).toBeTruthy();
    expect(sent.get('upload_preset')).toBeNull();
  });

  it('sube PDF firmado a raw/upload', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1' } });
    const cloudinaryFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          secure_url: 'https://res.cloudinary.com/demo/raw/upload/ev.pdf',
          public_id: `${EVIDENCIAS_FOLDER}/ev`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', cloudinaryFetch);

    const res = await postFile(
      new File(['%PDF'], 'nota.pdf', { type: 'application/pdf' }),
    );
    expect(res.status).toBe(200);
    const [url] = cloudinaryFetch.mock.calls[0] as [string];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo/raw/upload');
    await expect(res.json()).resolves.toMatchObject({ tipo: 'pdf' });
  });

  it('rechaza PNG', async () => {
    getServerSession.mockResolvedValue({ user: { id: 'u1' } });
    const res = await postFile(
      new File(['x'], 'a.png', { type: 'image/png' }),
    );
    expect(res.status).toBe(400);
  });
});
