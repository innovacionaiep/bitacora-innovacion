import { useState, useEffect } from 'react';
import {
  getProyectos,
  createProyecto,
  updateProyecto,
  deleteProyecto,
  type ProyectoData,
} from '@/lib/actions/proyectos';
import {
  ProyectoConVariaciones,
  type ProyectoFormData,
} from '@/types/proyecto';

export function useProyectos() {
  const [proyectos, setProyectos] = useState<ProyectoConVariaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar proyectos. Con { silent: true } no se muestra el estado de carga (evita "refresh" al guardar).
  const fetchProyectos = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      const result = await getProyectos();

      if (!result.success) {
        throw new Error(result.error);
      }

      setProyectos(result.data || []);
      setError(null);
    } catch (err) {
      console.error('❌ [useProyectos] Error:', err);
      setError(
        err instanceof Error ? err.message : 'Error al cargar proyectos'
      );
    } finally {
      setLoading(false);
    }
  };

  // Crear proyecto
  const createProyectoHandler = async (proyecto: ProyectoFormData) => {
    try {
      const result = await createProyecto(proyecto);

      if (!result.success) {
        return { data: null, error: result.error };
      }

      if (result.data) {
        const nuevoConVariaciones: ProyectoConVariaciones = {
          ...result.data,
          variacionGantt: 0,
          variacionObjetivos: 0,
        };
        setProyectos((prev) => [nuevoConVariaciones, ...prev]);
      }

      return { data: result.data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Error al crear proyecto',
      };
    }
  };

  // Actualizar proyecto
  const updateProyectoHandler = async (
    id: string,
    updates: Partial<ProyectoData>
  ) => {
    try {
      const result = await updateProyecto(id, updates);

      if (!result.success) {
        return { data: null, error: result.error };
      }

      if (result.data) {
        setProyectos((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...result.data!,
                  variacionGantt: p.variacionGantt,
                  variacionObjetivos: p.variacionObjetivos,
                }
              : p
          )
        );
      }

      return { data: result.data, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err.message : 'Error al actualizar proyecto',
      };
    }
  };

  // Eliminar proyecto
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
