'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getCompromisosProyecto,
  getReunionesProyecto,
} from '@/lib/actions/seguimiento';
import { CompromisosPostItWall } from './CompromisosPostItWall';
import { ReunionesSeguimientoTable } from './ReunionesSeguimientoTable';
import { compromisosKey, reunionesKey } from '@/lib/query-keys';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

type CompromisosData = NonNullable<
  Awaited<ReturnType<typeof getCompromisosProyecto>>['data']
>;
type ReunionesData = NonNullable<
  Awaited<ReturnType<typeof getReunionesProyecto>>['data']
>;

interface SeguimientoCardProps {
  projectId: string;
  projectName?: string;
  rolEnProyecto?: string | null;
  /** Rol activo del usuario (ej. Admin). Los Admin pueden crear compromisos aunque no sean coordinadores del proyecto. */
  activeRole?: string | null;
  topLoaderEnabled?: boolean;
}

export function SeguimientoCard({
  projectId,
  rolEnProyecto,
  activeRole,
  topLoaderEnabled = true,
}: SeguimientoCardProps) {
  const queryClient = useQueryClient();

  const compromisosQuery = useQuery({
    queryKey: compromisosKey(projectId),
    queryFn: async () => {
      const compromisosRes = await getCompromisosProyecto(projectId);
      if (!compromisosRes.success) {
        throw new Error(compromisosRes.error ?? 'Error al cargar compromisos');
      }
      return (compromisosRes.data ?? []) as CompromisosData;
    },
    staleTime: 60_000,
  });

  const reunionesQuery = useQuery({
    queryKey: reunionesKey(projectId),
    queryFn: async () => {
      const reunionesRes = await getReunionesProyecto(projectId);
      if (!reunionesRes.success) {
        throw new Error(reunionesRes.error ?? 'Error al cargar reuniones');
      }
      return (reunionesRes.data ?? []) as ReunionesData;
    },
    staleTime: 60_000,
  });

  const compromisos = compromisosQuery.data ?? [];
  const reuniones = reunionesQuery.data ?? [];

  const setCompromisos = useCallback(
    (update: CompromisosData | ((prev: CompromisosData) => CompromisosData)) => {
      queryClient.setQueryData<CompromisosData>(
        compromisosKey(projectId),
        (prev) => {
          const current = prev ?? [];
          return typeof update === 'function' ? update(current) : update;
        }
      );
    },
    [projectId, queryClient]
  );

  const setReuniones = useCallback(
    (update: ReunionesData | ((prev: ReunionesData) => ReunionesData)) => {
      queryClient.setQueryData<ReunionesData>(
        reunionesKey(projectId),
        (prev) => {
          const current = prev ?? [];
          return typeof update === 'function' ? update(current) : update;
        }
      );
    },
    [projectId, queryClient]
  );

  const patchCompromisoInCaches = useCallback(
    (
      id: string,
      patch: {
        completado?: boolean;
        titulo?: string | null;
        descripcion?: string;
      }
    ) => {
      setCompromisos((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );
      setReuniones((prev) =>
        prev.map((r) => ({
          ...r,
          compromisos: r.compromisos.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        }))
      );
    },
    [setCompromisos, setReuniones]
  );

  const handleSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: compromisosKey(projectId) }),
      queryClient.invalidateQueries({ queryKey: reunionesKey(projectId) }),
    ]);
    await Promise.all([
      queryClient.fetchQuery({
        queryKey: compromisosKey(projectId),
        queryFn: async () => {
          const compromisosRes = await getCompromisosProyecto(projectId);
          if (!compromisosRes.success) {
            throw new Error(
              compromisosRes.error ?? 'Error al cargar compromisos'
            );
          }
          return (compromisosRes.data ?? []) as CompromisosData;
        },
        staleTime: 0,
      }),
      queryClient.fetchQuery({
        queryKey: reunionesKey(projectId),
        queryFn: async () => {
          const reunionesRes = await getReunionesProyecto(projectId);
          if (!reunionesRes.success) {
            throw new Error(reunionesRes.error ?? 'Error al cargar reuniones');
          }
          return (reunionesRes.data ?? []) as ReunionesData;
        },
        staleTime: 0,
      }),
    ]);
  };

  const isLoading =
    (compromisosQuery.isLoading && !compromisosQuery.data) ||
    (reunionesQuery.isLoading && !reunionesQuery.data);

  usePageTopLoader(isLoading, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });

  if (isLoading) {
    return <div className="h-full min-h-[120px]" />;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 min-h-0 flex flex-col gap-4 pb-6 overflow-auto">
        <div
          id="tour-seguimiento-compromisos"
          className="rounded-xl border border-gray-200 bg-white shadow-lg flex flex-col min-h-[200px] overflow-hidden"
        >
          <CompromisosPostItWall
            projectId={projectId}
            compromisos={compromisos}
            rolEnProyecto={rolEnProyecto}
            activeRole={activeRole}
            onSuccess={handleSuccess}
            onOptimisticCompromisoUpdate={patchCompromisoInCaches}
          />
        </div>

        <ReunionesSeguimientoTable
          projectId={projectId}
          reuniones={reuniones}
          rolEnProyecto={rolEnProyecto}
          onSuccess={handleSuccess}
          onOptimisticCompromisoUpdate={patchCompromisoInCaches}
          onOptimisticCompromisoAdd={(compromiso) => {
            setCompromisos((prev) => [compromiso, ...prev]);
            setReuniones((prev) =>
              prev.map((r) =>
                r.id === compromiso.reunionId
                  ? {
                      ...r,
                      compromisos: [
                        compromiso as ReunionesData[number]['compromisos'][number],
                        ...r.compromisos,
                      ],
                    }
                  : r
              )
            );
          }}
          onOptimisticCompromisoRemove={(id) => {
            setCompromisos((prev) => prev.filter((c) => c.id !== id));
            setReuniones((prev) =>
              prev.map((r) => ({
                ...r,
                compromisos: r.compromisos.filter((c) => c.id !== id),
              }))
            );
          }}
          onOptimisticReunionAdd={(reunion) =>
            setReuniones((prev) => [...prev, reunion])
          }
          onOptimisticReunionUpdate={(id, patch) =>
            setReuniones((prev) =>
              prev.map((r) => (r.id === id ? { ...r, ...patch } : r))
            )
          }
          onOptimisticReunionRemove={(id) =>
            setReuniones((prev) => prev.filter((r) => r.id !== id))
          }
        />
      </div>
    </div>
  );
}
