import { describe, expect, it } from 'vitest';
import {
  ALWAYS_VISIBLE_TABS,
  LINEA_TAB_FIELD,
  OPTIONAL_PROJECT_TABS,
  convenioEnabledKeys,
  isOptionalProjectTab,
  isProjectTabVisible,
  proyectoAplicaConvenio,
  resolveLineaCatalogItem,
  visibleProjectNavTabs,
  type LineaModuloCatalogItem,
  type ProjectNavTabId,
} from './linea-modulos';

const NAV_TABS: { id: ProjectNavTabId; label: string }[] = [
  { id: 'Convenio', label: 'Convenio' },
  { id: 'General', label: 'General' },
  { id: 'Participantes', label: 'Participantes' },
  { id: 'Gantt', label: 'Actividades' },
  { id: 'Indicadores', label: 'Indicadores' },
  { id: 'Presupuesto', label: 'Presupuesto' },
  { id: 'Seguimiento', label: 'Seguimiento' },
  { id: 'Historial', label: 'Historial' },
  { id: 'Escalamiento', label: 'Escalamiento' },
];

function flags(partial: Partial<LineaModuloCatalogItem>): LineaModuloCatalogItem {
  return {
    id: partial.id ?? 'l1',
    nombre: partial.nombre ?? 'Linea A',
    fondoNombre: partial.fondoNombre ?? 'Fondo 1',
    tabConvenioEnabled: partial.tabConvenioEnabled ?? false,
    tabParticipantesEnabled: partial.tabParticipantesEnabled ?? true,
    tabActividadesEnabled: partial.tabActividadesEnabled ?? true,
    tabIndicadoresEnabled: partial.tabIndicadoresEnabled ?? true,
    tabPresupuestoEnabled: partial.tabPresupuestoEnabled ?? true,
    tabSeguimientoEnabled: partial.tabSeguimientoEnabled ?? true,
    tabEscalamientoEnabled: partial.tabEscalamientoEnabled ?? false,
  };
}

describe('linea-modulos', () => {
  it('maps Actividades (Gantt) to tabActividadesEnabled', () => {
    expect(LINEA_TAB_FIELD.Gantt).toBe('tabActividadesEnabled');
    expect(isOptionalProjectTab('Gantt')).toBe(true);
    expect(isOptionalProjectTab('General')).toBe(false);
    expect(OPTIONAL_PROJECT_TABS).not.toContain('General');
    expect(ALWAYS_VISIBLE_TABS).toEqual(['General', 'Historial']);
  });

  it('S1: without línea only General and Historial are visible', () => {
    const catalog = [flags({ tabConvenioEnabled: true, tabEscalamientoEnabled: true })];
    const visible = visibleProjectNavTabs(NAV_TABS, 'Fondo 1', null, catalog);
    expect(visible.map((t) => t.id)).toEqual(['General', 'Historial']);
    expect(
      visibleProjectNavTabs(NAV_TABS, 'Fondo 1', '   ', catalog).map((t) => t.id)
    ).toEqual(['General', 'Historial']);
  });

  it('unknown línea name hides optional tabs', () => {
    const catalog = [flags({ nombre: 'Linea A' })];
    const visible = visibleProjectNavTabs(
      NAV_TABS,
      'Fondo 1',
      'No existe',
      catalog
    );
    expect(visible.map((t) => t.id)).toEqual(['General', 'Historial']);
  });

  it('S2: same línea name on another fondo does not match', () => {
    const catalog = [
      flags({
        id: 'l-f1',
        nombre: 'A',
        fondoNombre: 'F1',
        tabConvenioEnabled: true,
      }),
      flags({
        id: 'l-f2',
        nombre: 'A',
        fondoNombre: 'F2',
        tabConvenioEnabled: false,
      }),
    ];
    expect(resolveLineaCatalogItem('F2', 'A', catalog)?.id).toBe('l-f2');
    expect(isProjectTabVisible('Convenio', 'F2', 'A', catalog)).toBe(false);
    expect(isProjectTabVisible('Convenio', 'F1', 'A', catalog)).toBe(true);
    expect(isProjectTabVisible('Participantes', 'F2', 'A', catalog)).toBe(true);
  });

  it('enables optional tabs according to flags and keeps nav order', () => {
    const catalog = [
      flags({
        tabConvenioEnabled: true,
        tabIndicadoresEnabled: false,
        tabEscalamientoEnabled: true,
        tabPresupuestoEnabled: false,
      }),
    ];
    const visible = visibleProjectNavTabs(
      NAV_TABS,
      'Fondo 1',
      'Linea A',
      catalog
    );
    expect(visible.map((t) => t.id)).toEqual([
      'Convenio',
      'General',
      'Participantes',
      'Gantt',
      'Seguimiento',
      'Historial',
      'Escalamiento',
    ]);
  });

  it('S3: convenio listing excludes projects without línea or with flag off', () => {
    const catalog = [
      flags({
        fondoNombre: 'F1',
        nombre: 'On',
        tabConvenioEnabled: true,
      }),
      flags({
        fondoNombre: 'F1',
        nombre: 'Off',
        tabConvenioEnabled: false,
      }),
    ];
    const keys = convenioEnabledKeys(catalog);
    expect(proyectoAplicaConvenio('F1', 'On', keys)).toBe(true);
    expect(proyectoAplicaConvenio('F1', 'Off', keys)).toBe(false);
    expect(proyectoAplicaConvenio('F1', null, keys)).toBe(false);
    expect(proyectoAplicaConvenio('F2', 'On', keys)).toBe(false);
  });

  it('Resumen is never visible via this helper', () => {
    const catalog = [flags({ tabConvenioEnabled: true })];
    expect(isProjectTabVisible('Resumen', 'Fondo 1', 'Linea A', catalog)).toBe(
      false
    );
  });
});
