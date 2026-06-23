import { useState, useEffect } from 'react';
import {
  getProyectosListadoParaUsuario,
  createProyecto,
  updateProyecto,
  deleteProyecto,
  type ProyectoData,
  type ProyectoListadoItem,
} from '@/lib/actions/proyectos';
import type { ProyectoFormData } from '@/types/proyecto';

/**
 * Hook que carga un listado ligero de proyectos (solo id, nombre, sede, escuelas).
 * La carga completa del proyecto se hace al seleccionar (getProyecto).
 */
export function useProyectosParaUsuario() {
  const [proyectos, setProyectos] = useState<ProyectoListadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProyectos = async (opts?: {
    silent?: boolean;
    activeRole?: string | null;
  }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const result = await getProyectosListadoParaUsuario(opts?.activeRole);
      if (!result.success) {
        throw new Error(result.error);
      }

      setProyectos(result.data || []);
      setError(null);
    } catch (err) {
      console.error('❌ [useProyectosParaUsuario] Error:', err);
      setError(
        err instanceof Error ? err.message : 'Error al cargar proyectos'
      );
    } finally {
      setLoading(false);
    }
  };

  const createProyectoHandler = async (proyecto: ProyectoFormData) => {
    try {
      const result = await createProyecto(proyecto);

      if (!result.success) {
        return { data: null, error: result.error };
      }

      if (result.data) {
        await fetchProyectos({ silent: true });
      }

      return { data: result.data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Error al crear proyecto',
      };
    }
  };

  const updateProyectoHandler = async (
    id: string,
    updates: Partial<ProyectoData>
  ) => {
    try {
      const result = await updateProyecto(id, updates);

      if (!result.success) {
        return { data: null, error: result.error };
      }

      await fetchProyectos({ silent: true });

      return { data: result.data, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err.message : 'Error al actualizar proyecto',
      };
    }
  };

  const deleteProyectoHandler = async (id: string) => {
    try {
      const result = await deleteProyecto(id);

      if (!result.success) {
        return { error: result.error };
      }

      setProyectos((prev) => prev.filter((p) => p.id !== id));
      return { error: null };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : 'Error al eliminar proyecto',
      };
    }
  };

  useEffect(() => {
    fetchProyectos();
  }, []);

  return {
    proyectos,
    loading,
    error,
    fetchProyectos,
    createProyecto: createProyectoHandler,
    updateProyecto: updateProyectoHandler,
    deleteProyecto: deleteProyectoHandler,
  };
}
