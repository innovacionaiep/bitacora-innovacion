'use client';

import { useState, useEffect } from 'react';
import { getCompromisosProyecto } from '@/lib/actions/seguimiento';
import { CompromisosPostItWall } from './CompromisosPostItWall';
import { Loader2 } from 'lucide-react';

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
  const [compromisos, setCompromisos] = useState<
    Awaited<ReturnType<typeof getCompromisosProyecto>>['data']
  >([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (isRefetch = false) => {
    if (!isRefetch) setLoading(true);
    const compromisosRes = await getCompromisosProyecto(projectId);
    if (compromisosRes.success && compromisosRes.data) {
      setCompromisos(compromisosRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      loadData(false);
    }
  }, [projectId]);

  const handleSuccess = async () => {
    await loadData(true);
  };

  if (loading) {
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
          />
        </div>
      </div>
    </div>
  );
}
