'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  BarChart3,
  Lightbulb,
  AlertTriangle,
  DollarSign,
  ListTodo,
  Edit,
  Loader2,
} from 'lucide-react';
import { getReunionById } from '@/lib/actions/seguimiento';
import { CompromisosList } from './CompromisosList';
import { ReunionFormModal } from './ReunionFormModal';
import { ReunionDetalleForm } from './ReunionDetalleForm';

interface ReunionModalProps {
  reunionId: string | null;
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void | Promise<void>;
}

export function ReunionModal({
  reunionId,
  projectId,
  open,
  onOpenChange,
  onUpdated,
}: ReunionModalProps) {
  const [reunion, setReunion] =
    useState<Awaited<ReturnType<typeof getReunionById>>['data']>(null);
  const [loading, setLoading] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDetalleForm, setShowDetalleForm] = useState(false);

  useEffect(() => {
    if (open && reunionId) {
      setLoading(true);
      getReunionById(reunionId).then((result) => {
        if (result.success && result.data) {
          setReunion(result.data);
        }
        setLoading(false);
      });
    } else if (!open) {
      setReunion(null);
    }
  }, [open, reunionId]);

  const handleRefresh = async () => {
    if (reunionId) {
      const result = await getReunionById(reunionId);
      if (result.success && result.data) {
        setReunion(result.data);
      }
      await onUpdated();
    }
  };

  const formatFecha = (fecha: Date | string) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!reunionId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Detalle de reunión</DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditForm(true)}
                  disabled={loading}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDetalleForm(true)}
                  disabled={loading}
                  title="Agregar puntos tratados, tareas y compromisos"
                >
                  {(reunion as { estado?: string } | null)?.estado ===
                  'finalizada'
                    ? 'Agregar detalles'
                    : 'Completar reunión'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : reunion ? (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatFecha(reunion.fecha)}
                </span>
                {reunion.duracionMinutos && (
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {reunion.duracionMinutos} min
                  </span>
                )}
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {reunion.coordinador?.name || reunion.coordinador?.email}
                </span>
              </div>

              {(reunion as { transcripcion?: string | null }).transcripcion && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    Transcripción
                  </h4>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">
                    {(reunion as { transcripcion?: string | null }).transcripcion}
                  </p>
                </div>
              )}

              {reunion.resumen && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    Resumen
                  </h4>
                  <p className="text-gray-700 text-sm">{reunion.resumen}</p>
                </div>
              )}

              {reunion.puntosTratados && reunion.puntosTratados.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    Puntos tratados
                  </h4>
                  <ul className="space-y-2">
                    {reunion.puntosTratados.map((punto) => (
                      <li
                        key={punto.id}
                        className="border-l-2 border-emerald-500 pl-3 py-1"
                      >
                        <span className="font-medium">{punto.titulo}</span>
                        {punto.descripcion && (
                          <p className="text-sm text-gray-600 mt-0.5">
                            {punto.descripcion}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reunion.tareasMarcadas && reunion.tareasMarcadas.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Tareas completadas
                  </h4>
                  <ul className="space-y-1">
                    {reunion.tareasMarcadas.map((tm) => (
                      <li
                        key={tm.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {tm.task.name}
                        {tm.task.activity && (
                          <span className="text-gray-500">
                            · {tm.task.activity.name}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {reunion.indicadoresActualizados &&
                reunion.indicadoresActualizados.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <BarChart3 className="h-4 w-4" />
                      Indicadores actualizados
                    </h4>
                    <ul className="space-y-1">
                      {reunion.indicadoresActualizados.map((ia) => (
                        <li key={ia.id} className="text-sm">
                          {ia.indicador?.nombre}: {ia.valorAnterior} →{' '}
                          {ia.valorNuevo}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {reunion.oportunidadesAmenazas &&
                reunion.oportunidadesAmenazas.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      Oportunidades y amenazas
                    </h4>
                    <ul className="space-y-2">
                      {reunion.oportunidadesAmenazas.map((pa) => (
                        <li
                          key={pa.id}
                          className={`flex gap-2 text-sm ${
                            pa.tipo === 'Oportunidad'
                              ? 'text-green-700'
                              : 'text-amber-700'
                          }`}
                        >
                          {pa.tipo === 'Oportunidad' ? (
                            <Lightbulb className="h-4 w-4 flex-shrink-0" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          )}
                          <span>{pa.descripcion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {reunion.temasPresupuesto &&
                reunion.temasPresupuesto.length > 0 && (
                  <div>
                    <h4 className="font-medium flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4" />
                      Presupuesto
                    </h4>
                    <ul className="space-y-2">
                      {reunion.temasPresupuesto.map((tp) => (
                        <li key={tp.id} className="text-sm">
                          <span className="font-medium">{tp.tema}</span>
                          {tp.descripcion && (
                            <p className="text-gray-600">{tp.descripcion}</p>
                          )}
                          {tp.cambioPropuesto && (
                            <p className="text-blue-600 text-xs mt-0.5">
                              {tp.cambioPropuesto}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {reunion.compromisos && reunion.compromisos.length > 0 && (
                <div>
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <ListTodo className="h-4 w-4" />
                    Compromisos
                  </h4>
                  <CompromisosList
                    compromisos={reunion.compromisos.map((c) => ({
                      id: c.id,
                      descripcion: c.descripcion,
                      completado: c.completado,
                      reunion: reunion,
                    }))}
                    onToggle={handleRefresh}
                    showReunionInfo={false}
                  />
                </div>
              )}

              {!reunion.resumen &&
                !(reunion as { transcripcion?: string | null }).transcripcion &&
                (!reunion.puntosTratados ||
                  reunion.puntosTratados.length === 0) &&
                (!reunion.tareasMarcadas ||
                  reunion.tareasMarcadas.length === 0) &&
                (!reunion.compromisos || reunion.compromisos.length === 0) && (
                  <p className="text-gray-500 text-sm py-4">
                    Esta reunión aún no tiene contenido registrado. Usa
                    &quot;Agregar detalles&quot; para agregar puntos tratados,
                    tareas, indicadores y compromisos.
                  </p>
                )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {reunion && (
        <>
          <ReunionFormModal
            projectId={projectId}
            reunionId={showEditForm ? reunionId : null}
            open={showEditForm}
            onOpenChange={setShowEditForm}
            onSuccess={handleRefresh}
            defaultFecha={new Date(reunion.fecha)}
            initialData={{
              fecha: reunion.fecha,
              duracionMinutos: reunion.duracionMinutos,
              resumen: reunion.resumen,
              notas: reunion.notas,
            }}
          />
          <ReunionDetalleForm
            reunionId={reunionId}
            projectId={projectId}
            open={showDetalleForm}
            onOpenChange={setShowDetalleForm}
            onSuccess={handleRefresh}
            reunionData={reunion}
          />
        </>
      )}
    </>
  );
}
