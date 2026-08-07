'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getReunionesProyecto } from '@/lib/actions/seguimiento';
import { ReunionesSeguimientoTable } from './ReunionesSeguimientoTable';
import { compromisosKey, reunionesKey } from '@/lib/query-keys';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import type { CompromisoItem } from './compromiso-ui';

type ReunionesData = NonNullable<
  Awaited<ReturnType<typeof getReunionesProyecto>>['data']
>;

interface SeguimientoCardProps {
  projectId: string;
  projectName?: string;
  rolEnProyecto?: string | null;
  /** @deprecated UI-only; authorization uses availableRoles + rolEnProyecto */
  activeRole?: string | null;
  topLoaderEnabled?: boolean;
}

export function SeguimientoCard({
  projectId,
  rolEnProyecto,
  topLoaderEnabled = true,
}: SeguimientoCardProps) {
  const queryClient = useQueryClient();

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

  const reuniones = reunionesQuery.data ?? [];

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
      setReuniones((prev) =>
        prev.map((r) => ({
          ...r,
          compromisos: r.compromisos.map((c) =>
            c.id === id ? { ...c, ...patch } : c
          ),
        }))
      );
    },
    [setReuniones]
  );

  const handleSuccess = async () => {
    // Invalidar también compromisos: portal Inicio / Resumen los usan aparte.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: compromisosKey(projectId) }),
      queryClient.invalidateQueries({ queryKey: reunionesKey(projectId) }),
    ]);
    await queryClient.fetchQuery({
      queryKey: reunionesKey(projectId),
      queryFn: async () => {
        const reunionesRes = await getReunionesProyecto(projectId);
        if (!reunionesRes.success) {
          throw new Error(reunionesRes.error ?? 'Error al cargar reuniones');
        }
        return (reunionesRes.data ?? []) as ReunionesData;
      },
      staleTime: 0,
    });
  };

  /** Tras toggle: no refetch de reuniones (evita rebote del checkbox optimista). */
  const handleBackgroundSync = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: compromisosKey(projectId),
    });
  }, [projectId, queryClient]);

  const isLoading = reunionesQuery.isLoading && !reunionesQuery.data;

  usePageTopLoader(isLoading, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });

  if (isLoading) {
    return <div className="h-full min-h-[120px]" />;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 min-h-0 flex flex-col pb-6 overflow-auto">
        <ReunionesSeguimientoTable
          projectId={projectId}
          reuniones={reuniones}
          rolEnProyecto={rolEnProyecto}
          onSuccess={handleSuccess}
          onBackgroundSync={handleBackgroundSync}
          onOptimisticCompromisoUpdate={patchCompromisoInCaches}
          onOptimisticCompromisoAdd={(compromiso: CompromisoItem) => {
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
            setReuniones((prev) =>
              prev.map((r) => ({
                ...r,
                compromisos: r.compromisos.filter((c) => c.id !== id),
              }))
            );
          }}
          onOptimisticReunionAdd={(reunion) =>
            setReuniones((prev) =>
              [...prev, reunion].sort((a, b) => a.numero - b.numero)
            )
          }
          onOptimisticReunionUpdate={(id, patch) =>
            setReuniones((prev) => {
              const next = prev.map((r) =>
                r.id === id ? { ...r, ...patch } : r
              );
              return patch.numero !== undefined
                ? [...next].sort((a, b) => a.numero - b.numero)
                : next;
            })
          }
          onOptimisticReunionRemove={(id) =>
            setReuniones((prev) => prev.filter((r) => r.id !== id))
          }
        />
      </div>
    </div>
  );
}
