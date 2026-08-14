'use client';

import { useEffect, useRef, useState } from 'react';
import { Calendar as CalendarIcon, Check, Loader2, Pencil, Plus, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';
import {
  getEscalamientoProyecto,
  updateEscalamientoFila,
  type EscalamientoData,
} from '@/lib/actions/escalamiento';
import {
  ESCALAMIENTO_ESTADOS,
  applyFilaPatch,
  buildDefaultPlanAccion,
  type EscalamientoEstado,
  type EscalamientoFila,
  type EscalamientoFilaPatch,
} from '@/lib/escalamiento-plan';
import { escalamientoKey } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

type EscalamientoTabProps = {
  projectId: string;
  onSaved?: () => void;
};

const EMPTY: EscalamientoData = {
  filas: buildDefaultPlanAccion(),
};

const COLS = [
  {
    key: 'accion',
    label: 'Acción concreta',
    className: 'min-w-[13.5rem] w-[13.5rem]',
  },
  {
    key: 'proposito',
    label: 'Propósito / resultado',
    className: 'min-w-[15rem] w-[15rem]',
  },
  { key: 'responsable', label: 'Responsable', className: 'min-w-[7.5rem]' },
  { key: 'apoyo', label: 'Apoyo requerido', className: 'min-w-[7.5rem]' },
  { key: 'inicio', label: 'Fecha inicio', className: 'min-w-[7.25rem]' },
  { key: 'compromiso', label: 'Fecha compromiso', className: 'min-w-[7.5rem]' },
  { key: 'evidencia', label: 'Evidencia', className: 'min-w-[9.25rem]' },
  { key: 'estado', label: 'Estado', className: 'min-w-[8.5rem]' },
  { key: 'avance', label: 'Avance / acuerdos', className: 'min-w-[12rem]' },
] as const;

type EditableField = keyof EscalamientoFilaPatch;
type EditingCell = {
  numero: EscalamientoFila['numero'];
  field: EditableField;
} | null;

const ACTION_BTN =
  'p-1.5 bg-gray-100 rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center';

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
      className={`${ACTION_BTN} opacity-0 group-hover/field:opacity-100 focus-visible:opacity-100 hover:bg-gray-200 shrink-0`}
      title={label}
      aria-label={label}
    >
      <Pencil className="h-3.5 w-3.5 text-gray-700" />
    </button>
  );
}

function AddInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
    >
      <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
      <span>Añadir</span>
    </button>
  );
}

function EditActions({
  onSave,
  onCancel,
}: {
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      <button
        type="button"
        onClick={onSave}
        className={`${ACTION_BTN} hover:bg-green-100`}
        title="Guardar"
        aria-label="Guardar"
      >
        <Check className="h-3.5 w-3.5 text-gray-700" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={`${ACTION_BTN} hover:bg-red-100`}
        title="Cancelar"
        aria-label="Cancelar"
      >
        <X className="h-3.5 w-3.5 text-gray-700" />
      </button>
    </div>
  );
}

function cellPad(extra?: string) {
  return cn(
    'align-top px-3 py-2.5 border-r border-gray-200 last:border-r-0',
    extra
  );
}

function formatFechaCl(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

function CellTextarea({
  value,
  canEdit,
  isEditing,
  ariaLabel,
  onStartEdit,
  onSave,
  onCancel,
}: {
  value: string;
  canEdit: boolean;
  isEditing: boolean;
  ariaLabel: string;
  onStartEdit: () => void;
  onSave: (next: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState(value);

  const fitHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) fitHeight();
  }, [draft, isEditing]);

  if (isEditing) {
    return (
      <div className="min-w-0">
        <textarea
          ref={ref}
          aria-label={ariaLabel}
          value={draft}
          rows={1}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          className="block w-full min-h-0 resize-none overflow-hidden rounded-md border border-gray-200 bg-white px-2 py-1.5 text-[13px] leading-relaxed text-gray-800 shadow-none outline-none focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        />
        <EditActions
          onSave={() => onSave(draft)}
          onCancel={onCancel}
        />
      </div>
    );
  }

  if (!canEdit) {
    return (
      <p className="text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
        {value.trim() || '—'}
      </p>
    );
  }

  if (!value.trim()) {
    return <AddInfoButton onClick={onStartEdit} />;
  }

  return (
    <div className="group/field flex items-start gap-1.5 min-w-0">
      <p className="flex-1 text-[13px] leading-relaxed text-gray-800 whitespace-pre-wrap break-words">
        {value}
      </p>
      <HoverEditButton onClick={onStartEdit} label="Editar" />
    </div>
  );
}

function DateCell({
  value,
  canEdit,
  isEditing,
  ariaLabel,
  onStartEdit,
  onSave,
  onCancel,
}: {
  value: string | null;
  canEdit: boolean;
  isEditing: boolean;
  ariaLabel: string;
  onStartEdit: () => void;
  onSave: (next: string | null) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value, isEditing]);

  if (isEditing) {
    return (
      <div className="min-w-0">
        <label className="flex items-center gap-1.5 min-w-0 rounded-md border border-gray-200 bg-white px-2 py-1 focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-emerald-500/30">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <input
            type="date"
            aria-label={ariaLabel}
            value={draft}
            autoFocus
            onChange={(e) => setDraft(e.target.value)}
            className="w-full min-w-0 bg-transparent border-0 p-0 text-[13px] text-gray-800 shadow-none outline-none"
          />
        </label>
        <EditActions
          onSave={() => onSave(draft || null)}
          onCancel={onCancel}
        />
      </div>
    );
  }

  const display = formatFechaCl(value);

  if (!canEdit) {
    return <p className="text-[13px] text-gray-800">{display || '—'}</p>;
  }

  if (!display) {
    return <AddInfoButton onClick={onStartEdit} />;
  }

  return (
    <div className="group/field flex items-start gap-1.5 min-w-0">
      <p className="flex-1 text-[13px] text-gray-800">{display}</p>
      <HoverEditButton onClick={onStartEdit} label="Editar" />
    </div>
  );
}

function EstadoCell({
  value,
  canEdit,
  isEditing,
  ariaLabel,
  onStartEdit,
  onSave,
  onCancel,
}: {
  value: EscalamientoEstado;
  canEdit: boolean;
  isEditing: boolean;
  ariaLabel: string;
  onStartEdit: () => void;
  onSave: (next: EscalamientoEstado) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value, isEditing]);

  if (isEditing) {
    return (
      <div className="min-w-0">
        <select
          aria-label={ariaLabel}
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value as EscalamientoEstado)}
          className="h-9 w-full rounded-md border border-gray-200 bg-white px-2 text-[13px] text-gray-800 shadow-none outline-none focus-visible:border-gray-300 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        >
          {ESCALAMIENTO_ESTADOS.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
        <EditActions onSave={() => onSave(draft)} onCancel={onCancel} />
      </div>
    );
  }

  if (!canEdit) {
    return <p className="text-[13px] text-gray-800">{value}</p>;
  }

  return (
    <div className="group/field flex items-start gap-1.5 min-w-0">
      <p className="flex-1 text-[13px] text-gray-800">{value}</p>
      <HoverEditButton onClick={onStartEdit} label="Editar" />
    </div>
  );
}

function PlanTable({
  filas,
  canEdit,
  onPatch,
}: {
  filas: EscalamientoFila[];
  canEdit: boolean;
  onPatch: (numero: EscalamientoFila['numero'], patch: EscalamientoFilaPatch) => void;
}) {
  const [editing, setEditing] = useState<EditingCell>(null);

  const isEditing = (numero: EscalamientoFila['numero'], field: EditableField) =>
    editing?.numero === numero && editing.field === field;

  const startEdit = (numero: EscalamientoFila['numero'], field: EditableField) => {
    if (!canEdit) return;
    setEditing({ numero, field });
  };

  const saveField = (
    numero: EscalamientoFila['numero'],
    patch: EscalamientoFilaPatch
  ) => {
    onPatch(numero, patch);
    setEditing(null);
  };

  return (
    <div
      className="overflow-x-auto rounded-xl border border-gray-300 bg-white shadow-none custom-scrollbar"
      data-tour="escalamiento-plan"
    >
      <table className="w-full border-collapse min-w-[58rem] text-left">
        <thead>
          <tr className="border-b border-gray-300 bg-gray-50/90 text-left">
            {COLS.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 leading-tight border-r border-gray-200 last:border-r-0',
                  col.className
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr
              key={fila.numero}
              className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50/40"
            >
              <td className={cellPad('bg-gray-50')}>
                <p className="text-[13px] leading-relaxed text-gray-800">
                  {fila.accionConcreta}
                </p>
              </td>
              <td className={cellPad('bg-gray-50')}>
                <p className="text-[13px] leading-relaxed text-gray-600">
                  {fila.propositoResultado}
                </p>
              </td>
              <td className={cellPad()}>
                <CellTextarea
                  value={fila.responsable}
                  canEdit={canEdit}
                  isEditing={isEditing(fila.numero, 'responsable')}
                  ariaLabel={`Responsable acción ${fila.numero}`}
                  onStartEdit={() => startEdit(fila.numero, 'responsable')}
                  onSave={(responsable) =>
                    saveField(fila.numero, { responsable })
                  }
                  onCancel={() => setEditing(null)}
                />
              </td>
              <td className={cellPad()}>
                <CellTextarea
                  value={fila.apoyoRequerido}
                  canEdit={canEdit}
                  isEditing={isEditing(fila.numero, 'apoyoRequerido')}
                  ariaLabel={`Apoyo requerido acción ${fila.numero}`}
                  onStartEdit={() => startEdit(fila.numero, 'apoyoRequerido')}
                  onSave={(apoyoRequerido) =>
                    saveField(fila.numero, { apoyoRequerido })
                  }
                  onCancel={() => setEditing(null)}
                />
              </td>
              <td className={cellPad()}>
                <DateCell
                  value={fila.fechaInicio}
                  canEdit={canEdit}
                  isEditing={isEditing(fila.numero, 'fechaInicio')}
                  ariaLabel={`Fecha inicio acción ${fila.numero}`}
                  onStartEdit={() => startEdit(fila.numero, 'fechaInicio')}
                  onSave={(fechaInicio) =>
                    saveField(fila.numero, { fechaInicio })
                  }
                  onCancel={() => setEditing(null)}
                />
              </td>
              <td className={cellPad()}>
                <DateCell
                  value={fila.fechaCompromiso}
                  canEdit={canEdit}
                  isEditing={isEditing(fila.numero, 'fechaCompromiso')}
                  ariaLabel={`Fecha compromiso acción ${fila.numero}`}
                  onStartEdit={() => startEdit(fila.numero, 'fechaCompromiso')}
                  onSave={(fechaCompromiso) =>
                    saveField(fila.numero, { fechaCompromiso })
                  }
                  onCancel={() => setEditing(null)}
                />
              </td>
              <td className={cellPad()}>
                <CellTextarea
                  value={fila.evidencia}
                  canEdit={canEdit}
                  isEditing={isEditing(fila.numero, 'evidencia')}
                  ariaLabel={`Evidencia acción ${fila.numero}`}
                  onStartEdit={() => startEdit(fila.numero, 'evidencia')}
                  onSave={(evidencia) => saveField(fila.numero, { evidencia })}
                  onCancel={() => setEditing(null)}
                />
              </td>
              <td className={cellPad()}>
                <EstadoCell
                  value={fila.estado}
                  canEdit={canEdit}
                  isEditing={isEditing(fila.numero, 'estado')}
                  ariaLabel={`Estado acción ${fila.numero}`}
                  onStartEdit={() => startEdit(fila.numero, 'estado')}
                  onSave={(estado) => saveField(fila.numero, { estado })}
                  onCancel={() => setEditing(null)}
                />
              </td>
              <td className={cellPad()}>
                <CellTextarea
                  value={fila.avanceAcuerdos}
                  canEdit={canEdit}
                  isEditing={isEditing(fila.numero, 'avanceAcuerdos')}
                  ariaLabel={`Avance o acuerdos acción ${fila.numero}`}
                  onStartEdit={() => startEdit(fila.numero, 'avanceAcuerdos')}
                  onSave={(avanceAcuerdos) =>
                    saveField(fila.numero, { avanceAcuerdos })
                  }
                  onCancel={() => setEditing(null)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EscalamientoTab({ projectId, onSaved }: EscalamientoTabProps) {
  const { can } = useActiveRolePermissions();
  const canEdit = can('projects.edit');
  const queryClient = useQueryClient();
  const saveQueue = useRef(Promise.resolve());

  const query = useQuery({
    queryKey: escalamientoKey(projectId),
    queryFn: async () => {
      const res = await getEscalamientoProyecto(projectId);
      if (!res.success || !res.data) {
        throw new Error(res.error || 'Error al cargar escalamiento');
      }
      return res.data;
    },
    staleTime: 60_000,
    gcTime: 90_000,
  });

  const data = query.data ?? EMPTY;
  const loading = query.isPending;
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (query.isError) {
      setError(
        query.error instanceof Error
          ? query.error.message
          : 'Error al cargar escalamiento'
      );
    }
  }, [query.isError, query.error]);

  useEffect(() => {
    if (!showToast) return;
    const t = window.setTimeout(() => setShowToast(false), 2200);
    return () => window.clearTimeout(t);
  }, [showToast]);

  const handlePatch = (
    numero: EscalamientoFila['numero'],
    patch: EscalamientoFilaPatch
  ) => {
    if (!canEdit) return;
    setError(null);
    const current =
      queryClient.getQueryData<EscalamientoData>(escalamientoKey(projectId)) ??
      data;
    const applied = applyFilaPatch(current.filas, numero, patch);
    if (!applied.ok) {
      setError(applied.error);
      return;
    }
    queryClient.setQueryData<EscalamientoData>(escalamientoKey(projectId), {
      filas: applied.filas,
    });

    saveQueue.current = saveQueue.current.then(async () => {
      try {
        const res = await updateEscalamientoFila(projectId, numero, patch);
        if (!res.success) {
          setError(res.error || 'No se pudo guardar');
          await query.refetch();
          return;
        }
        if (res.data) {
          queryClient.setQueryData<EscalamientoData>(
            escalamientoKey(projectId),
            res.data
          );
        }
        setShowToast(true);
        onSaved?.();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'No se pudo guardar'
        );
        await query.refetch();
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-6">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto custom-scrollbar">
      <div className="w-full max-w-[92rem] mx-auto px-2 py-2">
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
              Estrategia de expansión y continuidad del proyecto
            </h2>
            <p className="mt-1 text-[13px] text-gray-500 leading-relaxed">
              Plan de acción para la continuidad, adaptación y replicabilidad
              del proyecto en otros contextos
            </p>
          </div>

          <PlanTable
            filas={data.filas}
            canEdit={canEdit}
            onPatch={handlePatch}
          />

          {error && (
            <p className="text-[13px] text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      {showToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-8 py-4 rounded-lg shadow-lg flex items-center space-x-2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Check className="h-6 w-6" />
          <span className="font-semibold text-base">Cambios guardados</span>
        </div>
      )}
    </div>
  );
}
