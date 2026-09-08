import {
  MIDEIMPACTO_API_BASE,
  MIDEIMPACTO_FETCH_TIMEOUT_MS,
  mideimpactoErrorMessage,
  mideimpactoIniciativaDetailUrl,
  mideimpactoIniciativasUrl,
} from '@/lib/mideimpacto-client';

export const INICIATIVA_STRING_COLUMN_KEYS = [
  'id',
  'codigoLegado',
  'nombre',
  'estado',
  'brecha',
  'diagnostico',
  'fechaInicio',
  'fechaTermino',
  'mecanismo',
  'tiacNombre',
  'sede',
] as const;

export type MideimpactoIniciativaStringKey =
  (typeof INICIATIVA_STRING_COLUMN_KEYS)[number];

export type EscuelaCarreraLine = {
  sedeNombre: string;
  escuNombre: string;
  painEstudiantes: string;
  painEstudiantesFinal: string;
  painDocentes: string;
  painDocentesFinal: string;
};

export type TerritorioLine = {
  region: string;
  provincia: string;
  comuna: string;
};

export type ParticipanteExternoLine = {
  socioComunitario: string;
  grupo: string;
  subgrupo: string;
  beneficiarios: string;
  beneficiariosFinal: string;
};

export type PreguntaLine = {
  pregunta: string;
  respuesta: string;
};

export type PreguntaChipColumnKey = 'gruposInteres' | 'tematicas';

export const ESCUELAS_CARRERAS_SUBCOLUMNS: readonly {
  key: keyof EscuelaCarreraLine;
  label: string;
}[] = [
  { key: 'sedeNombre', label: 'Sede*' },
  { key: 'escuNombre', label: 'Escuela' },
  { key: 'painEstudiantes', label: 'Estudiantes' },
  { key: 'painEstudiantesFinal', label: 'Estudiantes final' },
  { key: 'painDocentes', label: 'Docentes' },
  { key: 'painDocentesFinal', label: 'Docentes final' },
];

export const TERRITORIO_SUBCOLUMNS: readonly {
  key: keyof TerritorioLine;
  label: string;
}[] = [
  { key: 'region', label: 'Región' },
  { key: 'provincia', label: 'Provincia' },
  { key: 'comuna', label: 'Comuna' },
];

export const PARTICIPANTE_EXTERNO_SUBCOLUMNS: readonly {
  key: keyof ParticipanteExternoLine;
  label: string;
}[] = [
  { key: 'socioComunitario', label: 'Socio Comunitario' },
  { key: 'grupo', label: 'Grupo' },
  { key: 'subgrupo', label: 'Subgrupo' },
  { key: 'beneficiarios', label: 'Beneficiarios' },
  { key: 'beneficiariosFinal', label: 'Beneficiarios Final' },
];

export const PREGUNTA_CHIP_COLUMNS: readonly {
  key: PreguntaChipColumnKey;
  label: string;
}[] = [
  { key: 'gruposInteres', label: 'Grupos de Interés' },
  { key: 'tematicas', label: 'Temáticas' },
];

export type MideimpactoIniciativaColumnKey =
  | MideimpactoIniciativaStringKey
  | keyof EscuelaCarreraLine
  | keyof TerritorioLine
  | keyof ParticipanteExternoLine
  | PreguntaChipColumnKey;

export type MideimpactoIniciativa = Record<
  MideimpactoIniciativaStringKey,
  string
> & {
  escuelasCarreras: EscuelaCarreraLine[];
  territorios: TerritorioLine[];
  participantesExternos: ParticipanteExternoLine[];
  gruposInteres: string[];
  tematicas: string[];
};

export type MideimpactoIniciativaColumn = {
  key: MideimpactoIniciativaColumnKey;
  label: string;
};

export const INICIATIVA_COLUMN_ORDER: readonly MideimpactoIniciativaColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'codigoLegado', label: 'Código legado' },
  { key: 'nombre', label: 'Nombre proyecto' },
  { key: 'estado', label: 'Estado' },
  { key: 'brecha', label: 'Brecha' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'fechaInicio', label: 'Fecha inicio' },
  { key: 'fechaTermino', label: 'Fecha término' },
  { key: 'mecanismo', label: 'Mecanismo' },
  { key: 'tiacNombre', label: 'Tipo de actividad' },
  { key: 'sede', label: 'Sede' },
  ...ESCUELAS_CARRERAS_SUBCOLUMNS,
  ...TERRITORIO_SUBCOLUMNS,
  ...PARTICIPANTE_EXTERNO_SUBCOLUMNS,
  ...PREGUNTA_CHIP_COLUMNS,
];

export const INICIATIVA_COLUMN_WIDTH_MIN = 72;
export const INICIATIVA_COLUMN_WIDTH_MAX = 960;

const LONG_TEXT_KEYS = new Set<MideimpactoIniciativaColumnKey>([
  'nombre',
  'brecha',
  'diagnostico',
  'escuNombre',
  'socioComunitario',
  'gruposInteres',
  'tematicas',
]);

export const INICIATIVA_DEFAULT_COLUMN_WIDTHS: Record<
  MideimpactoIniciativaColumnKey,
  number
> = Object.fromEntries(
  INICIATIVA_COLUMN_ORDER.map((col) => [
    col.key,
    col.key === 'id'
      ? 100
      : col.key === 'nombre'
        ? 260
        : col.key === 'sedeNombre'
          ? 140
          : LONG_TEXT_KEYS.has(col.key)
            ? 280
            : 140,
  ]),
) as Record<MideimpactoIniciativaColumnKey, number>;

export function stackedLineValue<T extends Record<string, string>>(
  lines: T[],
  key: keyof T,
): string {
  if (lines.length === 0) return '';
  return lines.map((line) => String(line[key] ?? '').trim() || '—').join('\n');
}

export function isEscuelasCarrerasSubcolumn(
  key: MideimpactoIniciativaColumnKey,
): key is keyof EscuelaCarreraLine {
  return ESCUELAS_CARRERAS_SUBCOLUMNS.some((col) => col.key === key);
}

export function isTerritorioSubcolumn(
  key: MideimpactoIniciativaColumnKey,
): key is keyof TerritorioLine {
  return TERRITORIO_SUBCOLUMNS.some((col) => col.key === key);
}

export function isParticipanteExternoSubcolumn(
  key: MideimpactoIniciativaColumnKey,
): key is keyof ParticipanteExternoLine {
  return PARTICIPANTE_EXTERNO_SUBCOLUMNS.some((col) => col.key === key);
}

export function isPreguntaChipColumn(
  key: MideimpactoIniciativaColumnKey,
): key is PreguntaChipColumnKey {
  return PREGUNTA_CHIP_COLUMNS.some((col) => col.key === key);
}

export function stackedEscuelasCarrerasValue(
  lines: EscuelaCarreraLine[],
  key: keyof EscuelaCarreraLine,
): string {
  return stackedLineValue(lines, key);
}

export function stackedSubcolumnCell(
  row: MideimpactoIniciativa,
  key: MideimpactoIniciativaColumnKey,
): string {
  if (isEscuelasCarrerasSubcolumn(key)) {
    return stackedLineValue(row.escuelasCarreras, key) || '—';
  }
  if (isTerritorioSubcolumn(key)) {
    return stackedLineValue(row.territorios, key) || '—';
  }
  if (isParticipanteExternoSubcolumn(key)) {
    return stackedLineValue(row.participantesExternos, key) || '—';
  }
  if (isPreguntaChipColumn(key)) {
    return row[key].join(' | ') || '—';
  }
  return row[key] || '—';
}

export function clampIniciativaColumnWidth(px: number): number {
  if (!Number.isFinite(px)) return INICIATIVA_COLUMN_WIDTH_MIN;
  return Math.min(
    INICIATIVA_COLUMN_WIDTH_MAX,
    Math.max(INICIATIVA_COLUMN_WIDTH_MIN, Math.round(px)),
  );
}

export function defaultIniciativaColumnWidths(): Record<
  MideimpactoIniciativaColumnKey,
  number
> {
  return { ...INICIATIVA_DEFAULT_COLUMN_WIDTHS };
}

export function iniciativaColumnWidthStyle(widthPx: number): {
  width: number;
  minWidth: number;
  maxWidth: number;
} {
  const w = clampIniciativaColumnWidth(widthPx);
  return { width: w, minWidth: w, maxWidth: w };
}

export type MideimpactoIniciativasPage = {
  rows: MideimpactoIniciativa[];
  page: number;
  lastPage: number;
  total: number | null;
};

export type MideimpactoIniciativasFetchResult =
  | { ok: true; page: MideimpactoIniciativasPage }
  | { ok: false; error: string; status?: number };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function flattenBlock(value: unknown): string {
  if (value == null || value === '') return '';
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(flattenBlock).filter(Boolean).join('\n');
  }
  const rec = asRecord(value);
  if (!rec) return '';
  const keys = Object.keys(rec);
  const nonempty = keys.filter((key) => flattenBlock(rec[key]) !== '');
  const arrayKeys = nonempty.filter((key) => Array.isArray(rec[key]));
  if (arrayKeys.length === 1 && nonempty.length === 1) {
    return flattenBlock(rec[arrayKeys[0]]);
  }
  return nonempty
    .map((key) => {
      const inner = flattenBlock(rec[key]);
      if (!inner) return '';
      const compact = inner.includes('\n') ? inner.replace(/\n/g, ' | ') : inner;
      return `${key}: ${compact}`;
    })
    .filter(Boolean)
    .join(' · ');
}

function flattenNombre(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) {
    return value.map(flattenNombre).filter(Boolean).join(' | ');
  }
  const rec = asRecord(value);
  if (!rec) return '';
  return flattenNombre(
    rec.nombre ?? rec.name ?? rec.titulo ?? rec.title ?? rec.label ?? rec.codigo,
  );
}

function pick(rec: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    if (key in rec) {
      const text = flattenNombre(rec[key]);
      if (text) return text;
    }
  }
  return '';
}

function mergeIniciativaRecord(raw: unknown): Record<string, unknown> {
  const rec = asRecord(raw) ?? {};
  const generales = asRecord(rec.datos_generales) ?? {};
  return { ...generales, ...rec };
}

export function emptyMideimpactoIniciativa(): MideimpactoIniciativa {
  const strings = Object.fromEntries(
    INICIATIVA_STRING_COLUMN_KEYS.map((key) => [key, '']),
  ) as Record<MideimpactoIniciativaStringKey, string>;
  return {
    ...strings,
    escuelasCarreras: [],
    territorios: [],
    participantesExternos: [],
    gruposInteres: [],
    tematicas: [],
  };
}

export function concatIniciativaPages(
  current: MideimpactoIniciativa[],
  incoming: MideimpactoIniciativa[],
): MideimpactoIniciativa[] {
  const seen = new Set(
    current.map((row) => row.id.trim()).filter(Boolean),
  );
  const next = [...current];
  for (const row of incoming) {
    const id = row.id.trim();
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    next.push(row);
  }
  return next;
}

function nestedList(value: unknown, ...innerKeys: string[]): unknown[] {
  if (Array.isArray(value)) return value;
  const block = asRecord(value);
  if (!block) return [];
  for (const innerKey of innerKeys) {
    const inner = block[innerKey];
    if (Array.isArray(inner)) return inner;
  }
  const arrayKeys = Object.keys(block).filter((key) => Array.isArray(block[key]));
  if (arrayKeys.length === 1) return block[arrayKeys[0]] as unknown[];
  return [];
}

export function mapEscuelasCarrerasLines(value: unknown): EscuelaCarreraLine[] {
  return nestedList(value, 'escuelas_carreras').flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    return [
      {
        sedeNombre: pick(row, ['sede_nombre', 'sede']),
        escuNombre: pick(row, ['escu_nombre', 'escuela']),
        painEstudiantes: pick(row, ['pain_estudiantes']),
        painEstudiantesFinal: pick(row, ['pain_estudiantes_final']),
        painDocentes: pick(row, ['pain_docentes']),
        painDocentesFinal: pick(row, ['pain_docentes_final']),
      },
    ];
  });
}

export function mapTerritorioLines(value: unknown): TerritorioLine[] {
  return nestedList(value, 'territorios').flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const line = {
      region: pick(row, ['region', 'región', 'region_nombre', 'regi_nombre']),
      provincia: pick(row, ['provincia', 'provincia_nombre', 'prov_nombre']),
      comuna: pick(row, ['comuna', 'comuna_nombre', 'comu_nombre']),
    };
    if (!line.region && !line.provincia && !line.comuna) return [];
    return [line];
  });
}

export function mapParticipanteExternoLines(
  value: unknown,
): ParticipanteExternoLine[] {
  return nestedList(value, 'participantes', 'participantes_externos').flatMap((item) => {
    const row = asRecord(item);
    if (!row) return [];
    const line = {
      socioComunitario: pick(row, [
        'soco_nombre',
        'socio_comunitario',
        'socio_nombre',
      ]),
      grupo: pick(row, ['grupo_nombre', 'grupo']),
      subgrupo: pick(row, ['subgrupo_nombre', 'subgrupo']),
      beneficiarios: pick(row, ['total_participantes']),
      beneficiariosFinal: pick(row, ['total_participantes_final']),
    };
    if (
      !line.socioComunitario &&
      !line.grupo &&
      !line.subgrupo &&
      !line.beneficiarios &&
      !line.beneficiariosFinal
    ) {
      return [];
    }
    return [line];
  });
}

export function mapPreguntaLines(value: unknown): PreguntaLine[] {
  return nestedList(value, 'preguntas_iniciativas', 'preguntas').flatMap((item) => {
    if (typeof item === 'string' || typeof item === 'number') {
      const pregunta = String(item).trim();
      return pregunta ? [{ pregunta, respuesta: '' }] : [];
    }
    const row = asRecord(item);
    if (!row) return [];
    const pregunta = pick(row, [
      'pregunta',
      'preg_nombre',
      'preg_pregunta',
      'enunciado',
      'nombre',
      'titulo',
    ]);
    const respuesta = pickRespuesta(row);
    if (!pregunta && !respuesta) return [];
    return [{ pregunta, respuesta }];
  });
}

function uniqueChips(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function splitRespuestaChips(respuesta: string): string[] {
  return respuesta
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizePreguntaEnunciado(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function pivotPreguntaChips(lines: PreguntaLine[]): {
  gruposInteres: string[];
  tematicas: string[];
} {
  const gruposInteres: string[] = [];
  const tematicas: string[] = [];
  for (const line of lines) {
    const enunciado = normalizePreguntaEnunciado(line.pregunta);
    const chips = splitRespuestaChips(line.respuesta);
    if (enunciado.includes('siguientes grupos')) {
      gruposInteres.push(...chips);
    } else if (enunciado.includes('siguientes tematicas')) {
      tematicas.push(...chips);
    }
  }
  return {
    gruposInteres: uniqueChips(gruposInteres),
    tematicas: uniqueChips(tematicas),
  };
}

function pickRespuesta(row: Record<string, unknown>): string {
  const direct = pick(row, [
    'preg_respuesta',
    'resp_texto',
    'respuesta_texto',
  ]);
  if (direct) return direct;
  const opts =
    row.opciones_seleccionadas ?? row.opciones ?? row.respuestas;
  if (Array.isArray(opts) && opts.length > 0) {
    return opts
      .map((opt) => {
        const rec = asRecord(opt);
        if (!rec) return flattenNombre(opt);
        return pick(rec, [
          'respuesta',
          'opcion',
          'texto',
          'nombre',
          'label',
          'valor',
        ]);
      })
      .filter(Boolean)
      .join(' | ');
  }
  return pick(row, ['respuesta', 'valor']);
}

export function mapIniciativaRow(raw: unknown): MideimpactoIniciativa {
  const rec = mergeIniciativaRecord(raw);
  const blank = emptyMideimpactoIniciativa();
  return {
    ...blank,
    id: pick(rec, [
      'inic_codigo',
      'id',
      'uuid',
      'iniciativa_id',
      'iniciativaId',
    ]),
    codigoLegado: pick(rec, ['inic_codigo_legado']),
    nombre: pick(rec, ['inic_nombre', 'nombre', 'titulo', 'title', 'name']),
    estado: pick(rec, [
      'estado_texto',
      'estado',
      'status',
      'vigente',
      'estado_nombre',
    ]),
    brecha: pick(rec, ['inic_brecha']),
    diagnostico: pick(rec, ['inic_diagnostico']),
    fechaInicio: pick(rec, [
      'fecha_inicio',
      'fechaInicio',
      'start_date',
      'fechaInicioIniciativa',
    ]),
    fechaTermino: pick(rec, [
      'fecha_cierre',
      'fecha_termino',
      'fechaTermino',
      'fecha_fin',
      'fechaFin',
      'end_date',
    ]),
    mecanismo: pick(rec, [
      'meca_nombre',
      'mecanismo',
      'mecanismo_nombre',
      'mecanismoNombre',
    ]),
    tiacNombre: pick(rec, ['tiac_nombre']),
    sede: sedeNamesFromIniciativaDetail(raw),
    escuelasCarreras: mapEscuelasCarrerasLines(rec.escuelas_carreras),
    territorios: mapTerritorioLines(rec.territorios),
    participantesExternos: mapParticipanteExternoLines(
      rec.participantes_externos,
    ),
    ...pivotPreguntaChips(
      mapPreguntaLines(rec.preguntas_iniciativas ?? rec.preguntas),
    ),
  };
}

function extractList(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  const rec = asRecord(json);
  if (!rec) return [];
  const nestedKeys = [
    'iniciativas',
    'data',
    'results',
    'items',
    'records',
    'content',
    'result',
    'payload',
    'rows',
  ];
  for (const key of nestedKeys) {
    const value = rec[key];
    if (Array.isArray(value)) return value;
    const inner = asRecord(value);
    if (!inner) continue;
    for (const innerKey of nestedKeys) {
      const innerValue = inner[innerKey];
      if (Array.isArray(innerValue)) return innerValue;
    }
  }
  return [];
}

function toPositiveInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

export function parseIniciativasPage(
  json: unknown,
  requestedPage: number,
): MideimpactoIniciativasPage {
  const rec = asRecord(json);
  const data = rec ? asRecord(rec.data) : null;
  const meta = asRecord(rec?.meta) || asRecord(data?.meta) || rec;
  const page = toPositiveInt(
    meta?.page ?? meta?.current_page ?? meta?.currentPage ?? requestedPage,
    requestedPage,
  );
  const lastPage = toPositiveInt(
    meta?.total_pages ??
      meta?.totalPages ??
      meta?.last_page ??
      meta?.lastPage,
    1,
  );
  const totalRaw = meta?.total;
  const totalNum = totalRaw == null ? NaN : Number(totalRaw);
  return {
    rows: extractList(json).map(mapIniciativaRow),
    page,
    lastPage,
    total: Number.isFinite(totalNum) ? totalNum : null,
  };
}

export const MIDEIMPACTO_SEDE_BATCH_LIMIT = 12;
export const MIDEIMPACTO_SEDE_DELAY_MS = 250;

export function applySedesToRows(
  rows: MideimpactoIniciativa[],
  sedes: Record<string, string>,
): MideimpactoIniciativa[] {
  if (!Object.keys(sedes).length) return rows;
  return rows.map((row) => {
    const sede = sedes[row.id];
    if (!sede || row.sede.trim()) return row;
    return { ...row, sede };
  });
}

export function sedeNamesFromIniciativaDetail(json: unknown): string {
  const rec = asRecord(json);
  const data = rec ? asRecord(rec.data) : null;
  const iniciativa = (data ? asRecord(data.iniciativa) : null) ?? data ?? rec;
  if (!iniciativa) return '';
  const block = asRecord(iniciativa.escuelas_carreras);
  const list = Array.isArray(block?.escuelas_carreras)
    ? block.escuelas_carreras
    : Array.isArray(iniciativa.escuelas_carreras)
      ? iniciativa.escuelas_carreras
      : [];
  const names = [
    ...new Set(
      list
        .map((item) => {
          const row = asRecord(item);
          return row ? pick(row, ['sede_nombre', 'sede']) : '';
        })
        .filter(Boolean),
    ),
  ];
  return names.join(' | ');
}

export function mideimpactoRetryAfterMs(response: Response): number {
  const raw = response.headers.get('retry-after');
  if (!raw) return 60_000;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.max(1000, Math.floor(seconds * 1000));
  }
  const date = Date.parse(raw);
  if (Number.isFinite(date)) return Math.max(1000, date - Date.now());
  return 60_000;
}

export async function fetchMideimpactoSedesByIds(options: {
  apiKey: string;
  ids: string[];
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
}): Promise<{
  sedes: Record<string, string>;
  rateLimited: boolean;
  retryAfterMs?: number;
}> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? MIDEIMPACTO_API_BASE;
  const delayMs = options.delayMs ?? MIDEIMPACTO_SEDE_DELAY_MS;
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const ids = [
    ...new Set(options.ids.map((id) => id.trim()).filter(Boolean)),
  ].slice(0, MIDEIMPACTO_SEDE_BATCH_LIMIT);
  const sedes: Record<string, string> = {};
  for (let i = 0; i < ids.length; i += 1) {
    if (i > 0 && delayMs > 0) await sleep(delayMs);
    const id = ids[i];
    try {
      const response = await fetchImpl(
        mideimpactoIniciativaDetailUrl(id, baseUrl),
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${options.apiKey}`,
            Accept: 'application/json',
          },
          next: { revalidate: 86_400 },
        } as RequestInit,
      );
      if (response.status === 429) {
        return {
          sedes,
          rateLimited: true,
          retryAfterMs: mideimpactoRetryAfterMs(response),
        };
      }
      if (!response.ok) continue;
      const json = await response.json();
      const sede = sedeNamesFromIniciativaDetail(json);
      if (sede) sedes[id] = sede;
    } catch {
      /* skip this id */
    }
  }
  return { sedes, rateLimited: false };
}

export async function fetchMideimpactoIniciativasPage(options: {
  apiKey: string;
  page?: number;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
  timeoutMs?: number;
}): Promise<MideimpactoIniciativasFetchResult> {
  const page = toPositiveInt(options.page, 1);
  const baseUrl = options.baseUrl ?? MIDEIMPACTO_API_BASE;
  const url = mideimpactoIniciativasUrl(page, baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? MIDEIMPACTO_FETCH_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: mideimpactoErrorMessage(response.status),
      };
    }
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      return { ok: false, error: 'No se pudieron cargar las iniciativas' };
    }
    return { ok: true, page: parseIniciativasPage(json, page) };
  } catch {
    return { ok: false, error: 'No se pudieron cargar las iniciativas' };
  } finally {
    clearTimeout(timer);
  }
}
