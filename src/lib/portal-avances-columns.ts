import { portalAvancesIsExcelFondo } from '@/lib/portal-avances';

export type PortalAvancesColumnId =
  | 'proyecto'
  | 'encargado'
  | 'sede'
  | 'escuelas'
  | 'carreras'
  | 'asignaturas'
  | 'idVinculamos'
  | 'estudiantes'
  | 'docentes'
  | 'beneficiarios'
  | 'presupuestoAdjudicado'
  | 'gantt'
  | 'indicadores'
  | 'presupuestoSolicitado'
  | 'presupuestoEjecutado'
  | 'honorarios'
  | 'saldo';

export type PortalAvancesColumnDef = {
  id: PortalAvancesColumnId;
  label: string;
};

const PEOPLE_COLUMNS: PortalAvancesColumnDef[] = [
  { id: 'idVinculamos', label: 'ID Vinculamos' },
  { id: 'estudiantes', label: 'Estudiantes' },
  { id: 'docentes', label: 'Docentes' },
  { id: 'beneficiarios', label: 'Beneficiarios' },
];

const BASE_COLUMNS: PortalAvancesColumnDef[] = [
  { id: 'proyecto', label: 'Nombre proyecto' },
  { id: 'sede', label: 'Sede' },
  { id: 'escuelas', label: 'Escuelas' },
  { id: 'carreras', label: 'Carreras' },
  { id: 'asignaturas', label: 'Asignaturas' },
  ...PEOPLE_COLUMNS,
  { id: 'presupuestoAdjudicado', label: 'Presupuesto adjudicado' },
  { id: 'gantt', label: 'Gantt' },
  { id: 'indicadores', label: 'Indicadores' },
  { id: 'presupuestoSolicitado', label: 'Operativo solicitado' },
  { id: 'presupuestoEjecutado', label: 'Operativo ejecutado' },
  { id: 'honorarios', label: 'Honorarios' },
  { id: 'saldo', label: 'Delta' },
];

const IMPULSA_COLUMNS: PortalAvancesColumnDef[] = [
  { id: 'proyecto', label: 'Nombre proyecto' },
  { id: 'encargado', label: 'Encargado/a' },
  { id: 'sede', label: 'Sede' },
  { id: 'escuelas', label: 'Escuelas' },
  { id: 'carreras', label: 'Carreras' },
  { id: 'asignaturas', label: 'Asignaturas' },
  ...PEOPLE_COLUMNS,
  { id: 'gantt', label: 'Gantt' },
  { id: 'indicadores', label: 'Indicadores' },
  { id: 'presupuestoAdjudicado', label: 'Presupuesto adjudicado' },
  { id: 'presupuestoSolicitado', label: 'Operativo solicitado' },
  { id: 'presupuestoEjecutado', label: 'Operativo ejecutado' },
  { id: 'honorarios', label: 'Honorarios' },
  { id: 'saldo', label: 'Delta' },
];

export function portalAvancesColumnsForFondo(
  fondoNombre: string,
): PortalAvancesColumnDef[] {
  return portalAvancesIsExcelFondo(fondoNombre)
    ? IMPULSA_COLUMNS
    : BASE_COLUMNS;
}

export function defaultPortalAvancesVisibleColumns(
  fondoNombre: string,
): PortalAvancesColumnId[] {
  return portalAvancesColumnsForFondo(fondoNombre).map((c) => c.id);
}

/** Checked = visible. No deja la lista vacía. */
export function togglePortalAvancesColumn(
  visible: PortalAvancesColumnId[],
  id: PortalAvancesColumnId,
): PortalAvancesColumnId[] {
  if (visible.includes(id)) {
    if (visible.length <= 1) return visible;
    return visible.filter((item) => item !== id);
  }
  return [...visible, id];
}

export function portalAvancesColumnsFilterActive(
  visible: PortalAvancesColumnId[],
  fondoNombre: string,
): boolean {
  const all = defaultPortalAvancesVisibleColumns(fondoNombre);
  if (visible.length !== all.length) return true;
  const set = new Set(visible);
  return all.some((id) => !set.has(id));
}

export function sanitizePortalAvancesVisibleColumns(
  visible: PortalAvancesColumnId[],
  fondoNombre: string,
): PortalAvancesColumnId[] {
  const allowed = new Set(
    portalAvancesColumnsForFondo(fondoNombre).map((c) => c.id),
  );
  const next = visible.filter((id) => allowed.has(id));
  return next.length > 0
    ? next
    : defaultPortalAvancesVisibleColumns(fondoNombre);
}

/** Anchos iniciales (px) alineados con la tabla actual. */
export const PORTAL_AVANCES_DEFAULT_COLUMN_WIDTHS: Record<
  PortalAvancesColumnId,
  number
> = {
  proyecto: 260,
  encargado: 220,
  sede: 140,
  escuelas: 260,
  carreras: 220,
  asignaturas: 220,
  idVinculamos: 140,
  estudiantes: 110,
  docentes: 100,
  beneficiarios: 120,
  presupuestoAdjudicado: 160,
  gantt: 140,
  indicadores: 140,
  presupuestoSolicitado: 160,
  presupuestoEjecutado: 160,
  honorarios: 140,
  saldo: 130,
};

export const PORTAL_AVANCES_COLUMN_WIDTH_MIN = 72;
export const PORTAL_AVANCES_COLUMN_WIDTH_MAX = 640;

export function clampPortalAvancesColumnWidth(px: number): number {
  if (!Number.isFinite(px)) return PORTAL_AVANCES_COLUMN_WIDTH_MIN;
  return Math.min(
    PORTAL_AVANCES_COLUMN_WIDTH_MAX,
    Math.max(PORTAL_AVANCES_COLUMN_WIDTH_MIN, Math.round(px)),
  );
}

export function defaultPortalAvancesColumnWidths(): Record<
  PortalAvancesColumnId,
  number
> {
  return { ...PORTAL_AVANCES_DEFAULT_COLUMN_WIDTHS };
}

export function portalAvancesColumnWidthStyle(widthPx: number): {
  width: number;
  minWidth: number;
  maxWidth: number;
} {
  const w = clampPortalAvancesColumnWidth(widthPx);
  return { width: w, minWidth: w, maxWidth: w };
}
