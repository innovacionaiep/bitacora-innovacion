'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Check,
  FileText,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  X,
} from 'lucide-react';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { getActivityById } from '@/lib/actions/gantt';
import {
  getEvidenciasActividad,
  createEvidenciaActividad,
  deleteEvidenciaActividad,
  type EvidenciaActividadData,
} from '@/lib/actions/evidencias-actividad';
import {
  getComentariosActividad,
  createComentarioActividad,
  type ComentarioActividadData,
} from '@/lib/actions/comentarios-actividad';
import { uploadEvidenciaFile } from '@/lib/evidencias-upload';
import { PeriodTimeline } from '@/components/ui/period-timeline';

type ActivityWithRelations = Awaited<
  ReturnType<typeof getActivityById>
>['data'];

type Task = NonNullable<ActivityWithRelations>['tasks'][number];

function formatDateForTooltip(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getActivityDateRange(activity: ActivityWithRelations): { startDate: string; endDate: string } | null {
  if (!activity?.tasks || activity.tasks.length === 0) return null;
  const sorted = [...activity.tasks].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  return {
    startDate: sorted[0].startDate,
    endDate: sorted[sorted.length - 1].endDate,
  };
}

function getActivityProgress(activity: ActivityWithRelations): number {
  const tasks = activity?.tasks ?? [];
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

export interface ActividadDetalleModalProps {
  actividadId: string | null;
  proyectoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si el usuario puede agregar evidencias (Encargado) */
  canAddEvidencia?: boolean;
  onSuccess?: () => void | Promise<void>;
}

export function ActividadDetalleModal({
  actividadId,
  proyectoId,
  open,
  onOpenChange,
  canAddEvidencia = true,
  onSuccess,
}: ActividadDetalleModalProps) {
  const { data: session } = useSession();
  const [activity, setActivity] = useState<ActivityWithRelations | null>(null);
  const [loading, setLoading] = useState(false);
  const [evidencias, setEvidencias] = useState<EvidenciaActividadData[]>([]);
  const [comentarios, setComentarios] = useState<ComentarioActividadData[]>([]);
  const [loadingEvidencias, setLoadingEvidencias] = useState(false);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [uploadingEvidencia, setUploadingEvidencia] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [sendingComentario, setSendingComentario] = useState(false);
  const evidenciasFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !actividadId) {
      setActivity(null);
      setEvidencias([]);
      setComentarios([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getActivityById(actividadId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) setActivity(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [open, actividadId]);

  useEffect(() => {
    if (!open || !actividadId || actividadId.startsWith('temp-')) return;
    setLoadingEvidencias(true);
    getEvidenciasActividad(actividadId).then((res) => {
      setLoadingEvidencias(false);
      if (res.success && res.data) setEvidencias(res.data);
    });
  }, [open, actividadId]);

  useEffect(() => {
    if (!open || !actividadId || actividadId.startsWith('temp-')) return;
    setLoadingComentarios(true);
    getComentariosActividad(actividadId).then((res) => {
      setLoadingComentarios(false);
      if (res.success && res.data) setComentarios(res.data);
    });
  }, [open, actividadId]);

  const handleUploadEvidencia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activity) return;
    setUploadingEvidencia(true);
    const result = await uploadEvidenciaFile(file);
    if ('error' in result) {
      alert(result.error);
      setUploadingEvidencia(false);
      e.target.value = '';
      return;
    }
    const createResult = await createEvidenciaActividad(activity.id, {
      url: result.url,
      publicId: result.publicId,
      tipo: result.tipo,
      nombreArchivo: result.nombreArchivo,
    });
    if (createResult.success && createResult.data) {
      setEvidencias((prev) => [...prev, createResult.data!]);
      onSuccess?.();
    } else {
      alert(createResult.error ?? 'Error al guardar evidencia');
    }
    setUploadingEvidencia(false);
    e.target.value = '';
  };

  const handleDeleteEvidencia = async (evId: string) => {
    if (!confirm('¿Eliminar esta evidencia?')) return;
    const res = await deleteEvidenciaActividad(evId);
    if (res.success) {
      setEvidencias((prev) => prev.filter((e) => e.id !== evId));
      onSuccess?.();
    } else {
      alert(res.error ?? 'Error al eliminar');
    }
  };

  const handleEnviarComentario = async () => {
    if (!actividadId || !nuevoComentario.trim()) return;
    setSendingComentario(true);
    const result = await createComentarioActividad(actividadId, nuevoComentario.trim());
    setSendingComentario(false);
    if (result.success && result.data) {
      setComentarios((prev) => [result.data!, ...prev]);
      setNuevoComentario('');
      onSuccess?.();
    } else {
      alert(result.error ?? 'Error al enviar');
    }
  };

  const tasks = activity?.tasks ?? [];
  const allCompleted = tasks.length > 0 && tasks.every((t) => t.completed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[85vw] max-w-[85vw] h-[85vh] p-10 overflow-hidden flex flex-col pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <>
            <DialogTitle className="sr-only">Cargando actividad</DialogTitle>
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            </div>
          </>
        ) : !activity ? (
          <>
            <DialogTitle className="sr-only">Actividad no encontrada</DialogTitle>
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              Actividad no encontrada
            </div>
          </>
        ) : (
          <>
            <div className="mb-6 flex-shrink-0">
              {!allCompleted && (
                <div className="flex items-center gap-2 text-gray-500 mb-2">
                  <div className="w-5 h-5 rounded border-2 border-gray-300 bg-gray-100" />
                  <span className="text-sm">Actividad no finalizada</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <DialogTitle className="text-2xl font-bold text-emerald-600">
                  {activity.name || 'Sin nombre'}
                </DialogTitle>
                <div className="flex items-center gap-4">
                  <span className="text-base font-medium text-gray-700">Progreso</span>
                  <div className="w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all"
                      style={{ width: `${getActivityProgress(activity)}%` }}
                    />
                  </div>
                  <span className="text-xl font-bold text-emerald-600 min-w-[3rem]">
                    {getActivityProgress(activity)}%
                  </span>
                </div>
              </div>
              <div className="w-full h-px bg-emerald-600 mt-2" />
            </div>

            <div className="grid grid-cols-[1fr_1fr_1fr] gap-8 flex-1 min-h-0 overflow-hidden mt-0">
              {/* Columna Izq: Descripción, Período, Evidencias */}
              <div className="space-y-6 overflow-y-auto border-r border-gray-200 pr-8">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">Descripción</h3>
                  <p className="text-gray-700 text-base">
                    {activity.description || 'Sin descripción'}
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">Período</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    {getActivityDateRange(activity) ? (
                      <PeriodTimeline
                        startDate={getActivityDateRange(activity)!.startDate}
                        endDate={getActivityDateRange(activity)!.endDate}
                      />
                    ) : (
                      <p className="text-sm text-gray-500 italic">Sin tareas definidas</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-base mb-2">Evidencias</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {loadingEvidencias ? (
                      <p className="text-sm text-gray-500">Cargando...</p>
                    ) : evidencias.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No se han cargado evidencias</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {evidencias.map((ev) => (
                          <div
                            key={ev.id}
                            className="relative group rounded-lg border border-gray-200 bg-white overflow-hidden"
                          >
                            {ev.tipo === 'image' ? (
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-video"
                              >
                                <img
                                  src={ev.url}
                                  alt={ev.nombreArchivo ?? 'Evidencia'}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center aspect-video p-2 text-red-600"
                              >
                                <FileText className="h-8 w-8" />
                                <span className="text-xs truncate w-full text-center">
                                  {ev.nombreArchivo ?? 'PDF'}
                                </span>
                              </a>
                            )}
                            {canAddEvidencia && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEvidencia(ev.id)}
                                className="absolute top-1 right-1 p-1 bg-red-100 text-red-700 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-200"
                                title="Eliminar"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {canAddEvidencia && (
                      <div className="mt-3">
                        <input
                          ref={evidenciasFileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                          className="hidden"
                          onChange={handleUploadEvidencia}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full gap-2"
                          disabled={uploadingEvidencia}
                          onClick={() => evidenciasFileInputRef.current?.click()}
                        >
                          {uploadingEvidencia ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Subiendo...
                            </>
                          ) : (
                            <>
                              <Paperclip className="h-4 w-4" />
                              Agregar evidencia (JPG o PDF)
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Centro: Tareas */}
              <div className="flex flex-col min-h-0 overflow-hidden">
                <h3 className="font-semibold text-gray-900 text-base mb-4 flex-shrink-0">
                  Tareas ({tasks.length})
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                  {tasks.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No hay tareas definidas</p>
                  ) : (
                    [...tasks]
                      .sort(
                        (a, b) =>
                          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                      )
                      .map((task: Task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                              task.completed
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-gray-300'
                            }`}
                          >
                            {task.completed && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`font-medium block ${
                                task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}
                            >
                              {task.name}
                            </span>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-0.5">{task.description}</p>
                            )}
                            <span className="text-xs text-gray-500 block mt-1">
                              {formatDateForTooltip(task.startDate)} -{' '}
                              {formatDateForTooltip(task.endDate)}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Columna Derecha: Comentarios (mismo diseño que GanttChart) */}
              <div className="flex flex-col min-h-0 border-l border-gray-200 pl-8">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-200 mb-4 flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900">Comentarios</h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
                  {loadingComentarios ? (
                    <p className="text-gray-500">Cargando comentarios...</p>
                  ) : comentarios.length === 0 ? (
                    <p className="text-gray-500">No hay comentarios aún</p>
                  ) : (
                    comentarios.map((c) => (
                      <div key={c.id} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0">
                          <img
                            src={DEFAULT_AVATAR}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {c.user.name || 'Usuario'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {new Date(c.createdAt).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-gray-700 whitespace-pre-wrap">{c.contenido}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {session?.user && (
                  <div className="flex gap-4 pt-4 pb-2 border-t border-gray-200 flex-shrink-0">
                    <div className="flex-shrink-0">
                      <img
                        src={DEFAULT_AVATAR}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm text-gray-500">
                        Comentas como{' '}
                        {session.user.name || session.user.email}
                      </p>
                      <div className="flex gap-2">
                        <textarea
                          value={nuevoComentario}
                          onChange={(e) => setNuevoComentario(e.target.value)}
                          placeholder="Escribe un comentario..."
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-base"
                          rows={3}
                        />
                        <button
                          type="button"
                          onClick={handleEnviarComentario}
                          disabled={!nuevoComentario.trim() || sendingComentario}
                          className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
                        >
                          {sendingComentario ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <Send className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
