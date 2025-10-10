import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase';

type Project = Database['public']['Tables']['proyectos']['Row'];

export function useProyectos() {
  const [proyectos, setProyectos] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClient();

  // Cargar proyectos
  const fetchProyectos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('proyectos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProyectos(data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar proyectos'
      );
    } finally {
      setLoading(false);
    }
  };

  // Crear proyecto
  const createProyecto = async (
    proyecto: Omit<Project, 'id' | 'created_at' | 'updated_at'>
  ) => {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .insert([proyecto])
        .select();

      if (error) throw error;
      if (data) {
        setProyectos((prev) => [data[0], ...prev]);
      }
      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err.message : 'Error al crear proyecto',
      };
    }
  };

  // Actualizar proyecto
  const updateProyecto = async (id: string, updates: Partial<Project>) => {
    try {
      const { data, error } = await supabase
        .from('proyectos')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data) {
        setProyectos((prev) => prev.map((p) => (p.id === id ? data[0] : p)));
      }
      return { data, error: null };
    } catch (err) {
      return {
        data: null,
        error:
          err instanceof Error ? err.message : 'Error al actualizar proyecto',
      };
    }
  };

  // Eliminar proyecto
  const deleteProyecto = async (id: string) => {
    try {
      const { error } = await supabase.from('proyectos').delete().eq('id', id);

      if (error) throw error;
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
    createProyecto,
    updateProyecto,
    deleteProyecto,
  };
}
