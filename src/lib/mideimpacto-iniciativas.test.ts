import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  INICIATIVA_COLUMN_ORDER,
  MIDEIMPACTO_SEDE_BATCH_LIMIT,
  applySedesToRows,
  clampIniciativaColumnWidth,
  concatIniciativaPages,
  stackedEscuelasCarrerasValue,
  fetchMideimpactoIniciativasPage,
  fetchMideimpactoSedesByIds,
  mapIniciativaRow,
  parseIniciativasPage,
  sedeNamesFromIniciativaDetail,
} from '@/lib/mideimpacto-iniciativas';
import { MIDEIMPACTO_API_BASE } from '@/lib/mideimpacto-client';

afterEach(() => {
  vi.unstubAllGlobals();
});

function laravelPayload(overrides: Record<string, unknown> = {}) {
  return {
    data: [
      {
        id: 12,
        codigo: 'INI-001',
        nombre: 'Huertos urbanos',
        estado: 'activa',
        fecha_inicio: '2024-01-01',
        fecha_termino: '2024-12-31',
        mecanismo: { nombre: 'Extensión' },
        programa: { nombre: 'VcM' },
        sede: { nombre: 'Valparaíso' },
      },
    ],
    meta: {
      current_page: 2,
      last_page: 4,
      total: 40,
    },
    ...overrides,
  };
}

describe('mapIniciativaRow / parseIniciativasPage', () => {
  it('lee el envelope data.iniciativas y meta.page/total_pages', () => {
    const parsed = parseIniciativasPage(
      {
        code: 0,
        message: 'ok',
        data: {
          iniciativas: [
            {
              inic_codigo: 'INI-9',
              inic_nombre: 'Huertos urbanos',
              estado_texto: 'Activa',
              fecha_inicio: '2024-01-01',
              fecha_cierre: '2024-12-31',
              meca_nombre: 'Extensión',
            },
          ],
          meta: { page: 1, per_page: 200, total: 401, total_pages: 3 },
        },
      },
      1,
    );
    expect(parsed.page).toBe(1);
    expect(parsed.lastPage).toBe(3);
    expect(parsed.total).toBe(401);
    expect(parsed.rows[0]).toMatchObject({
      id: 'INI-9',
      nombre: 'Huertos urbanos',
      estado: 'Activa',
      fechaInicio: '2024-01-01',
      fechaTermino: '2024-12-31',
      mecanismo: 'Extensión',
    });
  });

  it('lee ficha anidada datos_generales y escuelas_carreras', () => {
    const row = mapIniciativaRow({
      inic_codigo: 20906,
      datos_generales: {
        inic_nombre: 'Huertos urbanos',
        estado_texto: 'En ejecución',
        inic_estado: 2,
        fecha_inicio: '2024-01-01',
        fecha_cierre: '2024-12-31',
        meca_nombre: 'Extensión',
        inic_brecha: 'Brecha X',
        inic_descripcion: 'Desc',
        inic_alcance: 'nacional',
      },
      escuelas_carreras: {
        escuelas_carreras: [
          {
            sede_nombre: 'Casa Central',
            escu_nombre: 'Salud',
            sede_codigo: 1,
          },
        ],
      },
      territorios: {
        territorios: [{ region: 'Valparaíso', comuna: 'Viña' }],
      },
      adjuntos: [
        {
          inev_codigo: 4,
          inev_nombre: 'Informe.pdf',
          download_url:
            'https://api.mideimpacto.com/api/external/v1/iniciativas/20906/adjuntos/4/descargar',
        },
      ],
    });
    expect(row).toMatchObject({
      id: '20906',
      nombre: 'Huertos urbanos',
      estado: 'En ejecución',
      fechaInicio: '2024-01-01',
      fechaTermino: '2024-12-31',
      mecanismo: 'Extensión',
      brecha: 'Brecha X',
      sede: 'Casa Central',
    });
    expect(row).not.toHaveProperty('descripcion');
    expect(row).not.toHaveProperty('estadoCodigo');
    expect(row).not.toHaveProperty('adjuntos');
    expect(row.escuelasCarreras).toEqual([
      {
        sedeNombre: 'Casa Central',
        escuNombre: 'Salud',
        painEstudiantes: '',
        painEstudiantesFinal: '',
        painDocentes: '',
        painDocentesFinal: '',
      },
    ]);
    expect(row.territorios).toEqual([
      {
        region: 'Valparaíso',
        provincia: '',
        comuna: 'Viña',
      },
    ]);
  });

  it('abre escuelas_carreras en subfilas con solo seis campos', () => {
    const row = mapIniciativaRow({
      inic_codigo: 1,
      escuelas_carreras: {
        escuelas_carreras: [
          {
            sede_nombre: 'Aiep Online',
            escu_nombre: 'Desarrollo Social y Educación',
            pain_estudiantes: 71,
            pain_estudiantes_final: 0,
            pain_docentes: 1,
            pain_docentes_final: 0,
            pain_total: 0,
            escu_codigo: 650,
            sede_codigo: 142,
          },
          {
            sede_nombre: 'Casa Central',
            escu_nombre: 'Salud',
            pain_estudiantes: 3,
            pain_estudiantes_final: 1,
            pain_docentes: 2,
            pain_docentes_final: 2,
          },
        ],
      },
    });
    expect(row.escuelasCarreras).toEqual([
      {
        sedeNombre: 'Aiep Online',
        escuNombre: 'Desarrollo Social y Educación',
        painEstudiantes: '71',
        painEstudiantesFinal: '0',
        painDocentes: '1',
        painDocentesFinal: '0',
      },
      {
        sedeNombre: 'Casa Central',
        escuNombre: 'Salud',
        painEstudiantes: '3',
        painEstudiantesFinal: '1',
        painDocentes: '2',
        painDocentesFinal: '2',
      },
    ]);
    expect(JSON.stringify(row.escuelasCarreras)).not.toMatch(/pain_total|escu_codigo/);
    expect(
      stackedEscuelasCarrerasValue(row.escuelasCarreras, 'sedeNombre'),
    ).toBe('Aiep Online\nCasa Central');
  });

  it('abre territorios, participantes externos y preguntas en subcolumnas', () => {
    const row = mapIniciativaRow({
      inic_codigo: 1,
      territorios: {
        territorios: [
          {
            region: 'Valparaíso',
            provincia: 'Valparaíso',
            comuna: 'Viña del Mar',
          },
          { region: 'Metropolitana', provincia: 'Santiago', comuna: 'Providencia' },
        ],
      },
      participantes_externos: {
        participantes: [
          {
            soco_nombre: 'Junta de Vecinos',
            grupo_nombre: 'Adultos',
            subgrupo_nombre: 'Mayores',
            total_participantes: 12,
            total_participantes_final: 0,
          },
        ],
      },
      preguntas_iniciativas: [
        {
          pregunta: '¿La iniciativa se desarrolla con alguno de los siguientes grupos?',
          opciones_seleccionadas: [
            { respuesta: 'Personas mayores' },
            { respuesta: 'Personas de pueblos originarios' },
          ],
        },
        {
          pregunta: '¿La iniciativa aborda alguna de las siguientes temáticas?',
          opciones_seleccionadas: [
            { respuesta: 'Sostenibilidad' },
            { respuesta: 'Medioambiente' },
          ],
        },
        {
          pregunta: 'Cobertura',
          opciones_seleccionadas: [{ respuesta: 'Comunal' }],
        },
      ],
    });
    expect(row.territorios).toEqual([
      {
        region: 'Valparaíso',
        provincia: 'Valparaíso',
        comuna: 'Viña del Mar',
      },
      {
        region: 'Metropolitana',
        provincia: 'Santiago',
        comuna: 'Providencia',
      },
    ]);
    expect(row.participantesExternos).toEqual([
      {
        socioComunitario: 'Junta de Vecinos',
        grupo: 'Adultos',
        subgrupo: 'Mayores',
        beneficiarios: '12',
        beneficiariosFinal: '0',
      },
    ]);
    expect(row.gruposInteres).toEqual([
      'Personas mayores',
      'Personas de pueblos originarios',
    ]);
    expect(row.tematicas).toEqual(['Sostenibilidad', 'Medioambiente']);
    expect(row).not.toHaveProperty('preguntas');
    expect(row).not.toHaveProperty('participantesIndicadores');
  });

  it('aplana nested y pagina Laravel-like', () => {
    const parsed = parseIniciativasPage(laravelPayload(), 1);
    expect(parsed.page).toBe(2);
    expect(parsed.lastPage).toBe(4);
    expect(parsed.total).toBe(40);
    expect(parsed.rows[0]).toMatchObject({
      id: '12',
      nombre: 'Huertos urbanos',
      estado: 'activa',
      fechaInicio: '2024-01-01',
      fechaTermino: '2024-12-31',
      mecanismo: 'Extensión',
      sede: '',
    });
  });

  it('acepta array plano y campos alternativos', () => {
    const row = mapIniciativaRow({
      uuid: 'abc',
      code: 'X-2',
      titulo: 'Taller',
      status: 'cerrada',
      fechaInicio: '2023-03-01',
      fecha_fin: '2023-06-01',
      mecanismo: 'Prácticas',
      programa: 'Programa A',
      sedes: [{ name: 'Viña' }, { nombre: 'Quillota' }],
    });
    expect(row).toMatchObject({
      id: 'abc',
      nombre: 'Taller',
      estado: 'cerrada',
      fechaInicio: '2023-03-01',
      fechaTermino: '2023-06-01',
      mecanismo: 'Prácticas',
      sede: '',
    });
    expect(parseIniciativasPage([row], 1).lastPage).toBe(1);
  });

  it('no mapea adjuntos', () => {
    const row = mapIniciativaRow({
      inic_codigo: '9',
      inic_nombre: 'Alfa',
      adjuntos: [
        {
          inev_codigo: 4,
          inev_nombre: 'Informe.pdf',
          download_url:
            '/api/external/v1/iniciativas/9/adjuntos/4/descargar',
        },
      ],
    });
    expect(row).not.toHaveProperty('adjuntos');
    expect(row.nombre).toBe('Alfa');
  });

  it('incluye solo las columnas que se muestran en Vinculamos', () => {
    const keys = INICIATIVA_COLUMN_ORDER.map((c) => c.key);
    expect(keys).toEqual(expect.arrayContaining([
      'id',
      'nombre',
      'estado',
      'brecha',
      'mecanismo',
      'sedeNombre',
      'escuNombre',
      'region',
      'provincia',
      'comuna',
      'socioComunitario',
      'grupo',
      'subgrupo',
      'beneficiarios',
      'beneficiariosFinal',
      'gruposInteres',
      'tematicas',
    ]));
    expect(keys).not.toEqual(expect.arrayContaining([
      'visible',
      'anho',
      'anhoHasta',
      'creado',
      'indi',
      'contribuciones',
      'ods',
      'edr',
      'pactoEducativo',
      'recursosDinero',
      'recursosInfra',
      'recursosRrhh',
      'productos',
      'responsables',
      'adjuntos',
      'estadoCodigo',
      'formato',
      'alcance',
      'descripcion',
      'objetivo',
      'escuelaEjecutora',
      'fechaEjecucion',
      'actualizado',
      'idCliente',
      'convCodigo',
      'convCodigoLegado',
      'convNombre',
      'progCodigo',
      'progCodigoLegado',
      'progNombre',
      'mecaCodigo',
      'mecaCodigoLegado',
      'tiacCodigo',
      'tiacCodigoLegado',
      'asignaturas',
      'unidades',
      'ambitosAccion',
      'proyectos',
      'desafios',
      'invi',
      'participantesIndicadores',
      'territorios',
      'participantesExternos',
      'preguntas',
      'pregunta',
      'respuesta',
    ]));
    expect(keys[0]).toBe('id');
    expect(keys.at(-1)).toBe('tematicas');
    expect(
      INICIATIVA_COLUMN_ORDER.find((c) => c.key === 'gruposInteres')?.label,
    ).toBe('Grupos de Interés');
    expect(
      INICIATIVA_COLUMN_ORDER.find((c) => c.key === 'tematicas')?.label,
    ).toBe('Temáticas');
    expect(
      INICIATIVA_COLUMN_ORDER.find((c) => c.key === 'sedeNombre')?.label,
    ).toBe('Sede*');
    expect(
      INICIATIVA_COLUMN_ORDER.find((c) => c.key === 'sede')?.label,
    ).toBe('Sede');
  });

  it('concatena páginas sin duplicar id y conserva el orden', () => {
    const a = mapIniciativaRow({ inic_codigo: '1', inic_nombre: 'Uno' });
    const b = mapIniciativaRow({ inic_codigo: '2', inic_nombre: 'Dos' });
    const dup = mapIniciativaRow({ inic_codigo: '1', inic_nombre: 'Uno otra vez' });
    const c = mapIniciativaRow({ inic_codigo: '3', inic_nombre: 'Tres' });
    expect(concatIniciativaPages([a, b], [dup, c]).map((row) => row.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('acota el ancho de columna entre 72 y 960', () => {
    expect(clampIniciativaColumnWidth(40)).toBe(72);
    expect(clampIniciativaColumnWidth(2000)).toBe(960);
    expect(clampIniciativaColumnWidth(200.4)).toBe(200);
  });

  it('no usa inic_territorio como sede', () => {
    const row = mapIniciativaRow({
      inic_codigo: 9,
      inic_nombre: 'Alfa',
      inic_territorio: 'Región de Valparaíso',
    });
    expect(row.sede).toBe('');
  });

  it('saca sedes únicas del detalle escuelas_carreras', () => {
    expect(
      sedeNamesFromIniciativaDetail({
        data: {
          iniciativa: {
            escuelas_carreras: {
              escuelas_carreras: [
                { sede_nombre: 'Casa Central' },
                { sede_nombre: 'Viña' },
                { sede_nombre: 'Casa Central' },
              ],
            },
          },
        },
      }),
    ).toBe('Casa Central | Viña');
  });
});

describe('fetchMideimpactoIniciativasPage', () => {
  it('envía Bearer y page, sin devolver el token en errores', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe(
        `${MIDEIMPACTO_API_BASE}/iniciativas?page=3`,
      );
      expect(init?.headers).toEqual(
        expect.objectContaining({
          Authorization: 'Bearer secret-token',
          Accept: 'application/json',
        }),
      );
      return new Response(JSON.stringify(laravelPayload()), { status: 200 });
    });

    const result = await fetchMideimpactoIniciativasPage({
      apiKey: 'secret-token',
      page: 3,
      fetchImpl,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.rows[0]?.nombre).toBe('Huertos urbanos');
      expect(result.page.page).toBe(2);
    }
  });

  it('no pide detalle de sede al listar', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify(laravelPayload()), { status: 200 }),
    );
    await fetchMideimpactoIniciativasPage({
      apiKey: 'secret-token',
      page: 1,
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('mapea 401, 403 y 429 sin incluir el token', async () => {
    for (const [status, message] of [
      [401, 'Token inválido o ausente'],
      [403, 'Sin permiso iniciativas:read'],
      [429, 'Límite de solicitudes excedido'],
    ] as const) {
      const fetchImpl = vi.fn(
        async () => new Response('nope', { status }),
      );
      const result = await fetchMideimpactoIniciativasPage({
        apiKey: 'secret-token',
        fetchImpl,
      });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe(message);
        expect(result.error).not.toContain('secret-token');
        expect(result.status).toBe(status);
      }
    }
  });
});

describe('fetchMideimpactoSedesByIds', () => {
  it('pide detalle por ID y aplica nombres únicos', async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: {
            iniciativa: {
              escuelas_carreras: {
                escuelas_carreras: [{ sede_nombre: 'Casa Central' }],
              },
            },
          },
        }),
        { status: 200 },
      );
    });
    const result = await fetchMideimpactoSedesByIds({
      apiKey: 'secret-token',
      ids: ['12'],
      fetchImpl,
      sleep: async () => {},
    });
    expect(result.sedes).toEqual({ '12': 'Casa Central' });
    expect(result.rateLimited).toBe(false);
    expect(fetchImpl).toHaveBeenCalledWith(
      `${MIDEIMPACTO_API_BASE}/iniciativas/12`,
      expect.anything(),
    );
  });

  it('corta el lote, para en 429 y no pierde las sedes ya leídas', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/iniciativas/a')) {
        return new Response(
          JSON.stringify({
            data: {
              iniciativa: {
                escuelas_carreras: {
                  escuelas_carreras: [{ sede_nombre: 'Viña' }],
                },
              },
            },
          }),
          { status: 200 },
        );
      }
      return new Response('limit', { status: 429 });
    });
    const ids = Array.from({ length: MIDEIMPACTO_SEDE_BATCH_LIMIT + 5 }, (_, i) =>
      String.fromCharCode(97 + i),
    );
    const result = await fetchMideimpactoSedesByIds({
      apiKey: 'secret-token',
      ids,
      fetchImpl,
      sleep: async () => {},
    });
    expect(fetchImpl.mock.calls.length).toBeLessThanOrEqual(MIDEIMPACTO_SEDE_BATCH_LIMIT);
    expect(result.sedes.a).toBe('Viña');
    expect(result.rateLimited).toBe(true);
  });

  it('mezcla sedes en filas sin pisar territorio', () => {
    const rows = [
      mapIniciativaRow({
        inic_codigo: '12',
        inic_nombre: 'A',
        inic_territorio: 'Región',
      }),
    ];
    expect(
      applySedesToRows(rows, { '12': 'Casa Central' })[0],
    ).toMatchObject({ sede: 'Casa Central' });
  });
});
