import { useState, useEffect } from 'react';
import {
  getProyectos,
  createProyecto,
  updateProyecto,
  deleteProyecto,
  type ProyectoData,
} from '@/lib/actions/proyectos';
import { ProyectoConVariaciones } from '@/types/proyecto';

export function useProyectos() {
  const [proyectos, setProyectos] = useState<ProyectoConVariaciones[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar proyectos
  const fetchProyectos = async () => {
    try {
      console.log('🔄 [useProyectos] Iniciando carga de proyectos...');
      setLoading(true);
      const result = await getProyectos();

      console.log('📥 [useProyectos] Resultado de getProyectos:', {
        success: result.success,
        dataLength: result.data?.length || 0,
        error: result.error
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setProyectos(result.data || []);
      setError(null);
      console.log('✅ [useProyectos] Proyectos cargados exitosamente:', result.data?.length || 0);
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
  const createProyectoHandler = async (proyecto: ProyectoData) => {
    try {
      const result = await createProyecto(proyecto);

      if (!result.success) {
        return { data: null, error: result.error };
      }

      if (result.data) {
        setProyectos((prev) => [result.data!, ...prev]);
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
          prev.map((p) => (p.id === id ? result.data! : p))
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
