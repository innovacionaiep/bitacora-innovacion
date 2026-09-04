import {
  MIDEIMPACTO_API_BASE,
  MIDEIMPACTO_FETCH_TIMEOUT_MS,
  mideimpactoErrorMessage,
  mideimpactoIniciativaDetailUrl,
  mideimpactoIniciativasUrl,
  resolveMideimpactoDownloadUrl,
} from '@/lib/mideimpacto-client';

export type MideimpactoAdjunto = {
  id: string;
  nombre: string;
  downloadUrl: string;
};

export type MideimpactoIniciativa = {
  id: string;
  nombre: string;
  estado: string;
  fechaInicio: string;
  fechaTermino: string;
  mecanismo: string;
  adjuntos: MideimpactoAdjunto[];
  sede: string;
};

export type MideimpactoIniciativaColumnKey =
  | 'id'
  | 'nombre'
  | 'estado'
  | 'fechaInicio'
  | 'fechaTermino'
  | 'mecanismo'
  | 'adjuntos';

export type MideimpactoIniciativaColumn = {
  key: MideimpactoIniciativaColumnKey;
  label: string;
};

export const INICIATIVA_COLUMN_ORDER: readonly MideimpactoIniciativaColumn[] = [
  { key: 'id', label: 'ID' },
  { key: 'nombre', label: 'Nombre proyecto' },
  { key: 'estado', label: 'Estado' },
  { key: 'fechaInicio', label: 'Fecha inicio' },
  { key: 'fechaTermino', label: 'Fecha término' },
  { key: 'mecanismo', label: 'Mecanismo' },
  { key: 'adjuntos', label: 'Adjuntos' },
];

export const INICIATIVA_COLUMN_WIDTH_MIN = 72;
export const INICIATIVA_COLUMN_WIDTH_MAX = 640;

export const INICIATIVA_DEFAULT_COLUMN_WIDTHS: Record<
  MideimpactoIniciativaColumnKey,
  number
> = {
  id: 100,
  nombre: 260,
  estado: 120,
  fechaInicio: 130,
  fechaTermino: 130,
  mecanismo: 140,
  adjuntos: 240,
};

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

function pickAdjuntosList(rec: Record<string, unknown>): unknown[] {
  const direct = rec.adjuntos;
  if (Array.isArray(direct)) return direct;
  const nested = asRecord(direct);
  if (nested && Array.isArray(nested.adjuntos)) return nested.adjuntos;
  return [];
}

export function mapIniciativaAdjuntos(raw: unknown): MideimpactoAdjunto[] {
  const rec = asRecord(raw) ?? {};
  const seen = new Set<string>();
  const mapped: MideimpactoAdjunto[] = [];
  for (const item of pickAdjuntosList(rec)) {
    const row = asRecord(item) ?? {};
    const id = pick(row, ['inev_codigo', 'id', 'adjunto_id', 'adjuntoId']);
    const nombre = pick(row, [
      'inev_nombre',
      'inev_nombre_origen',
      'nombre',
      'filename',
      'name',
    ]);
    const downloadUrl = resolveMideimpactoDownloadUrl(
      pick(row, ['download_url', 'downloadUrl', 'url']),
    );
    if (!id && !downloadUrl) continue;
    const key = id || downloadUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    mapped.push({
      id: id || key,
      nombre: nombre || downloadUrl,
      downloadUrl,
    });
  }
  return mapped;
}

export function mapIniciativaRow(raw: unknown): MideimpactoIniciativa {
  const rec = asRecord(raw) ?? {};
  return {
    id: pick(rec, [
      'inic_codigo',
      'id',
      'uuid',
      'iniciativa_id',
      'iniciativaId',
    ]),
    nombre: pick(rec, ['inic_nombre', 'nombre', 'titulo', 'title', 'name']),
    estado: pick(rec, [
      'estado_texto',
      'inic_estado',
      'estado',
      'status',
      'vigente',
      'estado_nombre',
    ]),
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
    adjuntos: mapIniciativaAdjuntos(rec),
    sede: '',
  };
}

export function portalMideimpactoAdjuntoHref(
  iniciativaId: string,
  adjunto: MideimpactoAdjunto,
): string {
  const params = new URLSearchParams();
  params.set('iniciativa', iniciativaId.trim());
  params.set('adjunto', adjunto.id.trim());
  if (adjunto.nombre.trim()) params.set('nombre', adjunto.nombre.trim());
  return `/api/mideimpacto-adjunto?${params.toString()}`;
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
