import { useState, useEffect } from 'react';
import {
  getIndicadoresByProyecto,
  updateIndicadorResultado,
  type IndicadoresProyectoData,
} from '@/lib/actions/indicadores';

export function useIndicadores(projectId: string | null) {
  const [data, setData] = useState<IndicadoresProyectoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIndicadores = async (showLoading: boolean = true) => {
    if (!projectId) {
      setData(null);
      return;
    }

    // Solo mostrar loading si se solicita explícitamente (primera carga)
    // Para actualizaciones silenciosas después de guardar, no mostrar loading
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const result = await getIndicadoresByProyecto(projectId);

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Error al cargar indicadores');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const updateIndicador = async (
    indicadorId: string,
    resultadoAlcanzado: string,
    porcentajeCumplimiento: number,
    porcentajeAvance: number
  ) => {
    try {
      const result = await updateIndicadorResultado(
        indicadorId,
        resultadoAlcanzado,
        porcentajeCumplimiento,
        porcentajeAvance
      );

      if (result.success) {
        // Refresh data after successful update
        await fetchIndicadores();
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Error desconocido',
      };
    }
  };

  const calculateOverallProgress = (): number => {
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

  useEffect(() => {
    fetchIndicadores();
  }, [projectId]);

  return {
    data,
    loading,
    error,
    fetchIndicadores,
    updateIndicador,
    calculateOverallProgress,
    progresoGeneral: data?.progresoGeneral || 0,
  };
}
