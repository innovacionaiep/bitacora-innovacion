import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import { fetchMideimpactoIniciativasPage } from '@/lib/mideimpacto-iniciativas';
import { attachSedesFromCache } from '@/lib/mideimpacto-sede-cache';
import { scheduleSedeDrip } from '@/lib/mideimpacto-sede-drip';
import { getMideimpactoApiKey } from '@/lib/secrets/env-secrets';
import { getMideimpactoIniciativas } from '@/lib/actions/mideimpacto-iniciativas';

vi.mock('@/lib/actions/portal-guest', () => ({
  resolvePortalAccess: vi.fn(),
}));

vi.mock('@/lib/secrets/env-secrets', () => ({
  getMideimpactoApiKey: vi.fn(),
}));

vi.mock('@/lib/mideimpacto-iniciativas', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/mideimpacto-iniciativas')>();
  return {
    ...actual,
    fetchMideimpactoIniciativasPage: vi.fn(),
  };
});

vi.mock('@/lib/mideimpacto-sede-cache', () => ({
  attachSedesFromCache: vi.fn(),
}));

vi.mock('@/lib/mideimpacto-sede-drip', () => ({
  scheduleSedeDrip: vi.fn(),
}));

const accessMock = vi.mocked(resolvePortalAccess);
const apiKeyMock = vi.mocked(getMideimpactoApiKey);
const fetchMock = vi.mocked(fetchMideimpactoIniciativasPage);
const attachMock = vi.mocked(attachSedesFromCache);
const dripMock = vi.mocked(scheduleSedeDrip);

const samplePage = {
  rows: [
    {
      id: '12',
      nombre: 'Huertos',
      estado: 'activa',
      fechaInicio: '2024-01-01',
      fechaTermino: '',
      mecanismo: '',
      adjuntos: [],
      sede: '',
    },
  ],
  page: 1,
  lastPage: 2,
  total: 16,
};

describe('getMideimpactoIniciativas', () => {
  beforeEach(() => {
    accessMock.mockReset();
    apiKeyMock.mockReset();
    fetchMock.mockReset();
    attachMock.mockReset();
    dripMock.mockReset();
  });

  it('no llama a la API si el nivel no ve Vinculamos', async () => {
    accessMock.mockResolvedValue({ kind: 'guest', level: 2 });
    apiKeyMock.mockReturnValue('token');
    const result = await getMideimpactoIniciativas({ page: 1 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('No tienes acceso a esta vista');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no hace fetch si falta la API key', async () => {
    accessMock.mockResolvedValue({ kind: 'session', level: 3 });
    apiKeyMock.mockReturnValue(null);
    const result = await getMideimpactoIniciativas({ page: 1 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('API de MideImpacto no configurada');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('devuelve la página del listado sin caché ni drip de sede', async () => {
    accessMock.mockResolvedValue({ kind: 'guest', level: 3 });
    apiKeyMock.mockReturnValue('token');
    fetchMock.mockResolvedValue({ ok: true, page: samplePage });
    const result = await getMideimpactoIniciativas({ page: 1 });
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith({
      apiKey: 'token',
      page: 1,
    });
    expect(result.data).toEqual(samplePage);
    expect(attachMock).not.toHaveBeenCalled();
    expect(dripMock).not.toHaveBeenCalled();
  });

  it('429 del listado sí falla; no agenda drip', async () => {
    accessMock.mockResolvedValue({ kind: 'guest', level: 3 });
    apiKeyMock.mockReturnValue('token');
    fetchMock.mockResolvedValue({
      ok: false,
      error: 'Límite de solicitudes excedido',
      status: 429,
    });
    const result = await getMideimpactoIniciativas({ page: 2 });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Límite de solicitudes excedido');
    expect(attachMock).not.toHaveBeenCalled();
    expect(dripMock).not.toHaveBeenCalled();
  });
});
