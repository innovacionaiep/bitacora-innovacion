'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompromisosProyecto } from '@/lib/actions/seguimiento';
import { CompromisosPostItWall } from './CompromisosPostItWall';
import { compromisosKey } from '@/lib/query-keys';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

type CompromisosData = NonNullable<
  Awaited<ReturnType<typeof getCompromisosProyecto>>['data']
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

  const query = useQuery({
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

  const compromisos = query.data ?? [];

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

  const handleSuccess = async () => {
    await queryClient.invalidateQueries({
      queryKey: compromisosKey(projectId),
    });
    await queryClient.fetchQuery({
      queryKey: compromisosKey(projectId),
      queryFn: async () => {
        const compromisosRes = await getCompromisosProyecto(projectId);
        if (!compromisosRes.success) {
          throw new Error(compromisosRes.error ?? 'Error al cargar compromisos');
        }
        return (compromisosRes.data ?? []) as CompromisosData;
      },
      staleTime: 0,
    });
  };

  usePageTopLoader(query.isLoading && !query.data, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });

  if (query.isLoading && !query.data) {
    return <div className="h-full min-h-[120px]" />;
  }

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex-1 min-h-0 flex flex-col gap-4 pb-6">
        <div className="rounded-xl border border-gray-200 bg-white shadow-lg flex flex-col min-h-0 flex-1 overflow-hidden">
          <CompromisosPostItWall
            projectId={projectId}
            compromisos={compromisos}
            rolEnProyecto={rolEnProyecto}
            activeRole={activeRole}
            onSuccess={handleSuccess}
            onOptimisticCompromisoUpdate={(id, patch) =>
              setCompromisos((prev) =>
                prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
              )
            }
            onOptimisticCompromisoAdd={(compromiso) =>
              setCompromisos((prev) => [compromiso, ...prev])
            }
            onOptimisticCompromisoRemove={(id) =>
              setCompromisos((prev) => prev.filter((c) => c.id !== id))
            }
          />
        </div>
      </div>
    </div>
  );
}
