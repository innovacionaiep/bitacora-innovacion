export const ALWAYS_VISIBLE_TABS = ['General', 'Historial'] as const;

export const OPTIONAL_PROJECT_TABS = [
  'Convenio',
  'Participantes',
  'Gantt',
  'Indicadores',
  'Presupuesto',
  'Seguimiento',
  'Escalamiento',
] as const;

export type AlwaysVisibleTab = (typeof ALWAYS_VISIBLE_TABS)[number];
export type OptionalProjectTab = (typeof OPTIONAL_PROJECT_TABS)[number];

export type ProjectNavTabId =
  | AlwaysVisibleTab
  | OptionalProjectTab
  | 'Resumen';

export const OPTIONAL_TAB_LABELS: Record<OptionalProjectTab, string> = {
  Convenio: 'Convenio',
  Participantes: 'Participantes',
  Gantt: 'Actividades',
  Indicadores: 'Indicadores',
  Presupuesto: 'Presupuesto',
  Seguimiento: 'Seguimiento',
  Escalamiento: 'Escalamiento',
};

export type LineaTabField =
  | 'tabConvenioEnabled'
  | 'tabParticipantesEnabled'
  | 'tabActividadesEnabled'
  | 'tabIndicadoresEnabled'
  | 'tabPresupuestoEnabled'
  | 'tabSeguimientoEnabled'
  | 'tabEscalamientoEnabled';

export const LINEA_TAB_FIELD: Record<OptionalProjectTab, LineaTabField> = {
  Convenio: 'tabConvenioEnabled',
  Participantes: 'tabParticipantesEnabled',
  Gantt: 'tabActividadesEnabled',
  Indicadores: 'tabIndicadoresEnabled',
  Presupuesto: 'tabPresupuestoEnabled',
  Seguimiento: 'tabSeguimientoEnabled',
  Escalamiento: 'tabEscalamientoEnabled',
};

export type LineaTabFlags = Record<LineaTabField, boolean>;

export type LineaModuloCatalogItem = LineaTabFlags & {
  id: string;
  nombre: string;
  fondoNombre: string;
};

export function isOptionalProjectTab(
  tabId: string
): tabId is OptionalProjectTab {
  return (OPTIONAL_PROJECT_TABS as readonly string[]).includes(tabId);
}

export function lineaCatalogKey(
  fondoNombre: string,
  lineaNombre: string
): string {
  return `${fondoNombre.trim()}\0${lineaNombre.trim()}`;
}

export function resolveLineaCatalogItem(
  fondo: string | null | undefined,
  lineaNombre: string | null | undefined,
  catalog: readonly LineaModuloCatalogItem[]
): LineaModuloCatalogItem | null {
  const fondoTrim = fondo?.trim();
  const lineaTrim = lineaNombre?.trim();
  if (!fondoTrim || !lineaTrim) return null;
  return (
    catalog.find(
      (item) =>
        item.fondoNombre === fondoTrim && item.nombre === lineaTrim
    ) ?? null
  );
}

export function isProjectTabVisible(
  tabId: ProjectNavTabId,
  fondo: string | null | undefined,
  lineaNombre: string | null | undefined,
  catalog: readonly LineaModuloCatalogItem[]
): boolean {
  if (tabId === 'General' || tabId === 'Historial') return true;
  if (tabId === 'Resumen') return false;
  if (!isOptionalProjectTab(tabId)) return true;
  const linea = resolveLineaCatalogItem(fondo, lineaNombre, catalog);
  if (!linea) return false;
  return linea[LINEA_TAB_FIELD[tabId]];
}

export function visibleProjectNavTabs<T extends { id: ProjectNavTabId }>(
  tabs: readonly T[],
  fondo: string | null | undefined,
  lineaNombre: string | null | undefined,
  catalog: readonly LineaModuloCatalogItem[]
): T[] {
  return tabs.filter((tab) =>
    isProjectTabVisible(tab.id, fondo, lineaNombre, catalog)
  );
}

export function convenioEnabledKeys(
  catalog: readonly Pick<
    LineaModuloCatalogItem,
    'fondoNombre' | 'nombre' | 'tabConvenioEnabled'
  >[]
): Set<string> {
  const keys = new Set<string>();
  for (const item of catalog) {
    if (item.tabConvenioEnabled) {
      keys.add(lineaCatalogKey(item.fondoNombre, item.nombre));
    }
  }
  return keys;
}

export function proyectoAplicaConvenio(
  fondo: string | null | undefined,
  lineaNombre: string | null | undefined,
  enabledKeys: ReadonlySet<string>
): boolean {
  const fondoTrim = fondo?.trim();
  const lineaTrim = lineaNombre?.trim();
  if (!fondoTrim || !lineaTrim) return false;
  return enabledKeys.has(lineaCatalogKey(fondoTrim, lineaTrim));
}

export function flagsToOptionalTabs(
  flags: LineaTabFlags
): Record<OptionalProjectTab, boolean> {
  return {
    Convenio: flags.tabConvenioEnabled,
    Participantes: flags.tabParticipantesEnabled,
    Gantt: flags.tabActividadesEnabled,
    Indicadores: flags.tabIndicadoresEnabled,
    Presupuesto: flags.tabPresupuestoEnabled,
    Seguimiento: flags.tabSeguimientoEnabled,
    Escalamiento: flags.tabEscalamientoEnabled,
  };
}
