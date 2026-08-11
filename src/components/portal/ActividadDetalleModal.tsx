'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { getActivityById, updateActivity } from '@/lib/actions/gantt';
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
import {
  ActivityFieldSaveCancel,
  ActivityHoverEditButton,
} from '@/components/proyectos/gantt/ActivityFieldControls';
import {
  DETAIL_MODAL_COL_CLASS,
  DETAIL_MODAL_COL_DIVIDER_CLASS,
  DETAIL_MODAL_COLUMNS_CLASS,
  DETAIL_MODAL_CONTENT_CLASS,
  DETAIL_MODAL_HEADER_ROW_CLASS,
  DETAIL_MODAL_PROGRESS_BAR_CLASS,
  DETAIL_MODAL_PROGRESS_WRAP_CLASS,
  DETAIL_MODAL_TITLE_CLASS,
} from '@/lib/ui/detail-modal';
import { cn } from '@/lib/utils';

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
  /** Admin / Coordinador / Encargado: lápices de edición (nombre, descripción). */
  canEdit?: boolean;
  /** Si el usuario puede agregar evidencias */
  canAddEvidencia?: boolean;
  onSuccess?: () => void | Promise<void>;
}

type ActivityEditableField = 'name' | 'description';

export function ActividadDetalleModal({
  actividadId,
  proyectoId,
  open,
  onOpenChange,
  canEdit = false,
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
  const [editingField, setEditingField] = useState<ActivityEditableField | null>(
    null
  );
  const [fieldDraft, setFieldDraft] = useState({ name: '', description: '' });
  const [isSavingField, setIsSavingField] = useState(false);
  const evidenciasFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !actividadId) {
      setActivity(null);
      setEvidencias([]);
      setComentarios([]);
      setEditingField(null);
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

  const handleStartFieldEdit = (field: ActivityEditableField) => {
    if (!activity || !canEdit) return;
    setFieldDraft({
      name: activity.name || '',
      description: activity.description || '',
    });
    setEditingField(field);
  };

  const handleCancelFieldEdit = () => {
    setEditingField(null);
    if (activity) {
      setFieldDraft({
        name: activity.name || '',
        description: activity.description || '',
      });
    }
  };

  const handleSaveField = async () => {
    if (!activity || !editingField) return;
    if (editingField === 'name') {
      const name = fieldDraft.name.trim();
      if (!name) {
        alert('Por favor completa el nombre de la actividad');
        return;
      }
      if (name.length > 70) {
        alert('El nombre de la actividad no puede exceder los 70 caracteres');
        return;
      }
    }

    setIsSavingField(true);
    try {
      const payload =
        editingField === 'name'
          ? { name: fieldDraft.name.trim() }
          : { description: fieldDraft.description };
      const { error } = await updateActivity(activity.id, payload);
      if (error) {
        alert('Error al actualizar la actividad: ' + error);
        return;
      }
      setActivity({ ...activity, ...payload });
      setEditingField(null);
      onSuccess?.();
    } finally {
      setIsSavingField(false);
    }
  };

  const tasks = activity?.tasks ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeButtonPosition="outside-top-right"
        className={DETAIL_MODAL_CONTENT_CLASS}
        onClick={(e) => e.stopPropagation()}
      >
        {loading ? (
          <>
            <DialogTitle className="sr-only">Cargando actividad</DialogTitle>
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          </>
        ) : !activity ? (
          <>
            <DialogTitle className="sr-only">Actividad no encontrada</DialogTitle>
            <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400">
              Actividad no encontrada
            </div>
          </>
        ) : (
          <>
            <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/90 px-5 py-4">
              <div className={DETAIL_MODAL_HEADER_ROW_CLASS}>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {editingField === 'name' ? (
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <DialogTitle className="sr-only">Editar nombre</DialogTitle>
                      <input
                        type="text"
                        value={fieldDraft.name}
                        onChange={(e) =>
                          setFieldDraft((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="h-auto w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xl font-semibold text-gray-900 shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 @min-[720px]:text-2xl"
                        maxLength={70}
                        autoFocus
                      />
                      <ActivityFieldSaveCancel
                        isSaving={isSavingField}
                        onSave={handleSaveField}
                        onCancel={handleCancelFieldEdit}
                      />
                    </div>
                  ) : (
                    <div className="group/field relative min-w-0 max-w-full pr-8">
                      <DialogTitle className={DETAIL_MODAL_TITLE_CLASS}>
                        {activity.name || 'Sin nombre'}
                      </DialogTitle>
                      {canEdit && (
                        <ActivityHoverEditButton
                          onClick={() => handleStartFieldEdit('name')}
                          tooltip="Editar nombre"
                        />
                      )}
                    </div>
                  )}
                </div>
                {editingField !== 'name' && (
                  <div className={DETAIL_MODAL_PROGRESS_WRAP_CLASS}>
                    <span className="text-sm font-medium text-gray-700 @min-[720px]:text-base">
                      Progreso
                    </span>
                    <div className={DETAIL_MODAL_PROGRESS_BAR_CLASS}>
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${getActivityProgress(activity)}%` }}
                      />
                    </div>
                    <span className="min-w-[3.5rem] text-xl font-bold tabular-nums text-gray-800 @min-[720px]:min-w-[4rem] @min-[720px]:text-2xl">
                      {getActivityProgress(activity)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className={DETAIL_MODAL_COLUMNS_CLASS}>
              {/* Columna Izq: Descripción, Período, Evidencias */}
              <div className={cn(DETAIL_MODAL_COL_CLASS, DETAIL_MODAL_COL_DIVIDER_CLASS)}>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    Descripción
                  </h3>
                  {editingField === 'description' ? (
                    <div className="min-w-0">
                      <textarea
                        value={fieldDraft.description}
                        onChange={(e) =>
                          setFieldDraft((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 min-h-[110px] resize-y text-[13px] text-gray-800"
                        rows={3}
                        autoFocus
                      />
                      <ActivityFieldSaveCancel
                        isSaving={isSavingField}
                        onSave={handleSaveField}
                        onCancel={handleCancelFieldEdit}
                      />
                    </div>
                  ) : (
                    <div className="group/field relative min-w-0 pr-8">
                      <p className="text-[15px] text-gray-800 leading-[1.75] break-words [overflow-wrap:anywhere]">
                        {activity.description || 'Sin descripción'}
                      </p>
                      {canEdit && (
                        <ActivityHoverEditButton
                          onClick={() => handleStartFieldEdit('description')}
                          tooltip="Editar descripción"
                        />
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    Período
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-4">
                    {getActivityDateRange(activity) ? (
                      <PeriodTimeline
                        startDate={getActivityDateRange(activity)!.startDate}
                        endDate={getActivityDateRange(activity)!.endDate}
                      />
                    ) : (
                      <p className="text-[13px] text-gray-400">Sin tareas definidas</p>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                    Evidencias
                  </h3>
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    {loadingEvidencias ? (
                      <p className="text-[13px] text-gray-400">Cargando...</p>
                    ) : evidencias.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-4 space-y-3">
                        <p className="text-[13px] text-gray-400">
                          No se han cargado evidencias
                        </p>
                        {canAddEvidencia && (
                          <button
                            type="button"
                            disabled={uploadingEvidencia}
                            onClick={() =>
                              evidenciasFileInputRef.current?.click()
                            }
                            className="inline-flex w-full items-center justify-center gap-1.5 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm border border-dashed border-gray-200 bg-white py-2.5"
                          >
                            {uploadingEvidencia ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Subiendo...
                              </>
                            ) : (
                              <>
                                <Paperclip
                                  className="h-3.5 w-3.5"
                                  strokeWidth={2}
                                />
                                Agregar evidencia (JPG o PDF)
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {evidencias.map((ev) => (
                          <div
                            key={ev.id}
                            className="relative group rounded-lg border border-gray-200 bg-white overflow-hidden shadow-none"
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
                                className="flex flex-col items-center justify-center aspect-video p-2 text-gray-600"
                              >
                                <FileText className="h-7 w-7 text-gray-500" />
                                <span className="text-[12px] truncate w-full text-center text-gray-700">
                                  {ev.nombreArchivo ?? 'PDF'}
                                </span>
                              </a>
                            )}
                            {canAddEvidencia && (
                              <button
                                type="button"
                                onClick={() => handleDeleteEvidencia(ev.id)}
                                className="absolute top-1 right-1 p-1 rounded-sm bg-white/90 border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-600"
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
                      <>
                        <input
                          ref={evidenciasFileInputRef}
                          type="file"
                          accept=".jpg,.jpeg,.pdf,image/jpeg,application/pdf"
                          className="hidden"
                          onChange={handleUploadEvidencia}
                        />
                        {evidencias.length > 0 && (
                          <div className="mt-3">
                            <button
                              type="button"
                              disabled={uploadingEvidencia}
                              onClick={() =>
                                evidenciasFileInputRef.current?.click()
                              }
                              className="inline-flex w-full items-center justify-center gap-1.5 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm border border-dashed border-gray-200 bg-gray-50/40 py-2.5"
                            >
                              {uploadingEvidencia ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Subiendo...
                                </>
                              ) : (
                                <>
                                  <Paperclip
                                    className="h-3.5 w-3.5"
                                    strokeWidth={2}
                                  />
                                  Agregar evidencia (JPG o PDF)
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Centro: Tareas */}
              <div
                className={cn(
                  DETAIL_MODAL_COL_CLASS,
                  DETAIL_MODAL_COL_DIVIDER_CLASS,
                  'flex flex-col space-y-0'
                )}
              >
                <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-3 flex-shrink-0">
                  Tareas{' '}
                  <span className="normal-case tracking-normal text-gray-400">
                    ({tasks.length})
                  </span>
                </h3>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                  {tasks.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-8">
                      <p className="text-[13px] text-gray-400 text-center">No hay tareas definidas</p>
                    </div>
                  ) : (
                    [...tasks]
                      .sort(
                        (a, b) =>
                          new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                      )
                      .map((task: Task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-3 p-3.5 rounded-lg border border-gray-200 bg-white"
                        >
                          <div
                            className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 ${
                              task.completed
                                ? 'bg-emerald-600 border-emerald-600'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {task.completed && (
                              <Check className="h-2.5 w-2.5 text-white" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span
                              className={`text-[13px] font-medium block ${
                                task.completed ? 'line-through text-gray-400' : 'text-gray-800'
                              }`}
                            >
                              {task.name}
                            </span>
                            {task.description && (
                              <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{task.description}</p>
                            )}
                            <span className="text-[11px] text-gray-400 block mt-1">
                              {formatDateForTooltip(task.startDate)} -{' '}
                              {formatDateForTooltip(task.endDate)}
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Columna Derecha: Comentarios */}
              <div className={cn(DETAIL_MODAL_COL_CLASS, 'flex flex-col space-y-0')}>
                <div className="mb-4 flex flex-shrink-0 items-center gap-2 border-b border-gray-100 pb-3">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-500" strokeWidth={2} />
                  <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                    Comentarios
                  </h3>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 mb-4 min-h-0 custom-scrollbar">
                  {loadingComentarios ? (
                    <p className="text-[13px] text-gray-400">Cargando comentarios...</p>
                  ) : comentarios.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-4">
                      <p className="text-[13px] text-gray-400">No hay comentarios aún</p>
                    </div>
                  ) : (
                    comentarios.map((c) => (
                      <div key={c.id} className="flex gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                        <div className="flex-shrink-0">
                          <img
                            src={DEFAULT_AVATAR}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[13px] font-medium text-gray-800">
                              {c.user.name || 'Usuario'}
                            </span>
                            {c.rolEnProyecto && (
                              <span className="text-[11px] font-medium text-gray-500">
                                · {c.rolEnProyecto}
                              </span>
                            )}
                            <span className="text-[11px] text-gray-400">
                              {new Date(c.createdAt).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-[13px] text-gray-700 leading-snug whitespace-pre-wrap">{c.contenido}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {session?.user && (
                  <div className="flex gap-3 pt-3 pb-1 border-t border-gray-100 flex-shrink-0">
                    <div className="flex-shrink-0">
                      <img
                        src={DEFAULT_AVATAR}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <p className="text-[12px] text-gray-400">
                        Comentas como{' '}
                        {session.user.name || session.user.email}
                        {(session.user.availableRoles ?? []).length > 0
                          ? ` · ${(session.user.availableRoles ?? []).join(', ')}`
                          : ''}
                      </p>
                      <div className="flex gap-2">
                        <textarea
                          value={nuevoComentario}
                          onChange={(e) => setNuevoComentario(e.target.value)}
                          placeholder="Escribe un comentario..."
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 resize-none text-[13px] text-gray-800"
                          rows={3}
                        />
                        <button
                          type="button"
                          onClick={handleEnviarComentario}
                          disabled={!nuevoComentario.trim() || sendingComentario}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-gray-500 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                        >
                          {sendingComentario ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" strokeWidth={2} />
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
