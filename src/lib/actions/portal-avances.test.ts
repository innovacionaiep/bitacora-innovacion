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
    proyectoParticipante: { findMany: vi.fn() },
    systemSetting: { findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

const accessMock = vi.mocked(resolvePortalAccess);
const proyectoFindMany = vi.mocked(prisma.proyecto.findMany);
const itemFindMany = vi.mocked(prisma.itemPresupuesto.findMany);
const participanteFindMany = vi.mocked(prisma.proyectoParticipante.findMany);
const settingFindUnique = vi.mocked(prisma.systemSetting.findUnique);

describe('getPortalAvancesProyectos', () => {
  beforeEach(() => {
    accessMock.mockReset();
    proyectoFindMany.mockReset();
    itemFindMany.mockReset();
    participanteFindMany.mockReset();
    participanteFindMany.mockResolvedValue([]);
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
        carreras: [{ carrera: { nombre: 'Enfermería' } }],
        asignaturas: [{ asignatura: { nombre: 'Anatomía' } }],
      },
    ] as never);
    itemFindMany.mockResolvedValue([]);
    participanteFindMany.mockResolvedValue([
      { proyectoId: 'p1', rol: 'Estudiante', cargo: null },
      { proyectoId: 'p1', rol: 'Colaborador', cargo: 'Ayudante estudiante' },
      { proyectoId: 'p1', rol: 'Docente', cargo: null },
      { proyectoId: 'p1', rol: 'Coordinador', cargo: 'Docente guía' },
      { proyectoId: 'p1', rol: 'Beneficiario', cargo: 'Estudiante' },
    ] as never);

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
      carreras: ['Enfermería'],
      asignaturas: ['Anatomía'],
      presupuestoAdjudicado: 400_000,
      estudiantes: 2,
      docentes: 2,
      beneficiarios: 1,
    });
    expect(result.data?.[0]?.idVinculamos).toBeUndefined();
    expect(result.data?.some((p) => p.fondo === 'Fondo Impulsa')).toBe(false);
  });

  it('incluye snapshot VcM en nivel 2 y lo omite en Causalab', async () => {
    const vcmValue = JSON.stringify({
      filePath: 'C:\\x.xlsx',
      sheetName: 'Fondo VcM',
      lastSyncedAt: '2026-09-03T00:00:00.000Z',
      fileOk: true,
      sheetOk: true,
      rows: [
        {
          rowNumber: 2,
          proyecto: 'Iniciativa VcM',
          encargado: '',
          sede: 'Bellavista',
          escuelas: ['Salud'],
          carreras: [],
          asignaturas: [],
          idVinculamos: '10',
          estudiantes: 1,
          docentes: 1,
          beneficiarios: 0,
          avanceGantt: 10,
          avanceIndicadores: 0,
          presupuestoAdjudicado: 1000,
          avanceOperativoSolicitado: 0,
          avanceOperativoEjecutado: 0,
          honorarios: { kind: 'pct', value: 0 },
          saldoPresupuesto: 0,
        },
      ],
    });
    const impulsaValue = JSON.stringify({
      filePath: 'C:\\x.xlsx',
      sheetName: 'IMPULSA',
      lastSyncedAt: '2026-09-03T00:00:00.000Z',
      fileOk: true,
      sheetOk: true,
      rows: [
        {
          rowNumber: 2,
          proyecto: 'ClinicApp',
          encargado: '',
          sede: 'Bellavista',
          escuelas: ['Salud'],
          carreras: [],
          asignaturas: [],
          idVinculamos: '1',
          estudiantes: 1,
          docentes: 1,
          beneficiarios: 0,
          avanceGantt: 7,
          avanceIndicadores: 0,
          presupuestoAdjudicado: 2000,
          avanceOperativoSolicitado: 0,
          avanceOperativoEjecutado: 0,
          honorarios: { kind: 'na' },
          saldoPresupuesto: 0,
        },
      ],
    });
    settingFindUnique.mockImplementation(async (args: { where: { key: string } }) => {
      if (args.where.key === 'portal_avances_vcm') {
        return { value: vcmValue };
      }
      if (args.where.key === 'portal_avances_impulsa') {
        return { value: impulsaValue };
      }
      return null;
    });

    accessMock.mockResolvedValue({ kind: 'guest', level: 2 });
    proyectoFindMany.mockResolvedValue([] as never);
    itemFindMany.mockResolvedValue([]);
    const level2 = await getPortalAvancesProyectos();
    expect(level2.success).toBe(true);
    expect(level2.data?.some((p) => p.id === 'vcm:2')).toBe(true);
    expect(level2.data?.some((p) => p.id === 'impulsa:2')).toBe(true);

    settingFindUnique.mockClear();
    accessMock.mockResolvedValue({
      kind: 'guest',
      level: 0,
      profile: 'causalab',
    });
    const level0 = await getPortalAvancesProyectos();
    expect(level0.success).toBe(true);
    expect(level0.data?.some((p) => p.id === 'vcm:2')).toBe(false);
    expect(level0.data?.some((p) => p.id === 'impulsa:2')).toBe(true);
    expect(
      settingFindUnique.mock.calls.some(
        (call) => call[0]?.where?.key === 'portal_avances_vcm',
      ),
    ).toBe(false);
  });
});
