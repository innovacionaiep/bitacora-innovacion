import { describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';
import {
  emptyMideimpactoIniciativa,
  type EscuelaCarreraLine,
  type MideimpactoIniciativa,
  type MideimpactoIniciativaColumn,
  type ParticipanteExternoLine,
  type TerritorioLine,
} from '@/lib/mideimpacto-iniciativas';
import {
  buildVinculamosExcelSheet,
  downloadVinculamosExcel,
  vinculamosExcelFilename,
} from '@/lib/portal-vinculamos-excel';

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn((aoa: string[][]) => ({ aoa })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

function escuela(
  patch: Partial<EscuelaCarreraLine> & Pick<EscuelaCarreraLine, 'escuNombre'>,
): EscuelaCarreraLine {
  return {
    sedeNombre: 'Sede A',
    painEstudiantes: '',
    painEstudiantesFinal: '',
    painDocentes: '',
    painDocentesFinal: '',
    ...patch,
  };
}

function territorio(
  patch: Partial<TerritorioLine> & Pick<TerritorioLine, 'comuna'>,
): TerritorioLine {
  return {
    region: 'Valparaíso',
    provincia: 'Valparaíso',
    ...patch,
  };
}

function socio(
  patch: Partial<ParticipanteExternoLine> &
    Pick<ParticipanteExternoLine, 'socioComunitario'>,
): ParticipanteExternoLine {
  return {
    grupo: '',
    subgrupo: '',
    beneficiarios: '',
    beneficiariosFinal: '',
    ...patch,
  };
}

function row(
  patch: Partial<MideimpactoIniciativa> &
    Pick<MideimpactoIniciativa, 'id' | 'nombre'>,
): MideimpactoIniciativa {
  return {
    ...emptyMideimpactoIniciativa(),
    fechaInicio: '2024-03-01',
    fechaTermino: '2025-12-31',
    mecanismo: 'Apoyo a PYMES',
    ...patch,
  };
}

const COLS: MideimpactoIniciativaColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre proyecto' },
  { key: 'fechaTermino', label: 'Fecha término' },
  { key: 'escuNombre', label: 'Escuela' },
  { key: 'comuna', label: 'Comuna' },
  { key: 'socioComunitario', label: 'Socio Comunitario' },
  { key: 'gruposInteres', label: 'Grupos de Interés' },
];

describe('portal-vinculamos-excel', () => {
  it('una línea por grupo produce una fila de datos sin merges', () => {
    const sheet = buildVinculamosExcelSheet(
      [
        row({
          id: '10',
          nombre: 'NAN Talca',
          escuelasCarreras: [escuela({ escuNombre: 'AGE' })],
          territorios: [territorio({ comuna: 'Talca' })],
          participantesExternos: [socio({ socioComunitario: 'Sercotec Talca' })],
        }),
      ],
      COLS,
    );

    expect(sheet.aoa[0]).toEqual(COLS.map((col) => col.label));
    expect(sheet.aoa).toHaveLength(2);
    expect(sheet.aoa[1]).toEqual([
      '10',
      'NAN Talca',
      '2025-12-31',
      'AGE',
      'Talca',
      'Sercotec Talca',
      '—',
    ]);
    expect(sheet.merges).toEqual([]);
  });

  it('alinea escuelas y socios por índice, sin producto cartesiano', () => {
    const sheet = buildVinculamosExcelSheet(
      [
        row({
          id: '1',
          nombre: 'Proyecto Alfa',
          escuelasCarreras: [
            escuela({ escuNombre: 'Escuela 1' }),
            escuela({ escuNombre: 'Escuela 2' }),
          ],
          territorios: [territorio({ comuna: 'Viña' })],
          participantesExternos: [
            socio({ socioComunitario: 'Socio 1' }),
            socio({ socioComunitario: 'Socio 2' }),
            socio({ socioComunitario: 'Socio 3' }),
          ],
        }),
      ],
      COLS,
    );

    expect(sheet.aoa).toHaveLength(4);
    expect(sheet.aoa.slice(1).map((line) => line[3])).toEqual([
      'Escuela 1',
      'Escuela 2',
      '—',
    ]);
    expect(sheet.aoa.slice(1).map((line) => line[5])).toEqual([
      'Socio 1',
      'Socio 2',
      'Socio 3',
    ]);
    expect(sheet.aoa[1][1]).toBe('Proyecto Alfa');
    expect(sheet.aoa[2][1]).toBe('');
    expect(sheet.aoa[1][2]).toBe('2025-12-31');
    expect(sheet.aoa.slice(2).every((line) => line[2] === '')).toBe(true);
    expect(sheet.aoa[1][4]).toBe('Viña');
    expect(sheet.aoa.slice(2).every((line) => line[4] === '')).toBe(true);

    expect(sheet.merges).toEqual(
      expect.arrayContaining([
        { s: { r: 1, c: 1 }, e: { r: 3, c: 1 } },
        { s: { r: 1, c: 2 }, e: { r: 3, c: 2 } },
        { s: { r: 1, c: 0 }, e: { r: 3, c: 0 } },
        { s: { r: 1, c: 4 }, e: { r: 3, c: 4 } },
        { s: { r: 1, c: 6 }, e: { r: 3, c: 6 } },
      ]),
    );
    expect(sheet.merges.some((m) => m.s.c === 3 || m.s.c === 5)).toBe(false);
  });

  it('no duplica socios de Mujeres con energía (4 escuelas, 2 socios)', () => {
    const sheet = buildVinculamosExcelSheet(
      [
        row({
          id: '40',
          nombre: 'Mujeres con energía',
          escuelasCarreras: [
            escuela({
              sedeNombre: 'Puerto Montt',
              escuNombre: 'Desarrollo Social y Educación',
              painEstudiantesFinal: '0',
              painDocentesFinal: '2',
            }),
            escuela({
              sedeNombre: 'Puerto Montt',
              escuNombre: 'Artes e Industrias Creativas',
              painEstudiantesFinal: '0',
              painDocentesFinal: '1',
            }),
            escuela({
              sedeNombre: 'Puerto Montt',
              escuNombre: 'Estética Integral',
              painEstudiantesFinal: '0',
              painDocentesFinal: '1',
            }),
            escuela({
              sedeNombre: 'Puerto Montt',
              escuNombre: 'Administración y Gestión Empresarial',
              painEstudiantesFinal: '11',
              painDocentesFinal: '3',
            }),
          ],
          territorios: [territorio({ comuna: 'Puerto Montt' })],
          participantesExternos: [
            socio({
              socioComunitario: 'Grupo SAESA',
              beneficiariosFinal: '163',
            }),
            socio({
              socioComunitario: 'Centro de Negocios Sercotec Puerto Varas',
              beneficiariosFinal: '1',
            }),
          ],
        }),
      ],
      [
        { key: 'nombre', label: 'Nombre proyecto' },
        { key: 'escuNombre', label: 'Escuela' },
        { key: 'socioComunitario', label: 'Socio Comunitario' },
        { key: 'beneficiariosFinal', label: 'Beneficiarios Final' },
      ],
    );

    expect(sheet.aoa).toHaveLength(5);
    expect(sheet.aoa.slice(1).map((line) => line[1])).toEqual([
      'Desarrollo Social y Educación',
      'Artes e Industrias Creativas',
      'Estética Integral',
      'Administración y Gestión Empresarial',
    ]);
    expect(sheet.aoa.slice(1).map((line) => line[2])).toEqual([
      'Grupo SAESA',
      'Centro de Negocios Sercotec Puerto Varas',
      '—',
      '—',
    ]);
    expect(sheet.aoa.slice(1).map((line) => line[3])).toEqual([
      '163',
      '1',
      '—',
      '—',
    ]);
  });

  it('una lista vacía no elimina el proyecto', () => {
    const sheet = buildVinculamosExcelSheet(
      [
        row({
          id: '9',
          nombre: 'Sin socios',
          escuelasCarreras: [escuela({ escuNombre: 'AGE' })],
          territorios: [territorio({ comuna: 'Talca' })],
          participantesExternos: [],
        }),
      ],
      COLS,
    );

    expect(sheet.aoa).toHaveLength(2);
    expect(sheet.aoa[1][5]).toBe('—');
    expect(sheet.aoa[1][1]).toBe('Sin socios');
    expect(sheet.merges).toEqual([]);
  });

  it('no multiplica por escuelas si esas columnas están ocultas', () => {
    const sheet = buildVinculamosExcelSheet(
      [
        row({
          id: '1',
          nombre: 'Proyecto Alfa',
          escuelasCarreras: [
            escuela({ escuNombre: 'Escuela 1' }),
            escuela({ escuNombre: 'Escuela 2' }),
          ],
          territorios: [territorio({ comuna: 'Viña' })],
          participantesExternos: [
            socio({ socioComunitario: 'Socio 1' }),
            socio({ socioComunitario: 'Socio 2' }),
          ],
        }),
      ],
      COLS.filter((col) => col.key !== 'escuNombre'),
    );

    expect(sheet.aoa[0]).toEqual([
      'ID',
      'Nombre proyecto',
      'Fecha término',
      'Comuna',
      'Socio Comunitario',
      'Grupos de Interés',
    ]);
    expect(sheet.aoa).toHaveLength(3);
    expect(sheet.aoa[1][4]).toBe('Socio 1');
    expect(sheet.aoa[2][4]).toBe('Socio 2');
  });

  it('une chips con " | "', () => {
    const sheet = buildVinculamosExcelSheet(
      [
        row({
          id: '3',
          nombre: 'Con chips',
          gruposInteres: ['Personas mayores', 'Pyme'],
          tematicas: ['Salud'],
          escuelasCarreras: [escuela({ escuNombre: 'AGE' })],
          territorios: [territorio({ comuna: 'Talca' })],
          participantesExternos: [socio({ socioComunitario: 'Sercotec' })],
        }),
      ],
      [
        { key: 'nombre', label: 'Nombre proyecto' },
        { key: 'gruposInteres', label: 'Grupos de Interés' },
        { key: 'tematicas', label: 'Temáticas' },
      ],
    );

    expect(sheet.aoa[1][1]).toBe('Personas mayores | Pyme');
    expect(sheet.aoa[1][2]).toBe('Salud');
  });

  it('dos proyectos seguidos no solapan merges', () => {
    const sheet = buildVinculamosExcelSheet(
      [
        row({
          id: '1',
          nombre: 'Alfa',
          escuelasCarreras: [
            escuela({ escuNombre: 'E1' }),
            escuela({ escuNombre: 'E2' }),
          ],
          territorios: [territorio({ comuna: 'Talca' })],
          participantesExternos: [socio({ socioComunitario: 'S1' })],
        }),
        row({
          id: '2',
          nombre: 'Beta',
          escuelasCarreras: [escuela({ escuNombre: 'E3' })],
          territorios: [territorio({ comuna: 'Viña' })],
          participantesExternos: [
            socio({ socioComunitario: 'S2' }),
            socio({ socioComunitario: 'S3' }),
          ],
        }),
      ],
      COLS,
    );

    expect(sheet.aoa).toHaveLength(5);
    expect(sheet.aoa[1][1]).toBe('Alfa');
    expect(sheet.aoa[3][1]).toBe('Beta');
    expect(sheet.merges).toEqual(
      expect.arrayContaining([
        { s: { r: 1, c: 1 }, e: { r: 2, c: 1 } },
        { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
      ]),
    );
  });

  it('nombra el archivo con la fecha ISO', () => {
    expect(vinculamosExcelFilename(new Date('2026-09-15T12:00:00.000Z'))).toBe(
      'vinculamos_2026-09-15.xlsx',
    );
  });

  it('descarga la hoja Vinculamos con merges', async () => {
    await downloadVinculamosExcel(
      [
        row({
          id: '1',
          nombre: 'Alfa',
          escuelasCarreras: [
            escuela({ escuNombre: 'E1' }),
            escuela({ escuNombre: 'E2' }),
          ],
          territorios: [territorio({ comuna: 'Talca' })],
          participantesExternos: [socio({ socioComunitario: 'S1' })],
        }),
      ],
      COLS,
    );
    const ws = vi.mocked(XLSX.utils.aoa_to_sheet).mock.results.at(-1)?.value as {
      '!merges'?: unknown[];
    };
    expect(ws['!merges']?.length).toBeGreaterThan(0);
    expect(XLSX.utils.book_append_sheet).toHaveBeenCalledWith(
      expect.anything(),
      ws,
      'Vinculamos',
    );
    expect(XLSX.writeFile).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(/^vinculamos_\d{4}-\d{2}-\d{2}\.xlsx$/),
    );
  });
});
