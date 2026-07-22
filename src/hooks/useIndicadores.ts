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
      await queryClient.fetchQuery({
        queryKey: indicadoresKey(projectId),
        queryFn: async () => {
          const result = await getIndicadoresByProyecto(projectId);
          if (!result.success || !result.data) {
            throw new Error(result.error || 'Error al cargar indicadores');
          }
          return result.data;
        },
        staleTime: showLoading ? 0 : 60_000,
      });
    },
    [projectId, queryClient]
  );

  const patchIndicador = useCallback(
    (indicadorId: string, patch: IndicadorPatch) => {
      setData((prev) => {
        if (!prev) return prev;
        return mapIndicadores(prev, (ind) =>
          ind.id === indicadorId ? { ...ind, ...patch } : ind
        );
      });
    },
    [setData]
  );

  const removeIndicadorOptimistic = useCallback(
    (indicadorId: string) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          objetivosGenerales: prev.objetivosGenerales.map((og) => ({
            ...og,
            objetivosEspecificos: og.objetivosEspecificos.map((oe) => ({
              ...oe,
              indicadores: oe.indicadores.filter((i) => i.id !== indicadorId),
            })),
          })),
        };
      });
    },
    [setData]
  );

  const addIndicadorOptimistic = useCallback(
    (objetivoEspecificoId: string, indicador: IndicadorData) => {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          objetivosGenerales: prev.objetivosGenerales.map((og) => ({
            ...og,
            objetivosEspecificos: og.objetivosEspecificos.map((oe) =>
              oe.id === objetivoEspecificoId
                ? { ...oe, indicadores: [...oe.indicadores, indicador] }
                : oe
            ),
          })),
        };
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
        return {
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
        };
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
