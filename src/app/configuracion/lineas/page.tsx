'use client';

import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import Link from 'next/link';
import { Switch } from '@/components/ui/switch';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import {
  getLineasModulosMatrix,
  setLineaTabEnabled,
  type LineasModulosMatrix,
} from '@/lib/actions/linea-modulos-config';
import { setSubcategoriaLineaEnabled } from '@/lib/actions/desarrollo-tecnico-config';
import {
  OPTIONAL_PROJECT_TABS,
  OPTIONAL_TAB_LABELS,
  type OptionalProjectTab,
} from '@/lib/linea-modulos';

function OnOffCell({
  checked,
  disabled,
  onCheckedChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 justify-center">
      <span
        className={`text-[12px] ${checked ? 'text-emerald-700' : 'text-gray-400'}`}
      >
        {checked ? 'On' : 'Off'}
      </span>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        aria-label={ariaLabel}
      />
    </div>
  );
}

export default function ConfiguracionLineasPage() {
  const [matrix, setMatrix] = useState<LineasModulosMatrix>({
    fondos: [],
    dtCategorias: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  usePageTopLoader(loading);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getLineasModulosMatrix();
    if (!res.success) {
      setError(res.error || 'Error al cargar');
      setMatrix({ fondos: [], dtCategorias: [] });
    } else {
      setMatrix(res.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lineas = useMemo(
    () =>
      matrix.fondos.flatMap((fondo) =>
        fondo.lineas.map((linea) => ({ ...linea, fondoNombre: fondo.nombre }))
      ),
    [matrix.fondos]
  );

  const colCount = lineas.length;

  const handleTabToggle = async (
    lineaId: string,
    tab: OptionalProjectTab,
    enabled: boolean
  ) => {
    const key = `tab:${tab}:${lineaId}`;
    setTogglingKey(key);
    setError(null);
    setMatrix((prev) => ({
      ...prev,
      fondos: prev.fondos.map((fondo) => ({
        ...fondo,
        lineas: fondo.lineas.map((linea) =>
          linea.id === lineaId
            ? { ...linea, tabs: { ...linea.tabs, [tab]: enabled } }
            : linea
        ),
      })),
    }));
    const res = await setLineaTabEnabled(lineaId, tab, enabled);
    if (!res.success) {
      setError(res.error || 'No se pudo actualizar');
      setMatrix((prev) => ({
        ...prev,
        fondos: prev.fondos.map((fondo) => ({
          ...fondo,
          lineas: fondo.lineas.map((linea) =>
            linea.id === lineaId
              ? { ...linea, tabs: { ...linea.tabs, [tab]: !enabled } }
              : linea
          ),
        })),
      }));
    }
    setTogglingKey(null);
  };

  const handleDtToggle = async (
    subcategoriaId: string,
    lineaId: string,
    enabled: boolean
  ) => {
    const key = `dt:${subcategoriaId}:${lineaId}`;
    setTogglingKey(key);
    setError(null);
    setMatrix((prev) => ({
      ...prev,
      dtCategorias: prev.dtCategorias.map((cat) => ({
        ...cat,
        subcategorias: cat.subcategorias.map((sub) => {
          if (sub.id !== subcategoriaId) return sub;
          const next = enabled
            ? sub.excludedLineaIds.filter((id) => id !== lineaId)
            : sub.excludedLineaIds.includes(lineaId)
              ? sub.excludedLineaIds
              : [...sub.excludedLineaIds, lineaId];
          return { ...sub, excludedLineaIds: next };
        }),
      })),
    }));
    const res = await setSubcategoriaLineaEnabled(
      subcategoriaId,
      lineaId,
      enabled
    );
    if (!res.success) {
      setError(res.error || 'No se pudo actualizar');
      setMatrix((prev) => ({
        ...prev,
        dtCategorias: prev.dtCategorias.map((cat) => ({
          ...cat,
          subcategorias: cat.subcategorias.map((sub) => {
            if (sub.id !== subcategoriaId) return sub;
            const next = enabled
              ? sub.excludedLineaIds.includes(lineaId)
                ? sub.excludedLineaIds
                : [...sub.excludedLineaIds, lineaId]
              : sub.excludedLineaIds.filter((id) => id !== lineaId);
            return { ...sub, excludedLineaIds: next };
          }),
        })),
      }));
    }
    setTogglingKey(null);
  };

  return (
    <div className="h-full min-h-0 overflow-y-auto custom-scrollbar pt-4 pb-8">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Líneas</h2>
          <p className="mt-1 text-[13px] text-gray-500 leading-relaxed max-w-3xl">
            Activa o desactiva módulos para los proyectos de cada línea. General
            e Historial siempre se muestran. Las líneas se crean en{' '}
            <Link
              href="/configuracion/validacion"
              className="text-emerald-700 hover:underline"
            >
              Validación de datos → Fondos
            </Link>
            .
          </p>
        </div>

        {loading ? (
          <div className="py-10" />
        ) : colCount === 0 ? (
          <p className="text-[13px] text-gray-500">
            No hay líneas en el catálogo. Créalas dentro de cada fondo en
            Validación de datos.
          </p>
        ) : (
          <div className="border border-gray-200 rounded-md overflow-auto max-h-[calc(100vh-220px)]">
            <table className="min-w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-gray-50">
                  <th
                    rowSpan={2}
                    className="sticky left-0 top-0 z-30 bg-gray-50 border-b border-r border-gray-200 px-3 py-2 text-left text-[12px] font-medium text-gray-500 uppercase tracking-wide min-w-[200px]"
                  >
                    Módulo
                  </th>
                  {matrix.fondos.map((fondo) =>
                    fondo.lineas.length === 0 ? null : (
                      <th
                        key={fondo.id}
                        colSpan={fondo.lineas.length}
                        className="sticky top-0 z-20 border-b border-l border-gray-200 px-2 py-1.5 text-center text-[12px] font-semibold text-gray-700 bg-gray-50"
                      >
                        {fondo.nombre}
                      </th>
                    )
                  )}
                </tr>
                <tr className="bg-gray-50">
                  {lineas.map((linea) => (
                    <th
                      key={linea.id}
                      className="sticky top-8 z-20 border-b border-l border-gray-200 px-2 py-2 text-center text-[12px] font-medium text-gray-600 min-w-[120px] bg-gray-50"
                    >
                      {linea.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={colCount + 1}
                    className="sticky left-0 z-10 bg-gray-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Tabs del proyecto
                  </td>
                </tr>
                {OPTIONAL_PROJECT_TABS.map((tab) => (
                  <tr key={tab} className="hover:bg-gray-50/60">
                    <td className="sticky left-0 z-10 bg-white border-b border-gray-100 px-3 py-2 font-medium text-gray-800">
                      {OPTIONAL_TAB_LABELS[tab]}
                    </td>
                    {lineas.map((linea) => {
                      const enabled = linea.tabs[tab];
                      const toggleKey = `tab:${tab}:${linea.id}`;
                      return (
                        <td
                          key={linea.id}
                          className="border-b border-l border-gray-100 px-2 py-2 text-center"
                        >
                          <OnOffCell
                            checked={enabled}
                            disabled={togglingKey === toggleKey}
                            ariaLabel={`${OPTIONAL_TAB_LABELS[tab]} para ${linea.fondoNombre} / ${linea.nombre}`}
                            onCheckedChange={(checked) =>
                              handleTabToggle(linea.id, tab, checked)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}

                <tr>
                  <td
                    colSpan={colCount + 1}
                    className="sticky left-0 z-10 bg-gray-100 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500"
                  >
                    Desarrollo técnico
                  </td>
                </tr>
                {matrix.dtCategorias.length === 0 ? (
                  <tr>
                    <td
                      colSpan={colCount + 1}
                      className="px-3 py-3 text-[13px] text-gray-500"
                    >
                      No hay categorías de desarrollo técnico. Configúralas en{' '}
                      <Link
                        href="/configuracion/desarrollo-tecnico"
                        className="text-emerald-700 hover:underline"
                      >
                        Desarrollo técnico
                      </Link>
                      .
                    </td>
                  </tr>
                ) : (
                  matrix.dtCategorias.map((cat) => (
                    <Fragment key={cat.id}>
                      <tr>
                        <td
                          colSpan={colCount + 1}
                          className="sticky left-0 z-10 bg-gray-50 px-3 py-1.5 text-[12px] font-medium text-gray-600"
                        >
                          {cat.nombre}
                        </td>
                      </tr>
                      {cat.subcategorias.map((sub) => (
                        <tr key={sub.id} className="hover:bg-gray-50/60">
                          <td className="sticky left-0 z-10 bg-white border-b border-gray-100 px-3 py-2 text-gray-800">
                            {sub.nombre}
                          </td>
                          {lineas.map((linea) => {
                            const enabled = !sub.excludedLineaIds.includes(
                              linea.id
                            );
                            const toggleKey = `dt:${sub.id}:${linea.id}`;
                            return (
                              <td
                                key={linea.id}
                                className="border-b border-l border-gray-100 px-2 py-2 text-center"
                              >
                                <OnOffCell
                                  checked={enabled}
                                  disabled={togglingKey === toggleKey}
                                  ariaLabel={`${sub.nombre} para ${linea.fondoNombre} / ${linea.nombre}`}
                                  onCheckedChange={(checked) =>
                                    handleDtToggle(sub.id, linea.id, checked)
                                  }
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <p className="text-[13px] text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
