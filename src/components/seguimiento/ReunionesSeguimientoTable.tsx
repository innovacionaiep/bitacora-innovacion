'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  addCompromiso,
  addReunion,
  toggleCompromiso,
  updateReunion,
} from '@/lib/actions/seguimiento';
import { Check, Loader2, Pencil, Plus, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import { getPermissionsForRole } from '@/lib/permissions/check';
import type { RolePermissionMap } from '@/lib/permissions/catalog';
import {
  CompromisoDetalleModal,
  formatFechaReunion,
  getPostItClass,
  tituloDeDescripcion,
  type CompromisoItem,
} from './compromiso-ui';

type ReunionItem = Awaited<
  ReturnType<typeof import('@/lib/actions/seguimiento').getReunionesProyecto>
>['data'][number];

interface ReunionesSeguimientoTableProps {
  projectId: string;
  reuniones: ReunionItem[];
  rolEnProyecto?: string | null;
  onSuccess: () => void | Promise<void>;
  /** Sync ligero tras toggle (sin refetch que revierta el UI optimista). */
  onBackgroundSync?: () => void;
  onOptimisticCompromisoUpdate?: (
    id: string,
    patch: { completado?: boolean; titulo?: string | null; descripcion?: string }
  ) => void;
  onOptimisticCompromisoAdd?: (compromiso: CompromisoItem) => void;
  onOptimisticCompromisoRemove?: (id: string) => void;
  onOptimisticReunionAdd?: (reunion: ReunionItem) => void;
  onOptimisticReunionUpdate?: (
    id: string,
    patch: { fecha?: Date; resumen?: string; numero?: number }
  ) => void;
  onOptimisticReunionRemove?: (id: string) => void;
}

function toDateInputValue(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function nextNumero(reuniones: ReunionItem[]): number {
  return reuniones.reduce((max, r) => Math.max(max, r.numero), 0) + 1;
}

const ACTION_BTN =
  'p-1.5 bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center';

function EditActions({
  onSave,
  onCancel,
  saving,
  saveDisabled,
}: {
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={onSave}
        disabled={saving || saveDisabled}
        className={`${ACTION_BTN} hover:bg-green-100`}
        title="Guardar"
        aria-label="Guardar"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 text-gray-700 animate-spin" />
        ) : (
          <Check className="h-3.5 w-3.5 text-gray-700" />
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className={`${ACTION_BTN} hover:bg-red-100`}
        title="Cancelar"
        aria-label="Cancelar"
      >
        <X className="h-3.5 w-3.5 text-gray-700" />
      </button>
    </div>
  );
}

function HoverEditButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${ACTION_BTN} opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100 hover:bg-gray-200`}
      title={label}
      aria-label={label}
    >
      <Pencil className="h-3.5 w-3.5 text-gray-700" />
    </button>
  );
}

type DraftReunion = {
  numero: string;
  fecha: string;
};

type EditingField = 'numero' | 'fecha' | 'resumen';

export function ReunionesSeguimientoTable({
  projectId,
  reuniones,
  rolEnProyecto,
  onSuccess,
  onBackgroundSync,
  onOptimisticCompromisoUpdate,
  onOptimisticCompromisoAdd,
  onOptimisticCompromisoRemove,
  onOptimisticReunionAdd,
  onOptimisticReunionUpdate,
  onOptimisticReunionRemove,
}: ReunionesSeguimientoTableProps) {
  const [draft, setDraft] = useState<DraftReunion | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);

  const [editing, setEditing] = useState<{
    id: string;
    field: EditingField;
  } | null>(null);
  const [editNumero, setEditNumero] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editResumen, setEditResumen] = useState('');
  const [savingField, setSavingField] = useState(false);

  const [addCompromisoReunionId, setAddCompromisoReunionId] = useState<
    string | null
  >(null);
  const [addCompromisoTitulo, setAddCompromisoTitulo] = useState('');
  const [addCompromisoDescripcion, setAddCompromisoDescripcion] = useState('');
  const [submittingCompromiso, setSubmittingCompromiso] = useState(false);
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(
    () => new Set()
  );

  const [selectedCompromiso, setSelectedCompromiso] =
    useState<CompromisoItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const draftNumeroRef = useRef<HTMLInputElement>(null);
  const addCompromisoRef = useRef<HTMLInputElement>(null);

  const { data: session } = useSession();
  const availableRoles = session?.user?.availableRoles ?? [];
  const isAdmin = userHasAdminEnabled(availableRoles);
  const [partPerms, setPartPerms] = useState<RolePermissionMap | null>(null);

  useEffect(() => {
    if (!rolEnProyecto) {
      setPartPerms(null);
      return;
    }
    let cancelled = false;
    getPermissionsForRole(rolEnProyecto).then((map) => {
      if (!cancelled) setPartPerms(map);
    });
    return () => {
      cancelled = true;
    };
  }, [rolEnProyecto]);

  useEffect(() => {
    if (draft) {
      draftNumeroRef.current?.focus();
      draftNumeroRef.current?.select();
    }
  }, [draft]);

  useEffect(() => {
    if (addCompromisoReunionId) {
      addCompromisoRef.current?.focus();
    }
  }, [addCompromisoReunionId]);

  const canCreateEdit =
    isAdmin || partPerms?.['compromisos.create_edit'] === true;
  const canMarkRealizado =
    isAdmin || partPerms?.['compromisos.mark_done'] === true;

  const startDraft = () => {
    if (draft || savingDraft) return;
    setDraft({
      numero: String(nextNumero(reuniones)),
      fecha: toDateInputValue(new Date()),
    });
    setEditing(null);
    setAddCompromisoReunionId(null);
  };

  const cancelDraft = () => {
    if (savingDraft) return;
    setDraft(null);
  };

  const parseDraftNumero = (value: string): number | null => {
    const n = Number.parseInt(value.trim(), 10);
    if (!Number.isInteger(n) || n < 1) return null;
    return n;
  };

  const handleCreateDraft = async () => {
    if (!draft || savingDraft) return;
    const numero = parseDraftNumero(draft.numero);
    if (numero === null || !draft.fecha) return;

    const fecha = new Date(`${draft.fecha}T12:00:00`);
    if (Number.isNaN(fecha.getTime())) return;

    const tempId = `temp-reunion-${Date.now()}`;
    const optimistic: ReunionItem = {
      id: tempId,
      proyectoId: projectId,
      numero,
      fecha,
      resumen: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      compromisos: [],
    } as ReunionItem;

    onOptimisticReunionAdd?.(optimistic);
    setDraft(null);
    setSavingDraft(true);

    const result = await addReunion(projectId, {
      fecha,
      resumen: '',
      numero,
    });

    setSavingDraft(false);
    if (result.success) {
      void onSuccess();
    } else {
      onOptimisticReunionRemove?.(tempId);
      alert(result.error ?? 'Error al agregar reunión');
    }
  };

  const startEdit = (reunion: ReunionItem, field: EditingField) => {
    if (!canCreateEdit || draft) return;
    setEditing({ id: reunion.id, field });
    setEditNumero(String(reunion.numero));
    setEditFecha(toDateInputValue(reunion.fecha));
    setEditResumen(reunion.resumen);
    setAddCompromisoReunionId(null);
  };

  const cancelEdit = () => {
    if (savingField) return;
    setEditing(null);
  };

  const saveEdit = async () => {
    if (!editing || savingField) return;
    const reunion = reuniones.find((r) => r.id === editing.id);
    if (!reunion) {
      setEditing(null);
      return;
    }

    const patch: { fecha?: Date; resumen?: string; numero?: number } = {};
    const previous: { fecha?: Date; resumen?: string; numero?: number } = {};

    if (editing.field === 'numero') {
      const numero = parseDraftNumero(editNumero);
      if (numero === null) {
        alert('El número de reunión debe ser un entero mayor a 0');
        return;
      }
      if (numero === reunion.numero) {
        setEditing(null);
        return;
      }
      patch.numero = numero;
      previous.numero = reunion.numero;
    } else if (editing.field === 'fecha') {
      if (!editFecha) {
        alert('La fecha es obligatoria');
        return;
      }
      const fecha = new Date(`${editFecha}T12:00:00`);
      if (Number.isNaN(fecha.getTime())) {
        alert('La fecha no es válida');
        return;
      }
      if (toDateInputValue(reunion.fecha) === editFecha) {
        setEditing(null);
        return;
      }
      patch.fecha = fecha;
      previous.fecha = reunion.fecha;
    } else {
      const resumen = editResumen.trim();
      if (resumen === reunion.resumen) {
        setEditing(null);
        return;
      }
      patch.resumen = resumen;
      previous.resumen = reunion.resumen;
    }

    onOptimisticReunionUpdate?.(reunion.id, patch);
    setEditing(null);
    setSavingField(true);
    const result = await updateReunion(reunion.id, patch);
    setSavingField(false);
    if (result.success) {
      void onSuccess();
    } else {
      onOptimisticReunionUpdate?.(reunion.id, previous);
      alert(result.error ?? 'Error al actualizar reunión');
    }
  };

  const handleAddCompromiso = async (reunionId: string) => {
    const descripcion = addCompromisoDescripcion.trim();
    if (!descripcion || submittingCompromiso) return;
    const titulo = addCompromisoTitulo.trim() || null;

    const tempId = `temp-comp-${Date.now()}`;
    const optimistic: CompromisoItem = {
      id: tempId,
      proyectoId: projectId,
      reunionId,
      titulo,
      descripcion,
      fechaLimite: null,
      asignadoA: null,
      completado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CompromisoItem;

    onOptimisticCompromisoAdd?.(optimistic);
    setAddCompromisoReunionId(null);
    setAddCompromisoTitulo('');
    setAddCompromisoDescripcion('');

    setSubmittingCompromiso(true);
    const result = await addCompromiso(projectId, descripcion, {
      reunionId,
      titulo,
    });
    setSubmittingCompromiso(false);
    if (result.success) {
      void onSuccess();
    } else {
      onOptimisticCompromisoRemove?.(tempId);
      alert(result.error ?? 'Error al agregar compromiso');
    }
  };

  const handleToggleRealizado = async (compromiso: CompromisoItem) => {
    if (!canMarkRealizado || pendingToggleIds.has(compromiso.id)) return;

    const prevCompletado = compromiso.completado;
    const nextCompletado = !prevCompletado;

    onOptimisticCompromisoUpdate?.(compromiso.id, {
      completado: nextCompletado,
    });
    setSelectedCompromiso((prev) =>
      prev?.id === compromiso.id
        ? { ...prev, completado: nextCompletado }
        : prev
    );
    setPendingToggleIds((prev) => {
      const next = new Set(prev);
      next.add(compromiso.id);
      return next;
    });

    const result = await toggleCompromiso(compromiso.id);

    setPendingToggleIds((prev) => {
      const next = new Set(prev);
      next.delete(compromiso.id);
      return next;
    });

    if (result.success) {
      onBackgroundSync?.();
    } else {
      onOptimisticCompromisoUpdate?.(compromiso.id, {
        completado: prevCompletado,
      });
      setSelectedCompromiso((prev) =>
        prev?.id === compromiso.id
          ? { ...prev, completado: prevCompletado }
          : prev
      );
      alert(result.error ?? 'Error al actualizar el compromiso');
    }
  };

  const draftReady =
    !!draft &&
    parseDraftNumero(draft.numero) !== null &&
    !!draft.fecha &&
    !Number.isNaN(new Date(`${draft.fecha}T12:00:00`).getTime());

  const renderCompromisosCell = (
    reunion: ReunionItem,
    opts?: { disabled?: boolean }
  ) => (
    <div className="flex flex-wrap gap-2 items-start">
      {reunion.compromisos.map((compromiso) => {
        const titulo =
          compromiso.titulo?.trim() ||
          tituloDeDescripcion(compromiso.descripcion, 60);
        const descripcion = compromiso.descripcion?.trim() ?? '';

        return (
          <div
            key={compromiso.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedCompromiso(compromiso as CompromisoItem);
              setDetailOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedCompromiso(compromiso as CompromisoItem);
                setDetailOpen(true);
              }
            }}
            className={`rounded-lg border-2 shadow-sm p-3 w-full max-w-[260px] text-left cursor-pointer hover:shadow-md transition-shadow flex flex-col gap-2 ${getPostItClass(compromiso)}`}
          >
            <p
              className={`text-sm font-semibold leading-snug break-words ${
                compromiso.completado
                  ? 'line-through text-gray-600'
                  : 'text-gray-900'
              }`}
            >
              {titulo}
            </p>
            {descripcion ? (
              <p
                className={`text-xs leading-snug whitespace-pre-wrap break-words line-clamp-4 ${
                  compromiso.completado
                    ? 'line-through text-gray-500'
                    : 'text-gray-700'
                }`}
              >
                {descripcion}
              </p>
            ) : null}
            <div
              className="flex flex-wrap gap-3 mt-auto pt-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              <label className="flex items-center gap-2 cursor-pointer text-[13px] text-gray-600">
                <Checkbox
                  checked={compromiso.completado}
                  onCheckedChange={() =>
                    canMarkRealizado &&
                    void handleToggleRealizado(compromiso as CompromisoItem)
                  }
                  disabled={
                    !canMarkRealizado || pendingToggleIds.has(compromiso.id)
                  }
                  className="border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:border-emerald-600 focus-visible:ring-emerald-500/40"
                />
                {compromiso.completado
                  ? 'Realizada'
                  : 'Marcar como realizada'}
              </label>
            </div>
          </div>
        );
      })}
      {canCreateEdit && !opts?.disabled && (
        addCompromisoReunionId === reunion.id ? (
          <div className="flex flex-col gap-1.5 min-w-[220px] w-[220px] rounded-lg border border-dashed border-emerald-300 bg-white p-2">
            <Input
              ref={addCompromisoRef}
              value={addCompromisoTitulo}
              onChange={(e) => setAddCompromisoTitulo(e.target.value)}
              placeholder="Título"
              className="h-8 text-xs border-gray-200"
              disabled={submittingCompromiso}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setAddCompromisoReunionId(null);
                  setAddCompromisoTitulo('');
                  setAddCompromisoDescripcion('');
                }
              }}
            />
            <Textarea
              value={addCompromisoDescripcion}
              onChange={(e) => setAddCompromisoDescripcion(e.target.value)}
              placeholder="Descripción…"
              rows={2}
              className="resize-none text-xs border-gray-200"
              disabled={submittingCompromiso}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void handleAddCompromiso(reunion.id);
                }
                if (e.key === 'Escape') {
                  setAddCompromisoReunionId(null);
                  setAddCompromisoTitulo('');
                  setAddCompromisoDescripcion('');
                }
              }}
            />
            <div className="flex items-center justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-gray-500"
                disabled={submittingCompromiso}
                onClick={() => {
                  setAddCompromisoReunionId(null);
                  setAddCompromisoTitulo('');
                  setAddCompromisoDescripcion('');
                }}
                aria-label="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-emerald-700"
                disabled={
                  !addCompromisoDescripcion.trim() || submittingCompromiso
                }
                onClick={() => void handleAddCompromiso(reunion.id)}
                aria-label="Guardar compromiso"
              >
                {submittingCompromiso ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8 flex-shrink-0 border-dashed border-gray-300 text-gray-500 hover:text-emerald-700 hover:border-emerald-400"
            onClick={() => {
              setEditing(null);
              setAddCompromisoReunionId(reunion.id);
              setAddCompromisoTitulo('');
              setAddCompromisoDescripcion('');
            }}
            aria-label={`Agregar compromiso a reunión ${reunion.numero}`}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )
      )}
    </div>
  );

  return (
    <>
      <div
        id="tour-seguimiento-reuniones"
        className="rounded-xl border border-gray-200 bg-white shadow-lg flex flex-col min-h-0 overflow-hidden"
      >
        <div className="overflow-auto">
          <table className="w-full table-fixed text-sm">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[36%]" />
              <col className="w-[40%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500">
                <th className="px-3 py-2.5 font-semibold">N° de reunión</th>
                <th className="px-3 py-2.5 font-semibold">Fecha</th>
                <th className="px-3 py-2.5 font-semibold">Resumen</th>
                <th
                  id="tour-seguimiento-compromisos"
                  className="px-3 py-2.5 font-semibold"
                >
                  Compromisos
                </th>
              </tr>
            </thead>
            <tbody>
              {reuniones.length === 0 && !draft ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-sm text-gray-500"
                  >
                    No hay reuniones registradas
                    {canCreateEdit ? '. Usa + para agregar una línea.' : ''}
                  </td>
                </tr>
              ) : null}

              {reuniones.map((reunion) => {
                const isEditingNumero =
                  editing?.id === reunion.id && editing.field === 'numero';
                const isEditingFecha =
                  editing?.id === reunion.id && editing.field === 'fecha';
                const isEditingResumen =
                  editing?.id === reunion.id && editing.field === 'resumen';

                return (
                  <tr
                    key={reunion.id}
                    className="border-b border-gray-100 align-top hover:bg-gray-50/50"
                  >
                    <td className="px-3 py-3">
                      {isEditingNumero ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="number"
                            min={1}
                            value={editNumero}
                            onChange={(e) => setEditNumero(e.target.value)}
                            className="h-8 w-20 text-sm font-semibold"
                            autoFocus
                            disabled={savingField}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void saveEdit();
                              }
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <EditActions
                            onSave={() => void saveEdit()}
                            onCancel={cancelEdit}
                            saving={savingField}
                          />
                        </div>
                      ) : (
                        <div className="group/field flex items-center gap-1.5">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-emerald-50 px-2 text-sm font-semibold text-emerald-700">
                            {reunion.numero}
                          </span>
                          {canCreateEdit && !draft ? (
                            <HoverEditButton
                              onClick={() => startEdit(reunion, 'numero')}
                              label="Editar número"
                            />
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {isEditingFecha ? (
                        <div className="flex items-center gap-1.5">
                          <Input
                            type="date"
                            value={editFecha}
                            onChange={(e) => setEditFecha(e.target.value)}
                            className="h-8 w-[140px] text-sm"
                            autoFocus
                            disabled={savingField}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                void saveEdit();
                              }
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                          <EditActions
                            onSave={() => void saveEdit()}
                            onCancel={cancelEdit}
                            saving={savingField}
                          />
                        </div>
                      ) : (
                        <div className="group/field flex items-center gap-1.5">
                          <span>{formatFechaReunion(reunion.fecha)}</span>
                          {canCreateEdit && !draft ? (
                            <HoverEditButton
                              onClick={() => startEdit(reunion, 'fecha')}
                              label="Editar fecha"
                            />
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {isEditingResumen ? (
                        <div className="flex items-start gap-1.5">
                          <Textarea
                            value={editResumen}
                            onChange={(e) => setEditResumen(e.target.value)}
                            rows={3}
                            className="resize-none text-sm border-gray-200 flex-1 min-w-0"
                            autoFocus
                            disabled={savingField}
                            placeholder="Resumen (opcional)"
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') cancelEdit();
                              if (
                                e.key === 'Enter' &&
                                (e.metaKey || e.ctrlKey)
                              ) {
                                e.preventDefault();
                                void saveEdit();
                              }
                            }}
                          />
                          <EditActions
                            onSave={() => void saveEdit()}
                            onCancel={cancelEdit}
                            saving={savingField}
                          />
                        </div>
                      ) : reunion.resumen.trim() ? (
                        <div className="group/field flex items-start gap-1.5">
                          <p className="whitespace-pre-wrap break-words flex-1 min-w-0">
                            {reunion.resumen}
                          </p>
                          {canCreateEdit && !draft ? (
                            <HoverEditButton
                              onClick={() => startEdit(reunion, 'resumen')}
                              label="Editar resumen"
                            />
                          ) : null}
                        </div>
                      ) : canCreateEdit && !draft ? (
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 flex-shrink-0 border-dashed border-gray-300 text-gray-500 hover:text-emerald-700 hover:border-emerald-400"
                          onClick={() => startEdit(reunion, 'resumen')}
                          aria-label="Agregar resumen"
                          title="Agregar resumen"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <span className="text-gray-400 italic text-xs">
                          Sin resumen
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {renderCompromisosCell(reunion)}
                    </td>
                  </tr>
                );
              })}

              {draft ? (
                <tr className="border-b border-emerald-100 bg-emerald-50/40 align-middle">
                  <td className="px-3 py-3">
                    <Input
                      ref={draftNumeroRef}
                      type="number"
                      min={1}
                      value={draft.numero}
                      onChange={(e) =>
                        setDraft((d) =>
                          d ? { ...d, numero: e.target.value } : d
                        )
                      }
                      className="h-8 w-20 text-sm font-semibold"
                      disabled={savingDraft}
                      aria-label="Número de reunión"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') cancelDraft();
                        if (e.key === 'Enter' && draftReady) {
                          e.preventDefault();
                          void handleCreateDraft();
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="date"
                        value={draft.fecha}
                        onChange={(e) =>
                          setDraft((d) =>
                            d ? { ...d, fecha: e.target.value } : d
                          )
                        }
                        className="h-8 w-[140px] text-sm"
                        disabled={savingDraft}
                        aria-label="Fecha de reunión"
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') cancelDraft();
                          if (e.key === 'Enter' && draftReady) {
                            e.preventDefault();
                            void handleCreateDraft();
                          }
                        }}
                      />
                      <EditActions
                        onSave={() => void handleCreateDraft()}
                        onCancel={cancelDraft}
                        saving={savingDraft}
                        saveDisabled={!draftReady}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                </tr>
              ) : null}

              {canCreateEdit && !draft && (
                <tr
                  id="tour-seguimiento-agregar-reunion"
                  className="hover:bg-green-50/70 transition-colors cursor-pointer border-t-2 border-dashed border-gray-200"
                  onClick={startDraft}
                >
                  <td colSpan={4} className="text-center py-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        startDraft();
                      }}
                      className="p-3 bg-gray-100 rounded-full hover:bg-green-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                      title="Agregar reunión"
                      aria-label="Agregar reunión"
                    >
                      <Plus className="h-5 w-5 text-gray-700" />
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CompromisoDetalleModal
        compromiso={selectedCompromiso}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedCompromiso(null);
        }}
        rolEnProyecto={rolEnProyecto}
        onSuccess={onSuccess}
        onBackgroundSync={onBackgroundSync}
        onOptimisticCompromisoUpdate={onOptimisticCompromisoUpdate}
        onOptimisticCompromisoRemove={onOptimisticCompromisoRemove}
      />
    </>
  );
}
