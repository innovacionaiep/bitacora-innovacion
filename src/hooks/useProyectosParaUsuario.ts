'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import {
  getProyectosListadoParaUsuario,
  createProyecto,
  updateProyecto,
  deleteProyecto,
} from '@/lib/actions/proyectos';
import type {
  ProyectoData,
  ProyectoFormData,
  ProyectoListadoItem,
} from '@/types/proyecto';
import { proyectosListadoKey } from '@/lib/query-keys';
import {
  readPersistedProyectosListado,
  writePersistedProyectosListado,
} from '@/lib/proyecto-listado-persist';

/**
 * Hook que carga un listado ligero de proyectos (todas las participaciones del usuario).
 */
export function useProyectosParaUsuario(opts?: {
  initialListado?: ProyectoListadoItem[];
  /** @deprecated Ignored */
  initialActiveRole?: string | null;
}) {
  const { data: session, status } = useSession();
  const userId = session?.user?.id ?? null;
  const queryClient = useQueryClient();

  const persistedListado = useMemo(
    () => readPersistedProyectosListado(userId),
    [userId]
  );

  const query = useQuery({
    queryKey: proyectosListadoKey(userId),
    queryFn: async () => {
      const result = await getProyectosListadoParaUsuario();
      if (!result.success) {
        throw new Error(result.error ?? 'Error al obtener listado');
      }
      return (result.data ?? []) as ProyectoListadoItem[];
    },
    staleTime: 60_000,
    initialData: opts?.initialListado ?? persistedListado,
    enabled: status !== 'loading' && (!!session?.user || !!opts?.initialListado),
  });

  useEffect(() => {
    if (!userId || !query.data) return;
    writePersistedProyectosListado(userId, query.data);
  }, [userId, query.data]);

  const fetchProyectos = useCallback(
    async (_opts?: { silent?: boolean; activeRole?: string | null }) => {
      await queryClient.invalidateQueries({
        queryKey: proyectosListadoKey(userId),
      });
    },
    [userId, queryClient]
  );

  const patchProyectoEnListado = useCallback(
    (item: {
      id: string;
      proyecto: string;
      sede: string;
      fondo?: string;
      escuelas?: { escuela: { nombre: string } }[];
    }) => {
      queryClient.setQueryData<ProyectoListadoItem[]>(
        proyectosListadoKey(userId),
        (prev) => {
          if (!prev) return prev;
          return prev.map((p) =>
            p.id === item.id
              ? {
                  id: item.id,
                  proyecto: item.proyecto,
                  sede: item.sede,
                  fondo: item.fondo ?? p.fondo,
                  escuelas: item.escuelas ?? p.escuelas,
                }
              : p
          );
        }
      );
    },
    [userId, queryClient]
  );

  const createProyectoHandler = async (proyecto: ProyectoFormData) => {
    try {
      const result = await createProyecto(proyecto);

      if (!result.success) {
        return { data: null, error: result.error };
      }

      if (result.data) {
        await queryClient.invalidateQueries({
          queryKey: ['proyectos-listado'],
        });
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

      await queryClient.invalidateQueries({
        queryKey: ['proyectos-listado'],
      });

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

      queryClient.setQueryData<ProyectoListadoItem[]>(
        proyectosListadoKey(userId),
        (prev) => (prev ? prev.filter((p) => p.id !== id) : prev)
      );
      await queryClient.invalidateQueries({
        queryKey: ['proyectos-listado'],
      });
      return { error: null };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err.message : 'Error al eliminar proyecto',
      };
    }
  };

  return {
    proyectos: query.data ?? [],
    loading: query.isLoading && !query.data,
    isFetching: query.isFetching,
    error: query.error
      ? query.error instanceof Error
        ? query.error.message
        : 'Error al cargar proyectos'
      : null,
    fetchProyectos,
    patchProyectoEnListado,
    createProyecto: createProyectoHandler,
    updateProyecto: updateProyectoHandler,
    deleteProyecto: deleteProyectoHandler,
  };
}
