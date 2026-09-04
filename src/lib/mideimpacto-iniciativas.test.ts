import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  INICIATIVA_COLUMN_ORDER,
  MIDEIMPACTO_SEDE_BATCH_LIMIT,
  applySedesToRows,
  clampIniciativaColumnWidth,
  fetchMideimpactoIniciativasPage,
  fetchMideimpactoSedesByIds,
  mapIniciativaRow,
  parseIniciativasPage,
  portalMideimpactoAdjuntoHref,
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
      adjuntos: [],
      sede: '',
    });
  });

  it('aplana nested y pagina Laravel-like', () => {
    const parsed = parseIniciativasPage(laravelPayload(), 1);
    expect(parsed.page).toBe(2);
    expect(parsed.lastPage).toBe(4);
    expect(parsed.total).toBe(40);
    expect(parsed.rows[0]).toEqual({
      id: '12',
      nombre: 'Huertos urbanos',
      estado: 'activa',
      fechaInicio: '2024-01-01',
      fechaTermino: '2024-12-31',
      mecanismo: 'Extensión',
      adjuntos: [],
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
      adjuntos: [],
      sede: '',
    });
    expect(parseIniciativasPage([row], 1).lastPage).toBe(1);
  });

  it('mapea adjuntos con include y download_url', () => {
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
        {
          inev_codigo: 4,
          download_url:
            '/api/external/v1/iniciativas/9/adjuntos/4/descargar',
        },
      ],
    });
    expect(row.adjuntos).toEqual([
      {
        id: '4',
        nombre: 'Informe.pdf',
        downloadUrl:
          'https://api.mideimpacto.com/api/external/v1/iniciativas/9/adjuntos/4/descargar',
      },
    ]);
    expect(portalMideimpactoAdjuntoHref('9', row.adjuntos[0]!)).toBe(
      '/api/mideimpacto-adjunto?iniciativa=9&adjunto=4&nombre=Informe.pdf',
    );
  });

  it('mantiene las columnas fijas del listado', () => {
    expect(INICIATIVA_COLUMN_ORDER.map((c) => c.key)).toEqual([
      'id',
      'nombre',
      'estado',
      'fechaInicio',
      'fechaTermino',
      'mecanismo',
      'adjuntos',
    ]);
    expect(INICIATIVA_COLUMN_ORDER.map((c) => c.label)).toEqual([
      'ID',
      'Nombre proyecto',
      'Estado',
      'Fecha inicio',
      'Fecha término',
      'Mecanismo',
      'Adjuntos',
    ]);
  });

  it('acota el ancho de columna entre 72 y 640', () => {
    expect(clampIniciativaColumnWidth(40)).toBe(72);
    expect(clampIniciativaColumnWidth(900)).toBe(640);
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
        `${MIDEIMPACTO_API_BASE}/iniciativas?page=3&include=adjuntos`,
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
