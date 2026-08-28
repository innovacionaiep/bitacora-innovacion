import { describe, expect, it } from 'vitest';
import {
  clampPortalAvancesColumnWidth,
  defaultPortalAvancesColumnWidths,
  defaultPortalAvancesVisibleColumns,
  PORTAL_AVANCES_COLUMN_WIDTH_MAX,
  PORTAL_AVANCES_COLUMN_WIDTH_MIN,
  PORTAL_AVANCES_DEFAULT_COLUMN_WIDTHS,
  portalAvancesColumnsFilterActive,
  portalAvancesColumnsForFondo,
  portalAvancesColumnWidthStyle,
  sanitizePortalAvancesVisibleColumns,
  togglePortalAvancesColumn,
} from '@/lib/portal-avances-columns';

describe('portalAvancesColumnsForFondo', () => {
  it('incluye columnas extras solo en Impulsa', () => {
    const base = portalAvancesColumnsForFondo('Innovación Docente').map(
      (c) => c.id,
    );
    const impulsa = portalAvancesColumnsForFondo('Fondo Impulsa').map(
      (c) => c.id,
    );
    expect(base).not.toContain('idVinculamos');
    expect(impulsa).toContain('idVinculamos');
    expect(impulsa).toContain('estudiantes');
    expect(impulsa.indexOf('presupuestoAdjudicado')).toBeGreaterThan(
      impulsa.indexOf('indicadores'),
    );
  });
});

describe('togglePortalAvancesColumn', () => {
  it('oculta y muestra; no deja cero columnas', () => {
    const all = defaultPortalAvancesVisibleColumns('Innovación Docente');
    const withoutSede = togglePortalAvancesColumn(all, 'sede');
    expect(withoutSede).not.toContain('sede');
    expect(togglePortalAvancesColumn(withoutSede, 'sede')).toContain('sede');
    expect(togglePortalAvancesColumn(['proyecto'], 'proyecto')).toEqual([
      'proyecto',
    ]);
  });
});

describe('portalAvancesColumnsFilterActive', () => {
  it('activo solo si no están todas', () => {
    const fondo = 'Innovación Docente';
    const all = defaultPortalAvancesVisibleColumns(fondo);
    expect(portalAvancesColumnsFilterActive(all, fondo)).toBe(false);
    expect(
      portalAvancesColumnsFilterActive(
        togglePortalAvancesColumn(all, 'sede'),
        fondo,
      ),
    ).toBe(true);
  });
});

describe('sanitizePortalAvancesVisibleColumns', () => {
  it('al cambiar a fondo base descarta ids de Impulsa', () => {
    expect(
      sanitizePortalAvancesVisibleColumns(
        ['proyecto', 'idVinculamos', 'sede'],
        'Innovación Docente',
      ),
    ).toEqual(['proyecto', 'sede']);
  });
});

describe('portalAvances column widths', () => {
  it('tiene default para cada columna y clampea el rango', () => {
    const defaults = defaultPortalAvancesColumnWidths();
    expect(defaults.proyecto).toBe(PORTAL_AVANCES_DEFAULT_COLUMN_WIDTHS.proyecto);
    expect(clampPortalAvancesColumnWidth(10)).toBe(
      PORTAL_AVANCES_COLUMN_WIDTH_MIN,
    );
    expect(clampPortalAvancesColumnWidth(9999)).toBe(
      PORTAL_AVANCES_COLUMN_WIDTH_MAX,
    );
    expect(portalAvancesColumnWidthStyle(200)).toEqual({
      width: 200,
      minWidth: 200,
      maxWidth: 200,
    });
  });
});
