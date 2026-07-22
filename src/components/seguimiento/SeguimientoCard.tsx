'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCompromisosProyecto } from '@/lib/actions/seguimiento';
import { CompromisosPostItWall } from './CompromisosPostItWall';
import { Loader2 } from 'lucide-react';
import { compromisosKey } from '@/lib/query-keys';

type CompromisosData = NonNullable<
  Awaited<ReturnType<typeof getCompromisosProyecto>>['data']
>;

interface SeguimientoCardProps {
  projectId: string;
  projectName?: string;
  rolEnProyecto?: string | null;
  /** Rol activo del usuario (ej. Admin). Los Admin pueden crear compromisos aunque no sean coordinadores del proyecto. */
  activeRole?: string | null;
}

export function SeguimientoCard({
  projectId,
  rolEnProyecto,
  activeRole,
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

  if (query.isLoading && !query.data) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
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
