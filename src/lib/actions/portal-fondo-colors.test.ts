import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
const findMany = vi.fn();
const update = vi.fn();
const transaction = vi.fn();

vi.mock('@/lib/authz/guards', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    fondo: { findMany, update },
    $transaction: (...args: unknown[]) => transaction(...args),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

async function loadActions() {
  return import('@/lib/actions/portal-fondo-colors');
}

describe('portal-fondo-colors actions', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    findMany.mockReset();
    update.mockReset();
    transaction.mockReset();
    requireAdmin.mockResolvedValue({ ok: true, user: { id: 'admin' } });
    findMany.mockResolvedValue([]);
    transaction.mockResolvedValue([]);
  });

  it('rechaza get si no es admin', async () => {
    requireAdmin.mockResolvedValue({ ok: false, error: 'No autorizado' });
    const { getPortalFondoColors } = await loadActions();
    const result = await getPortalFondoColors();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No autorizado');
  });

  it('rechaza hex inválido sin escribir', async () => {
    const { savePortalFondoColors } = await loadActions();
    const result = await savePortalFondoColors([
      { id: 'f1', colorHex: 'rojo' },
    ]);
    expect(result.success).toBe(false);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('persiste hex normalizado', async () => {
    const { savePortalFondoColors } = await loadActions();
    const result = await savePortalFondoColors([
      { id: 'f1', colorHex: '#aabbcc' },
    ]);
    expect(result.success).toBe(true);
    expect(transaction).toHaveBeenCalled();
    const ops = transaction.mock.calls[0]?.[0];
    expect(Array.isArray(ops)).toBe(true);
    expect(update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { colorHex: '#AABBCC' },
    });
  });
});
