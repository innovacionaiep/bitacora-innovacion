'use client';

import { useState, useEffect } from 'react';
import {
  getCompromisosProyecto,
  getOportunidadesAmenazasProyecto,
} from '@/lib/actions/seguimiento';
import { OportunidadesAmenazasCard } from './OportunidadesAmenazasCard';
import { CompromisosPostItWall } from './CompromisosPostItWall';
import { Loader2 } from 'lucide-react';

interface SeguimientoCardProps {
  projectId: string;
  projectName?: string;
  rolEnProyecto?: string | null;
  /** Rol activo del usuario (ej. Admin). Los Admin pueden crear O/A y compromisos aunque no sean coordinadores del proyecto. */
  activeRole?: string | null;
  /** Usuario actual para mostrar quién dio el OK en oportunidades/amenazas (avatar, nombre, rol). */
  currentUser?: {
    id: string;
    name?: string | null;
    image?: string | null;
  } | null;
}

export function SeguimientoCard({
  projectId,
  projectName,
  rolEnProyecto,
  activeRole,
  currentUser,
}: SeguimientoCardProps) {
  const [compromisos, setCompromisos] = useState<
    Awaited<ReturnType<typeof getCompromisosProyecto>>['data']
  >([]);
  const [oportunidadesAmenazas, setOportunidadesAmenazas] = useState<
    Awaited<ReturnType<typeof getOportunidadesAmenazasProyecto>>['data']
  >([]);
  const [loading, setLoading] = useState(true);

  const loadData = async (isRefetch = false) => {
    if (!isRefetch) setLoading(true);
    const [compromisosRes, oaRes] = await Promise.all([
      getCompromisosProyecto(projectId),
      getOportunidadesAmenazasProyecto(projectId),
    ]);
    if (compromisosRes.success && compromisosRes.data) {
      setCompromisos(compromisosRes.data);
    }
    if (oaRes.success && oaRes.data) {
      setOportunidadesAmenazas(oaRes.data);
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
          <OportunidadesAmenazasCard
            projectId={projectId}
            oportunidadesAmenazas={oportunidadesAmenazas}
            rolEnProyecto={rolEnProyecto}
            activeRole={activeRole}
            currentUser={currentUser}
            onSuccess={handleSuccess}
            onOptimisticOAUpdate={(id, patch) =>
              setOportunidadesAmenazas((prev) =>
                prev.map((o) => (o.id === id ? { ...o, ...patch } : o))
              )
            }
          />
        </div>
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
