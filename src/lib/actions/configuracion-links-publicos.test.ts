import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn();
const findManyProyectos = vi.fn();
const findFirstLink = vi.fn();
const findUniqueProyecto = vi.fn();
const createLink = vi.fn();
const updateManyLink = vi.fn();

vi.mock('@/lib/authz/guards', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock('@/lib/public-link-db', () => ({
  newPublicLinkToken: () => 'ab'.repeat(32),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    proyecto: {
      findMany: (...args: unknown[]) => findManyProyectos(...args),
      findUnique: (...args: unknown[]) => findUniqueProyecto(...args),
    },
    proyectoLinkPublico: {
      findFirst: (...args: unknown[]) => findFirstLink(...args),
      create: (...args: unknown[]) => createLink(...args),
      updateMany: (...args: unknown[]) => updateManyLink(...args),
    },
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

async function loadActions() {
  return import('@/lib/actions/configuracion-links-publicos');
}

describe('configuracion-links-publicos', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    findManyProyectos.mockReset();
    findFirstLink.mockReset();
    findUniqueProyecto.mockReset();
    createLink.mockReset();
    updateManyLink.mockReset();
    requireAdmin.mockResolvedValue({ ok: true, user: { id: 'admin' } });
  });

  it('rechaza listar si no es admin', async () => {
    requireAdmin.mockResolvedValue({ ok: false, error: 'Solo Admin' });
    const { listProyectosNombresLinksPublicos } = await loadActions();
    const result = await listProyectosNombresLinksPublicos();
    expect(result.success).toBe(false);
    expect(findManyProyectos).not.toHaveBeenCalled();
  });

  it('no genera un segundo link activo', async () => {
    findUniqueProyecto.mockResolvedValue({ id: 'p1' });
    findFirstLink.mockResolvedValue({ id: 'existing' });
    const { generarLinkPublico } = await loadActions();
    const result = await generarLinkPublico('p1');
    expect(result.success).toBe(false);
    expect(createLink).not.toHaveBeenCalled();
  });

  it('genera token cuando no hay activo', async () => {
    findUniqueProyecto.mockResolvedValue({ id: 'p1' });
    findFirstLink.mockResolvedValue(null);
    createLink.mockResolvedValue({
      token: 'ab'.repeat(32),
      proyectoId: 'p1',
      createdAt: new Date('2026-09-11'),
    });
    const { generarLinkPublico } = await loadActions();
    const result = await generarLinkPublico('p1');
    expect(result.success).toBe(true);
    expect(result.data?.token).toHaveLength(64);
    expect(result.data?.url).toBe(
      `https://bitacora-innovacion.vercel.app/p/${'ab'.repeat(32)}`
    );
    expect(createLink).toHaveBeenCalled();
  });

  it('explica si Prisma Client no tiene el modelo', async () => {
    findUniqueProyecto.mockResolvedValue({ id: 'p1' });
    findFirstLink.mockRejectedValue(
      new TypeError("Cannot read properties of undefined (reading 'findFirst')")
    );
    const { generarLinkPublico } = await loadActions();
    const result = await generarLinkPublico('p1');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Prisma Client/i);
  });

  it('caduca con updateMany y no delete', async () => {
    updateManyLink.mockResolvedValue({ count: 1 });
    const { caducarLinkPublico } = await loadActions();
    const result = await caducarLinkPublico('p1');
    expect(result.success).toBe(true);
    expect(updateManyLink).toHaveBeenCalledWith({
      where: { proyectoId: 'p1', revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
