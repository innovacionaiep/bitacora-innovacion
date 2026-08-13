export const DETALLE_MAX_CHARS = 180;

export const CONJUGACIONES_HISTORIAL: Record<string, string> = {
  Crear: 'creado',
  Actualizar: 'actualizado',
  Eliminar: 'eliminado',
  Comentar: 'comentado',
  'Agregar compromiso': 'agregado un compromiso',
  'Agregar gasto': 'agregado un gasto',
  'Eliminar gasto': 'eliminado un gasto',
  Agregar: 'agregado una reunión',
  'Agregar reunión': 'agregado una reunión',
  'Agregar participante': 'registrado',
  'Eliminar participante': 'eliminado',
  'Actualizar avance': 'actualizado el avance',
  'Subir evidencia': 'subido una evidencia',
  'Eliminar evidencia': 'eliminado una evidencia',
  'Subir convenio firmado': 'subido el convenio firmado',
  'Reemplazar convenio firmado': 'reemplazado el convenio firmado',
  'Eliminar convenio firmado': 'eliminado el convenio firmado',
  'Cambio de estado en kanban': 'cambiado',
  'Marcar realizada': 'marcado como realizada',
  Validar: 'validado',
};

export type HistorialMensajeInput = {
  accion: string;
  tabProyecto: string;
  elementoEspecifico: string;
  cambioGenerado: string;
  persona?: string;
};

export type ElementoParsed =
  | { kind: 'empty' }
  | { kind: 'plain'; text: string }
  | { kind: 'named'; article: string; nombre: string }
  | { kind: 'tarea-de-actividad'; tarea: string; actividad: string }
  | { kind: 'quoted-phrase'; parts: Array<{ text: string; strong: boolean }> };

export type HistorialSegmento = {
  role: 'persona' | 'verbo' | 'tab' | 'objeto' | 'detalle' | 'text';
  text: string;
};

const GENERIC_CAMBIO =
  /^(compromiso|indicador|actividad|tarea|reunión)\s+(eliminado|actualizado|creado|completado)\b/i;

function esCambioGenerico(cambio: string): boolean {
  const t = cambio.trim();
  if (!t) return true;
  if (GENERIC_CAMBIO.test(t)) return true;
  if (/^gasto eliminado(\s+del presupuesto)?$/i.test(t)) return true;
  if (/^reunión actualizada$/i.test(t)) return true;
  if (/^reunión n[°º.]?\s*\d+\s+creada$/i.test(t)) return true;
  if (/^indicador creado\b/i.test(t)) return true;
  if (/^nueva evidencia subida$/i.test(t)) return true;
  if (/^evidencia (subida|eliminada)$/i.test(t)) return true;
  return false;
}

function infinitivoAParticipio(verbo: string): string {
  const v = verbo.toLowerCase();
  if (/(ado|ido|ada|ida)$/.test(v) && !/(ar|er|ir)$/.test(v)) return v;
  if (v.endsWith('ar')) return `${v.slice(0, -2)}ado`;
  if (v.endsWith('er') || v.endsWith('ir')) return `${v.slice(0, -2)}ido`;
  return v;
}

export function conjugarAccion(accion: string, tabProyecto?: string): string {
  if (accion === 'Marcar realizada' && tabProyecto === 'Seguimiento') {
    return 'marcado como realizado';
  }
  const mapped = CONJUGACIONES_HISTORIAL[accion];
  if (mapped) return mapped;

  const trimmed = accion.trim();
  if (!trimmed) return '';
  const [first, ...rest] = trimmed.split(/\s+/);
  const participio = infinitivoAParticipio(first);
  const cola = rest.join(' ').toLowerCase();
  return cola ? `${participio} ${cola}` : participio;
}

export function parseElemento(
  elementoEspecifico: string,
  accion?: string
): ElementoParsed {
  const trimmed = elementoEspecifico.trim();
  if (!trimmed) return { kind: 'empty' };

  const tareaAct = trimmed.match(
    /^Tarea "([^"]+)" de Actividad "([^"]+)"$/
  );
  if (tareaAct) {
    return {
      kind: 'tarea-de-actividad',
      tarea: tareaAct[1],
      actividad: tareaAct[2],
    };
  }

  const simple = trimmed.match(/^(Tarea|Actividad|Indicador|Gasto) "([^"]+)"$/);
  if (simple) {
    const tipo = simple[1];
    const nombre = simple[2];
    const esEvidenciaActividad =
      tipo === 'Actividad' &&
      (accion === 'Subir evidencia' || accion === 'Eliminar evidencia');
    const articles: Record<string, string> = {
      Tarea: 'la tarea',
      Actividad: esEvidenciaActividad ? 'para la actividad' : 'la actividad',
      Indicador: 'el indicador',
      Gasto: 'el gasto',
    };
    return { kind: 'named', article: articles[tipo], nombre };
  }

  if (trimmed.includes('"')) {
    const chunks = trimmed.split('"');
    const parts: Array<{ text: string; strong: boolean }> = [];
    for (let i = 0; i < chunks.length; i++) {
      if (!chunks[i]) continue;
      parts.push({ text: chunks[i], strong: i % 2 === 1 });
    }
    if (parts.some((p) => p.strong)) {
      return { kind: 'quoted-phrase', parts };
    }
  }

  return { kind: 'plain', text: trimmed };
}

export function formatElementoPlain(parsed: ElementoParsed): string {
  switch (parsed.kind) {
    case 'empty':
      return '';
    case 'plain':
      return parsed.text;
    case 'named':
      return `${parsed.article} ${parsed.nombre}`;
    case 'tarea-de-actividad':
      return `la tarea ${parsed.tarea} de la actividad ${parsed.actividad}`;
    case 'quoted-phrase':
      return parsed.parts.map((p) => p.text).join('');
    default:
      return '';
  }
}

export function truncateDetalle(
  cambio: string,
  max = DETALLE_MAX_CHARS
): string {
  const t = cambio.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function normalizarParaCmp(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function resolveCambioVisible(input: HistorialMensajeInput): string | null {
  const raw = input.cambioGenerado?.trim() ?? '';
  if (!raw) return null;
  if (esCambioGenerico(raw)) return null;
  return truncateDetalle(raw);
}

export function resolveElementoVisible(
  input: HistorialMensajeInput,
  detalle: string | null
): ElementoParsed | null {
  const parsed = parseElemento(input.elementoEspecifico, input.accion);
  const plain = formatElementoPlain(parsed);
  if (!plain) return null;
  if (detalle) {
    const e = normalizarParaCmp(plain);
    const c = normalizarParaCmp(input.cambioGenerado);
    const eRaw = normalizarParaCmp(input.elementoEspecifico);
    if (e === c || eRaw === c) return null;
    if (c.startsWith(e) || c.startsWith(eRaw) || e.startsWith(c) || eRaw.startsWith(c)) {
      return null;
    }
  }
  return parsed;
}

export function resolveHistorialMensaje(input: HistorialMensajeInput): {
  participio: string;
  tab: string;
  elemento: ElementoParsed | null;
  detalle: string | null;
} {
  const detalle = resolveCambioVisible(input);
  return {
    participio: conjugarAccion(input.accion, input.tabProyecto),
    tab: input.tabProyecto,
    elemento: resolveElementoVisible(input, detalle),
    detalle,
  };
}

function pushText(out: HistorialSegmento[], text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last?.role === 'text') {
    last.text += text;
    return;
  }
  out.push({ role: 'text', text });
}

export function elementoASegmentos(parsed: ElementoParsed): HistorialSegmento[] {
  switch (parsed.kind) {
    case 'empty':
      return [];
    case 'plain':
      return [{ role: 'objeto', text: parsed.text }];
    case 'named':
      return [
        { role: 'text', text: `${parsed.article} ` },
        { role: 'objeto', text: parsed.nombre },
      ];
    case 'tarea-de-actividad':
      return [
        { role: 'text', text: 'la tarea ' },
        { role: 'objeto', text: parsed.tarea },
        { role: 'text', text: ' de la actividad ' },
        { role: 'objeto', text: parsed.actividad },
      ];
    case 'quoted-phrase':
      return parsed.parts.map((p) => ({
        role: p.strong ? 'objeto' : 'text',
        text: p.text,
      }));
    default:
      return [];
  }
}

export function historialASegmentos(
  input: HistorialMensajeInput
): HistorialSegmento[] {
  const { participio, tab, elemento, detalle } = resolveHistorialMensaje(input);
  const out: HistorialSegmento[] = [];
  if (input.persona) {
    out.push({ role: 'persona', text: input.persona });
    pushText(out, ' ha ');
  } else {
    pushText(out, 'ha ');
  }
  out.push({ role: 'verbo', text: participio });
  pushText(out, ' en ');
  out.push({ role: 'tab', text: tab });
  if (elemento) {
    pushText(out, ' ');
    for (const seg of elementoASegmentos(elemento)) {
      if (seg.role === 'text') pushText(out, seg.text);
      else out.push(seg);
    }
  }
  if (detalle) {
    pushText(out, ': "');
    out.push({ role: 'detalle', text: detalle });
    pushText(out, '"');
  }
  return out;
}

export function formatHistorialFrase(input: HistorialMensajeInput): string {
  return historialASegmentos(input)
    .map((s) => s.text)
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim();
}
