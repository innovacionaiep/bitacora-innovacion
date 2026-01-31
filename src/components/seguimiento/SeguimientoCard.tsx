'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  getReunionesProyecto,
  getCompromisosPendientesProyecto,
} from '@/lib/actions/seguimiento';
import { CompromisosList } from './CompromisosList';
import { ReunionModal } from './ReunionModal';
import { ReunionFormModal } from './ReunionFormModal';
import {
  Calendar,
  Plus,
  Clock,
  User,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';

interface SeguimientoCardProps {
  projectId: string;
  projectName?: string;
}

export function SeguimientoCard({ projectId, projectName }: SeguimientoCardProps) {
  const [reuniones, setReuniones] = useState<
    Awaited<ReturnType<typeof getReunionesProyecto>>['data']
  >([]);
  const [compromisos, setCompromisos] = useState<
    Awaited<ReturnType<typeof getCompromisosPendientesProyecto>>['data']
  >([]);
  const [loading, setLoading] = useState(true);
  const [showNuevaReunion, setShowNuevaReunion] = useState(false);
  const [selectedReunionId, setSelectedReunionId] = useState<string | null>(null);
  const [reunionModalOpen, setReunionModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [reunionesRes, compromisosRes] = await Promise.all([
      getReunionesProyecto(projectId),
      getCompromisosPendientesProyecto(projectId),
    ]);
    if (reunionesRes.success && reunionesRes.data) {
      setReuniones(reunionesRes.data);
    }
    if (compromisosRes.success && compromisosRes.data) {
      setCompromisos(compromisosRes.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const handleSuccess = async () => {
    await loadData();
  };

  const formatFecha = (fecha: Date | string) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleVerReunion = (reunionId: string) => {
    setSelectedReunionId(reunionId);
    setReunionModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col shadow-md">
        <CardHeader className="border-b border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              Seguimiento
              {projectName && (
                <span className="text-base font-normal text-gray-500">
                  · {projectName}
                </span>
              )}
            </CardTitle>
            <Button
              onClick={() => setShowNuevaReunion(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nueva reunión
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Reuniones de seguimiento
                </h3>
                {reuniones.length === 0 ? (
                  <div className="text-center py-8 border rounded-lg border-dashed border-gray-300 bg-gray-50">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500">
                      No hay reuniones registradas para este proyecto
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowNuevaReunion(true)}
                    >
                      Crear primera reunión
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reuniones.map((reunion) => (
                      <div
                        key={reunion.id}
                        className="border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-50 via-white to-gray-50 rounded-r-lg shadow-sm hover:shadow-md transition-shadow p-4 cursor-pointer"
                        onClick={() => handleVerReunion(reunion.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatFecha(reunion.fecha)}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                              <span className="flex items-center gap-1">
                                <User className="h-3.5 w-3" />
                                {reunion.coordinador?.name || reunion.coordinador?.email}
                              </span>
                              {reunion.duracionMinutos && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3.5 w-3" />
                                  {reunion.duracionMinutos} min
                                </span>
                              )}
                            </div>
                            {reunion.resumen && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {reunion.resumen}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-emerald-600 font-medium">
                            Ver detalle
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Compromisos pendientes
                </h3>
                <CompromisosList
                  compromisos={compromisos.map((c) => ({
                    id: c.id,
                    descripcion: c.descripcion,
                    fechaLimite: c.fechaLimite,
                    completado: c.completado,
                    reunion: c.reunion
                      ? {
                          id: c.reunion.id,
                          fecha: c.reunion.fecha,
                          coordinador: c.reunion.coordinador,
                        }
                      : undefined,
                  }))}
                  onToggle={handleSuccess}
                  showReunionInfo={true}
                />
              </section>
            </div>
          )}
        </CardContent>
      </Card>

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
