'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getIndicadoresByProyecto,
  updateIndicadorResultado,
  type IndicadorData,
  type IndicadoresProyectoData,
} from '@/lib/actions/indicadores';
import { indicadoresKey } from '@/lib/query-keys';

type IndicadorPatch = Partial<
  Pick<
    IndicadorData,
    | 'nombre'
    | 'descripcion'
    | 'formaCalculo'
    | 'formatoNumero'
    | 'resultadoEsperado'
    | 'resultadoAlcanzado'
    | 'fechaInicio'
    | 'fechaFin'
    | 'porcentajeCumplimiento'
    | 'porcentajeAvance'
  >
>;

function parseNumericValue(value: string | null | undefined): number {
  if (!value || value === '') return 0;
  const cleaned = value
    .toString()
    .replace(/%/g, '')
    .replace(/,/g, '.')
    .trim();
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Misma fórmula que el server: (alcanzado / esperado) * 100, clamp 0–100 */
function calcPorcentajeAvance(
  resultadoAlcanzado: string,
  resultadoEsperado: string
): number {
  const esperado = parseNumericValue(resultadoEsperado);
  const alcanzado = parseNumericValue(resultadoAlcanzado);
  if (esperado <= 0) return 0;
  return Math.max(0, Math.min(100, (alcanzado / esperado) * 100));
}

/** Promedio de avance de cada OE (promedio de sus indicadores), luego promedio entre OEs */
function calcProgresoGeneral(data: IndicadoresProyectoData): number {
  const progresosObjetivosEspecificos = data.objetivosGenerales.flatMap((og) =>
    og.objetivosEspecificos.map((oe) => {
      if (oe.indicadores.length === 0) return 0;
      return (
        oe.indicadores.reduce((sum, ind) => sum + ind.porcentajeAvance, 0) /
        oe.indicadores.length
      );
    })
  );

  if (progresosObjetivosEspecificos.length === 0) return 0;

  return Math.round(
    progresosObjetivosEspecificos.reduce((sum, prog) => sum + prog, 0) /
      progresosObjetivosEspecificos.length
  );
}

function withRecalculatedProgreso(
  data: IndicadoresProyectoData
): IndicadoresProyectoData {
  return {
    ...data,
    progresoGeneral: calcProgresoGeneral(data),
  };
}

function mapIndicadores(
  data: IndicadoresProyectoData,
  mapper: (ind: IndicadorData) => IndicadorData
): IndicadoresProyectoData {
  return {
    ...data,
    objetivosGenerales: data.objetivosGenerales.map((og) => ({
      ...og,
      objetivosEspecificos: og.objetivosEspecificos.map((oe) => ({
        ...oe,
        indicadores: oe.indicadores.map(mapper),
      })),
    })),
  };
}

export function useIndicadores(projectId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: projectId ? indicadoresKey(projectId) : ['indicadores', 'none'],
    queryFn: async () => {
      if (!projectId) return null;
      const result = await getIndicadoresByProyecto(projectId);
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al cargar indicadores');
      }
      return result.data;
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const data = query.data ?? null;

  const setData = useCallback(
    (
      update:
        | IndicadoresProyectoData
        | null
        | ((
            prev: IndicadoresProyectoData | null
          ) => IndicadoresProyectoData | null)
    ) => {
      if (!projectId) return;
      queryClient.setQueryData<IndicadoresProyectoData | null>(
        indicadoresKey(projectId),
        (prev) => {
          const current = prev ?? null;
          return typeof update === 'function' ? update(current) : update;
        }
      );
    },
    [projectId, queryClient]
  );

  const fetchIndicadores = useCallback(
    async (showLoading: boolean = true) => {
      if (!projectId) return;
      if (showLoading) {
        await queryClient.invalidateQueries({
          queryKey: indicadoresKey(projectId),
        });
      }
      // staleTime: 0 fuerza refetch aunque la query siga "fresh" (60s);
      // si no, tras mutar se devolvía la caché y las barras no se actualizaban.
      await queryClient.fetchQuery({
        queryKey: indicadoresKey(projectId),
        queryFn: async () => {
          const result = await getIndicadoresByProyecto(projectId);
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Error al cargar indicadores');
          }
          return result.data;
        },
        staleTime: 0,
      });
    },
    [projectId, queryClient]
  );

  const patchIndicador = useCallback(
    (indicadorId: string, patch: IndicadorPatch) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = mapIndicadores(prev, (ind) => {
          if (ind.id !== indicadorId) return ind;
          const merged = { ...ind, ...patch };
          if (
            patch.resultadoAlcanzado !== undefined ||
            patch.resultadoEsperado !== undefined
          ) {
            // Si el caller no envió % explícitos, recalcular como el server
            if (
              patch.porcentajeAvance === undefined ||
              patch.porcentajeCumplimiento === undefined
            ) {
              const pct = calcPorcentajeAvance(
                merged.resultadoAlcanzado,
                merged.resultadoEsperado
              );
              if (patch.porcentajeAvance === undefined) {
                merged.porcentajeAvance = pct;
              }
              if (patch.porcentajeCumplimiento === undefined) {
                merged.porcentajeCumplimiento = pct;
              }
            }
          }
          return merged;
        });
        return withRecalculatedProgreso(next);
      });
    },
    [setData]
  );

  const removeIndicadorOptimistic = useCallback(
    (indicadorId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return withRecalculatedProgreso({
          ...prev,
          objetivosGenerales: prev.objetivosGenerales.map((og) => ({
            ...og,
            objetivosEspecificos: og.objetivosEspecificos.map((oe) => ({
              ...oe,
              indicadores: oe.indicadores.filter((i) => i.id !== indicadorId),
            })),
          })),
        });
      });
    },
    [setData]
  );

  const addIndicadorOptimistic = useCallback(
    (objetivoEspecificoId: string, indicador: IndicadorData) => {
      setData((prev) => {
        if (!prev) return prev;
        return withRecalculatedProgreso({
          ...prev,
          objetivosGenerales: prev.objetivosGenerales.map((og) => ({
            ...og,
            objetivosEspecificos: og.objetivosEspecificos.map((oe) =>
              oe.id === objetivoEspecificoId
                ? { ...oe, indicadores: [...oe.indicadores, indicador] }
                : oe
            ),
          })),
        });
      });
    },
    [setData]
  );

  const addObjetivoEspecificoOptimistic = useCallback(
    (objetivo: {
      id: string;
      descripcion: string;
      orden: number;
    }) => {
      setData((prev) => {
        if (!prev || prev.objetivosGenerales.length === 0) return prev;
        const [first, ...rest] = prev.objetivosGenerales;
        return withRecalculatedProgreso({
          ...prev,
          objetivosGenerales: [
            {
              ...first,
              objetivosEspecificos: [
                ...first.objetivosEspecificos,
                { ...objetivo, indicadores: [] },
              ],
            },
            ...rest,
          ],
        });
      });
    },
    [setData]
  );

  const updateIndicador = async (
    indicadorId: string,
    resultadoAlcanzado: string,
    porcentajeCumplimiento: number,
    porcentajeAvance: number
  ) => {
    const previous = data;
    patchIndicador(indicadorId, {
      resultadoAlcanzado,
      porcentajeCumplimiento,
      porcentajeAvance,
    });
    try {
      const result = await updateIndicadorResultado(
        indicadorId,
        resultadoAlcanzado,
        porcentajeCumplimiento,
        porcentajeAvance
      );

      if (result.success) {
        void fetchIndicadores(false);
        return { success: true };
      } else {
        if (previous) setData(previous);
        return { success: false, error: result.error };
      }
    } catch (err) {
      if (previous) setData(previous);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  };

  const calculateOverallProgress = useMemo(() => {
    return (): number => {
      if (!data || data.objetivosGenerales.length === 0) return 0;

      const allIndicators = data.objetivosGenerales.flatMap((og) =>
        og.objetivosEspecificos.flatMap((oe) => oe.indicadores)
      );

      if (allIndicators.length === 0) return 0;

      const totalProgress = allIndicators.reduce(
        (sum, indicator) => sum + indicator.porcentajeAvance,
        0
      );

      return Math.round(totalProgress / allIndicators.length);
    };
  }, [data]);

  return {
    data,
    setData,
    loading: query.isLoading && !query.data,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Error al cargar indicadores'
      : null,
    progresoGeneral: data?.progresoGeneral ?? 0,
    fetchIndicadores,
    patchIndicador,
    removeIndicadorOptimistic,
    addIndicadorOptimistic,
    addObjetivoEspecificoOptimistic,
    updateIndicador,
    calculateOverallProgress,
  };
}
