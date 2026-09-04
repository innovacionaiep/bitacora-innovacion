import { describe, expect, it, vi } from 'vitest';
import { fetchMideimpactoSedesByIds } from '@/lib/mideimpacto-iniciativas';
import { resetMideimpactoSedeDripForTests, runSedeDrip } from '@/lib/mideimpacto-sede-drip';

vi.mock('@/lib/mideimpacto-iniciativas', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/mideimpacto-iniciativas')>();
  return {
    ...actual,
    fetchMideimpactoSedesByIds: vi.fn(),
  };
});

const fetchMock = vi.mocked(fetchMideimpactoSedesByIds);

describe('runSedeDrip', () => {
  it('persiste cada sede y para en 429 sin perder lo ya guardado', async () => {
    resetMideimpactoSedeDripForTests();
    const upsert = vi.fn();
    fetchMock
      .mockResolvedValueOnce({
        sedes: { a: 'Viña' },
        rateLimited: false,
      })
      .mockResolvedValueOnce({
        sedes: {},
        rateLimited: true,
        retryAfterMs: 30_000,
      });
    const result = await runSedeDrip({
      ids: ['a', 'b'],
      apiKey: 'token',
      store: { findByCodigos: async () => [], upsert },
      sleep: async () => {},
      now: () => 1_000,
    });
    expect(upsert).toHaveBeenCalledWith('a', 'Viña');
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(result.rateLimited).toBe(true);
    expect(result.pauseUntil).toBe(31_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
