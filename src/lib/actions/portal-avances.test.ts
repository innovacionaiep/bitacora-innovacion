import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import prisma from '@/lib/prisma';
import { getPortalAvancesProyectos } from '@/lib/actions/portal-avances';

vi.mock('@/lib/actions/portal-guest', () => ({
  resolvePortalAccess: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    proyecto: { findMany: vi.fn() },
    itemPresupuesto: { findMany: vi.fn() },
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

const accessMock = vi.mocked(resolvePortalAccess);
const proyectoFindMany = vi.mocked(prisma.proyecto.findMany);
const itemFindMany = vi.mocked(prisma.itemPresupuesto.findMany);
const settingFindUnique = vi.mocked(prisma.systemSetting.findUnique);

describe('getPortalAvancesProyectos', () => {
  beforeEach(() => {
    accessMock.mockReset();
    proyectoFindMany.mockReset();
    itemFindMany.mockReset();
    settingFindUnique.mockReset();
    settingFindUnique.mockResolvedValue(null);
  });

  it('no consulta proyectos si el nivel no ve Avances', async () => {
    accessMock.mockResolvedValue({ kind: 'guest', level: 1 });
    const result = await getPortalAvancesProyectos();
    expect(result.success).toBe(false);
    expect(proyectoFindMany).not.toHaveBeenCalled();
  });

  it('consulta solo fondos app cuando el nivel ve Avances', async () => {
    accessMock.mockResolvedValue({ kind: 'guest', level: 2 });
    proyectoFindMany.mockResolvedValue([
      {
        id: 'p1',
        proyecto: 'Aula',
        fondo: 'Innovación Docente',
        sede: 'San Antonio',
        avanceGantt: 4,
        objetivos: 0,
        presupuestoAdjudicado: 400_000,
        presupuestoTotal: 0,
        escuelas: [{ escuela: { nombre: 'Salud' } }],
      },
    ] as never);
    itemFindMany.mockResolvedValue([]);

    const result = await getPortalAvancesProyectos();
    expect(result.success).toBe(true);
    expect(proyectoFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          fondo: {
            in: [
              'Innovación Docente',
              'Reto Innovador de Especialidad',
            ],
          },
        },
      }),
    );
    expect(result.data?.[0]).toMatchObject({
      id: 'p1',
      proyecto: 'Aula',
      escuelas: ['Salud'],
      presupuestoAdjudicado: 400_000,
    });
    expect(result.data?.some((p) => p.fondo === 'Fondo Impulsa')).toBe(false);
  });
});
