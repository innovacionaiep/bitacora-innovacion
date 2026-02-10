'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { preloadVoskModel } from '@/lib/vosk-model-loader';
import {
  getReunionesProyecto,
  getCompromisosProyecto,
  getOportunidadesAmenazasProyecto,
  iniciarReunionEnVivo,
} from '@/lib/actions/seguimiento';
import { ReunionModal } from './ReunionModal';
import { ReunionFormModal } from './ReunionFormModal';
import { OportunidadesAmenazasCard } from './OportunidadesAmenazasCard';
import { CompromisosPostItWall } from './CompromisosPostItWall';
import { useMeetingLiveOptional } from '@/contexts/MeetingLiveContext';
import { Calendar, Plus, Loader2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  const [reuniones, setReuniones] = useState<
    Awaited<ReturnType<typeof getReunionesProyecto>>['data']
  >([]);
  const [compromisos, setCompromisos] = useState<
    Awaited<ReturnType<typeof getCompromisosProyecto>>['data']
  >([]);
  const [oportunidadesAmenazas, setOportunidadesAmenazas] = useState<
    Awaited<ReturnType<typeof getOportunidadesAmenazasProyecto>>['data']
  >([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaReunion, setShowNuevaReunion] = useState(false);
  const [selectedReunionId, setSelectedReunionId] = useState<string | null>(
    null
  );
  const [reunionModalOpen, setReunionModalOpen] = useState(false);
  const [startingReunionId, setStartingReunionId] = useState<string | null>(
    null
  );

  const meetingLive = useMeetingLiveOptional();

  useEffect(() => {
    preloadVoskModel();
  }, []);

  useEffect(() => {
    if (!meetingLive) return;
    meetingLive.setOnMeetingEnded((proyectoId) => {
      if (proyectoId === projectId) loadData(true);
    });
    return () => meetingLive.setOnMeetingEnded(null);
  }, [meetingLive, projectId]);

  const loadData = async (isRefetch = false) => {
    if (!isRefetch) setLoading(true);
    const [reunionesRes, compromisosRes, oaRes] = await Promise.all([
      getReunionesProyecto(projectId),
      getCompromisosProyecto(projectId),
      getOportunidadesAmenazasProyecto(projectId),
    ]);
    if (reunionesRes.success && reunionesRes.data) {
      setReuniones(reunionesRes.data);
    }
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

  const formatFecha = (fecha: Date | string) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleVerReunion = (reunionId: string) => {
    setSelectedReunionId(reunionId);
    setReunionModalOpen(true);
  };

  const handleIniciarReunion = async (reunionId: string) => {
    setStartingReunionId(reunionId);
    const result = await iniciarReunionEnVivo(reunionId);
    setStartingReunionId(null);
    if (result.success && result.data && meetingLive) {
      meetingLive.startMeeting(reunionId, projectId);
    }
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
      <div className="flex-1 min-h-0 flex gap-4 pb-6">
        {/* Columna izquierda: Reuniones */}
        <div className="w-[300px] xl:w-[320px] flex-shrink-0 flex flex-col rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          <header className="flex-shrink-0 flex items-center justify-between w-full px-3 py-2 bg-gray-100 border-b border-gray-200 rounded-t-xl">
            <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-600" />
              Reuniones
            </h4>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="h-7 w-7 rounded-full bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
                    onClick={() => setShowNuevaReunion(true)}
                  >
                    <Plus className="h-3.5 w-3.5 text-white" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Agregar reunión</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </header>
          <div className="p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
              {reuniones.length === 0 ? (
                <div className="text-center py-6 rounded-lg bg-gray-50/50">
                  <Calendar className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    No hay reuniones registradas
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowNuevaReunion(true)}
                  >
                    Crear primera reunión
                  </Button>
                </div>
              ) : (
                reuniones.map((reunion) => (
                  <div
                    key={reunion.id}
                    className="border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 via-white to-gray-50 rounded-r-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="font-medium text-gray-900 text-sm min-w-0">
                        {formatFecha(reunion.fecha)}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerReunion(reunion.id);
                          }}
                        >
                          Detalles
                        </Button>
                        {(reunion as { estado?: string }).estado ===
                        'finalizada' ? (
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-default"
                            disabled
                          >
                            Finalizada
                          </Button>
                        ) : (reunion as { estado?: string }).estado ===
                          'en_curso' ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            disabled
                          >
                            En curso
                          </Button>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleIniciarReunion(reunion.id);
                            }}
                            disabled={
                              startingReunionId === reunion.id ||
                              !!meetingLive?.meeting
                            }
                          >
                            {startingReunionId === reunion.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              'Iniciar'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Columna derecha: O/A arriba, Compromisos abajo */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 pl-4">
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

      <ReunionFormModal
        projectId={projectId}
        open={showNuevaReunion}
        onOpenChange={setShowNuevaReunion}
        onSuccess={handleSuccess}
      />

      <ReunionModal
        reunionId={selectedReunionId}
        projectId={projectId}
        open={reunionModalOpen}
        onOpenChange={setReunionModalOpen}
        onUpdated={handleSuccess}
      />
    </div>
  );
}
