function getProp(obj: Record<string, unknown>, snake: string, camel: string): unknown {
  const v = obj[snake] ?? obj[camel];
  if (v !== undefined && v !== null) return v;
  return Reflect.get(obj, snake) ?? Reflect.get(obj, camel);
}

/** Build row from columns + record array (Realtime wire format). */
function rowFromColumnsRecord(
  columns: { name: string }[],
  record: unknown[]
): Record<string, unknown> | null {
  if (!Array.isArray(record) || !Array.isArray(columns) || columns.length !== record.length)
    return null;
  const o: Record<string, unknown> = {};
  columns.forEach((col, i) => {
    o[col.name] = record[i];
  });
  return o;
}

/**
 * Supabase Realtime payload: payload.new can have non-enumerable props (JSON.stringify => "{}").
 * Supports: object with snake/camel keys, or columns[] + record[] array format.
 * Normalizes nested payload (e.g. callback receives { payload: { new, ... } }).
 */
export function parseRealtimeSupportMessage(payload: {
  new?: unknown;
  record?: unknown;
  data?: { new?: unknown };
  payload?: unknown;
  columns?: { name: string }[];
}): {
  id: string;
  user_id: string;
  contenido: string;
  is_from_admin: boolean;
  created_at: string;
} | null {
  let pl = payload as Record<string, unknown>;
  if (pl?.payload != null && typeof pl.payload === 'object' && !Array.isArray(pl.payload)) {
    pl = pl.payload as Record<string, unknown>;
  }
  let o: Record<string, unknown> | null = null;
  const columns = pl?.columns as { name: string }[] | undefined;
  const recordArr = pl?.record as unknown[] | undefined;
  if (Array.isArray(columns) && Array.isArray(recordArr)) {
    o = rowFromColumnsRecord(columns, recordArr);
  }
  if (!o) {
    const raw = pl?.new ?? pl?.record ?? (pl?.data as Record<string, unknown>)?.new;
    if (!raw || typeof raw !== 'object') return null;
    o = raw as Record<string, unknown>;
  }
  const id = getProp(o, 'id', 'id');
  const user_id = getProp(o, 'user_id', 'userId');
  const contenido = getProp(o, 'contenido', 'contenido');
  const is_from_admin = getProp(o, 'is_from_admin', 'isFromAdmin');
  const created_at = getProp(o, 'created_at', 'createdAt');
  if (
    id == null ||
    user_id == null ||
    contenido == null ||
    is_from_admin == null ||
    created_at == null
  )
    return null;
  return {
    id: String(id),
    user_id: String(user_id),
    contenido: String(contenido),
    is_from_admin: Boolean(is_from_admin),
    created_at: String(created_at),
  };
}
