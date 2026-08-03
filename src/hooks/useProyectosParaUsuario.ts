'use client';

import { useCallback } from 'react';
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

/**
 * Hook que carga un listado ligero de proyectos (solo id, nombre, sede, escuelas).
 * Cache React Query; la carga completa del proyecto se hace al seleccionar (getProyectoBase).
 * initialListado / initialActiveRole alinean la key con el prefetch RSC.
 */
export function useProyectosParaUsuario(opts?: {
  initialListado?: ProyectoListadoItem[];
  initialActiveRole?: string | null;
}) {
  const { data: session, status } = useSession();
  const activeRole =
    (session?.user as { activeRole?: string | null } | undefined)?.activeRole ??
    opts?.initialActiveRole ??
    null;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: proyectosListadoKey(activeRole),
    queryFn: async () => {
      const result = await getProyectosListadoParaUsuario(activeRole);
      if (!result.success) {
        throw new Error(result.error ?? 'Error al obtener listado');
      }
      return (result.data ?? []) as ProyectoListadoItem[];
    },
    staleTime: 60_000,
    initialData: opts?.initialListado,
    enabled: status !== 'loading' && (!!session?.user || !!opts?.initialListado),
  });

  const fetchProyectos = useCallback(
    async (opts?: { silent?: boolean; activeRole?: string | null }) => {
      const role = opts?.activeRole !== undefined ? opts.activeRole : activeRole;
      await queryClient.invalidateQueries({
        queryKey: proyectosListadoKey(role),
      });
    },
    [activeRole, queryClient]
  );

  /** Actualiza un ítem del listado en cache sin refetch (nombre/sede/escuelas). */
  const patchProyectoEnListado = useCallback(
    (item: {
      id: string;
      proyecto: string;
      sede: string;
      escuelas?: { escuela: { nombre: string } }[];
    }) => {
      queryClient.setQueryData<ProyectoListadoItem[]>(
        proyectosListadoKey(activeRole),
        (prev) => {
          if (!prev) return prev;
          return prev.map((p) =>
            p.id === item.id
              ? {
                  id: item.id,
                  proyecto: item.proyecto,
                  sede: item.sede,
                  escuelas: item.escuelas ?? p.escuelas,
                }
              : p
          );
        }
      );
    },
    [activeRole, queryClient]
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
        proyectosListadoKey(activeRole),
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
