import { describe, expect, it } from 'vitest';
import {
  aggregateFondoParticipantes,
  buildFondoParticipantesExcelAoa,
  fondoParticipantesExcelFilename,
  mapParticipanteToListadoRow,
  type FondoParticipanteListadoRow,
  type FondoParticipanteRaw,
} from '@/lib/fondo-gestion-participantes';

function raw(
  patch: Partial<FondoParticipanteRaw> &
    Pick<FondoParticipanteRaw, 'proyectoId' | 'rol'>
): FondoParticipanteRaw {
  return {
    nombre: null,
    email: null,
    cargo: null,
    proyecto: { proyecto: 'Proyecto A' },
    user: null,
    ...patch,
  };
}

describe('mapParticipanteToListadoRow', () => {
  it('usa user.name y user.email cuando hay cuenta', () => {
    const row = mapParticipanteToListadoRow(
      raw({
        proyectoId: 'p1',
        rol: 'Docente',
        nombre: 'Nombre local',
        email: 'local@test.cl',
        cargo: 'Jefe de carrera',
        user: { name: 'Ana User', email: 'ana@test.cl' },
      })
    );
    expect(row).toEqual({
      proyecto: 'Proyecto A',
      nombre: 'Ana User',
      rol: 'Docente',
      cargo: 'Jefe de carrera',
      email: 'ana@test.cl',
    });
  });

  it('cae a nombre/email del participante y cargo —', () => {
    const row = mapParticipanteToListadoRow(
      raw({
        proyectoId: 'p1',
        rol: 'Estudiante',
        nombre: 'Pedro',
        email: 'pedro@test.cl',
        cargo: null,
        user: null,
      })
    );
    expect(row.nombre).toBe('Pedro');
    expect(row.email).toBe('pedro@test.cl');
    expect(row.cargo).toBe('—');
  });

  it('usa Sin nombre y — cuando faltan datos', () => {
    const row = mapParticipanteToListadoRow(
      raw({
        proyectoId: 'p1',
        rol: 'Colaborador',
        nombre: null,
        email: null,
        cargo: '  ',
        user: null,
      })
    );
    expect(row.nombre).toBe('Sin nombre');
    expect(row.email).toBe('—');
    expect(row.cargo).toBe('—');
  });
});

describe('aggregateFondoParticipantes', () => {
  it('incluye los 6 roles con ceros cuando no hay participantes', () => {
    const result = aggregateFondoParticipantes([]);
    expect(result.total).toBe(0);
    expect(result.listado).toEqual([]);
    expect(result.porRol.map((r) => r.rol)).toEqual([
      'Encargado',
      'Coordinador',
      'Colaborador',
      'Docente',
      'Estudiante',
      'Beneficiario',
    ]);
    expect(result.porRol.every((r) => r.count === 0)).toBe(true);
  });

  it('cuenta una vez por participación (misma persona en varios proyectos)', () => {
    const result = aggregateFondoParticipantes([
      raw({
        proyectoId: 'p1',
        rol: 'Coordinador',
        email: 'same@test.cl',
        nombre: 'Same',
        proyecto: { proyecto: 'Alpha' },
      }),
      raw({
        proyectoId: 'p2',
        rol: 'Coordinador',
        email: 'same@test.cl',
        nombre: 'Same',
        proyecto: { proyecto: 'Beta' },
      }),
      raw({
        proyectoId: 'p1',
        rol: 'Docente',
        email: 'doc@test.cl',
        nombre: 'Doc',
      }),
    ]);
    expect(result.total).toBe(3);
    expect(result.porRol.find((r) => r.rol === 'Coordinador')?.count).toBe(2);
    expect(result.porRol.find((r) => r.rol === 'Docente')?.count).toBe(1);
    expect(result.listado).toHaveLength(3);
  });

  it('ignora roles desconocidos en el conteo por rol pero no en el total del listado filtrado', () => {
    const result = aggregateFondoParticipantes([
      raw({ proyectoId: 'p1', rol: 'Encargado', nombre: 'E' }),
      raw({ proyectoId: 'p1', rol: 'RolViejo', nombre: 'X' }),
    ]);
    expect(result.porRol.find((r) => r.rol === 'Encargado')?.count).toBe(1);
    expect(result.total).toBe(1);
    expect(result.listado).toHaveLength(1);
    expect(result.listado[0].rol).toBe('Encargado');
  });

  it('ordena el listado por proyecto y luego por nombre', () => {
    const result = aggregateFondoParticipantes([
      raw({
        proyectoId: 'p2',
        rol: 'Docente',
        nombre: 'Zoe',
        proyecto: { proyecto: 'Beta' },
      }),
      raw({
        proyectoId: 'p1',
        rol: 'Docente',
        nombre: 'Ana',
        proyecto: { proyecto: 'Alpha' },
      }),
      raw({
        proyectoId: 'p1',
        rol: 'Estudiante',
        nombre: 'Bruno',
        proyecto: { proyecto: 'Alpha' },
      }),
    ]);
    expect(result.listado.map((r) => `${r.proyecto}|${r.nombre}`)).toEqual([
      'Alpha|Ana',
      'Alpha|Bruno',
      'Beta|Zoe',
    ]);
  });
});

describe('buildFondoParticipantesExcelAoa', () => {
  it('incluye cabeceras y una fila por participación', () => {
    const listado: FondoParticipanteListadoRow[] = [
      {
        proyecto: 'Alpha',
        nombre: 'Ana',
        rol: 'Docente',
        cargo: 'Jefa',
        email: 'ana@test.cl',
      },
    ];
    expect(buildFondoParticipantesExcelAoa(listado)).toEqual([
      [
        'Proyecto',
        'Nombre participante',
        'Rol',
        'Cargo',
        'Correo',
      ],
      ['Alpha', 'Ana', 'Docente', 'Jefa', 'ana@test.cl'],
    ]);
  });

  it('solo cabeceras cuando el listado está vacío', () => {
    const aoa = buildFondoParticipantesExcelAoa([]);
    expect(aoa).toHaveLength(1);
    expect(aoa[0][0]).toBe('Proyecto');
  });
});

describe('fondoParticipantesExcelFilename', () => {
  it('sanitiza el nombre del fondo', () => {
    expect(fondoParticipantesExcelFilename('Innovación Docente')).toBe(
      'participantes_Innovacin_Docente.xlsx'
    );
  });

  it('usa fondo por defecto si el nombre queda vacío', () => {
    expect(fondoParticipantesExcelFilename('@@@')).toBe(
      'participantes_fondo.xlsx'
    );
  });
});
