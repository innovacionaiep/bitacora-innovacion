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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/7a0611d6-0a52-4fa2-aee7-9788c3ae6e26',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f044e2'},body:JSON.stringify({sessionId:'f044e2',location:'useProyectosParaUsuario.ts:fetchProyectos',message:'fetchProyectos called',data:{silent:opts?.silent,hasActiveRole:opts?.activeRole!=null},timestamp:Date.now(),hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    try {
      if (!opts?.silent) setLoading(true);
      const result = await getProyectosListadoParaUsuario(opts?.activeRole);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7a0611d6-0a52-4fa2-aee7-9788c3ae6e26',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f044e2'},body:JSON.stringify({sessionId:'f044e2',location:'useProyectosParaUsuario.ts:after fetch',message:'getProyectosListado result',data:{success:result.success,dataLength:result.data?.length??0,error:result.error??null},timestamp:Date.now(),hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      if (!result.success) {
        throw new Error(result.error);
      }

      setProyectos(result.data || []);
      setError(null);
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7a0611d6-0a52-4fa2-aee7-9788c3ae6e26',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'f044e2'},body:JSON.stringify({sessionId:'f044e2',location:'useProyectosParaUsuario.ts:catch',message:'fetchProyectos error',data:{errMsg:err instanceof Error?err.message:String(err)},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
      // #endregion
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
