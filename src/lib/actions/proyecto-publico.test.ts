import { beforeEach, describe, expect, it, vi } from 'vitest';

const findActive = vi.fn();
const getProyectoBase = vi.fn();
const getCatalog = vi.fn();

vi.mock('@/lib/public-link-db', () => ({
  findActivePublicLinkProyectoId: (...args: unknown[]) => findActive(...args),
}));

vi.mock('@/lib/actions/proyectos', () => ({
  getProyectoBase: (...args: unknown[]) => getProyectoBase(...args),
}));

vi.mock('@/lib/actions/linea-modulos-config', () => ({
  getLineasTabsCatalogUnchecked: (...args: unknown[]) => getCatalog(...args),
}));

async function load() {
  return import('@/lib/actions/proyecto-publico');
}

describe('getProyectoPublicoVista', () => {
  beforeEach(() => {
    findActive.mockReset();
    getProyectoBase.mockReset();
    getCatalog.mockReset();
  });

  it('rechaza token con formato inválido', async () => {
    const { getProyectoPublicoVista } = await load();
    const result = await getProyectoPublicoVista('nope');
    expect(result.success).toBe(false);
    expect(findActive).not.toHaveBeenCalled();
  });

  it('rechaza token caducado', async () => {
    findActive.mockResolvedValue(null);
    const { getProyectoPublicoVista } = await load();
    const result = await getProyectoPublicoVista('ab'.repeat(32));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/caducado|disponible/i);
  });

  it('carga proyecto y catálogo con token activo', async () => {
    findActive.mockResolvedValue('p1');
    getProyectoBase.mockResolvedValue({
      success: true,
      data: { id: 'p1', proyecto: 'Nalca' },
    });
    getCatalog.mockResolvedValue([]);
    const { getProyectoPublicoVista } = await load();
    const result = await getProyectoPublicoVista('ab'.repeat(32));
    expect(result.success).toBe(true);
    expect(result.data?.proyecto.id).toBe('p1');
  });
});
