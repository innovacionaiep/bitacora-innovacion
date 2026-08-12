'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Send, MessageSquare } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import {
  getComentariosItemPresupuesto,
  createComentarioItemPresupuesto,
  type ComentarioItemPresupuestoData,
} from '@/lib/actions/comentarios-item-presupuesto';
import {
  updateItemPresupuesto,
  setProyeccionMensualMultiple,
  type UpdateItemPresupuestoData,
} from '@/lib/actions/presupuesto';
import { useSession } from 'next-auth/react';
import type {
  CuentaPresupuesto,
  EstadoGastoPresupuesto,
  ItemPresupuestoItem,
} from '@/types/presupuesto';
import { EstadoBadge } from './PresupuestoCard';
import { DEFAULT_AVATAR } from '@/lib/avatars';
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
  DETAIL_MODAL_TITLE_CLASS,
} from '@/lib/ui/detail-modal';
import { cn } from '@/lib/utils';

interface GastoPresupuestoModalProps {
  gasto: ItemPresupuestoItem;
  onClose: () => void;
  onUpdate?: () => Promise<void>;
  /**
   * Si false, no monta Dialog/DialogContent (el padre ya los tiene).
   * Evita parpadeo al cargar desde GastoPresupuestoDetalleModal.
   */
  wrapInDialog?: boolean;
  /** Permite lápices de edición (portal: Coordinador/Encargado/Admin; proyectos: true). */
  canEdit?: boolean;
}

type BudgetEditableField =
  | 'item'
  | 'detalle'
  | 'meses'
  | 'cuenta'
  | 'monto'
  | 'estado'
  | 'idSolicitud'
  | 'idPedido'
  | 'idRecepcion';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const CUENTA_OPTIONS: { value: CuentaPresupuesto; label: string }[] = [
  { value: 'RRHH', label: 'RRHH' },
  { value: 'OPERACION', label: 'Operación' },
  { value: 'INVERSION', label: 'Inversión' },
];

const ESTADO_OPTIONS: { value: EstadoGastoPresupuesto; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'SOLICITADO', label: 'Solicitado' },
  { value: 'EN_PEDIDO', label: 'En Pedido' },
  { value: 'EJECUTADO_OK', label: 'Ejecutado OK' },
];

const DIALOG_CLASS = DETAIL_MODAL_CONTENT_CLASS;

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 text-[13px] text-gray-800';

function cuentaLabel(cuenta: CuentaPresupuesto): string {
  if (cuenta === 'RRHH') return 'RRHH';
  if (cuenta === 'OPERACION') return 'Operación';
  return 'Inversión';
}

function mesesFromGasto(gasto: ItemPresupuestoItem, anio: number): number[] {
  return [
    ...new Set(
      gasto.proyecciones
        .filter((p) => p.mes > 0 && p.anio === anio)
        .map((p) => p.mes)
    ),
  ].sort((a, b) => a - b);
}

export function GastoPresupuestoModal({
  gasto: gastoProp,
  onClose,
  onUpdate,
  wrapInDialog = true,
  canEdit = false,
}: GastoPresupuestoModalProps) {
  const { data: session } = useSession();
  const anio = new Date().getFullYear();
  const [values, setValues] = useState<ItemPresupuestoItem>(gastoProp);
  const [editingField, setEditingField] = useState<BudgetEditableField | null>(
    null
  );
  const [fieldDraft, setFieldDraft] = useState({
    item: gastoProp.item,
    detalle: gastoProp.detalle ?? '',
    cuenta: gastoProp.cuenta,
    monto: String(gastoProp.monto),
    estado: gastoProp.estado,
    idSolicitud: gastoProp.idSolicitud ?? '',
    idPedido: gastoProp.idPedido ?? '',
    idRecepcion: gastoProp.idRecepcion ?? '',
    meses: mesesFromGasto(gastoProp, anio),
  });
  const [isSavingField, setIsSavingField] = useState(false);
  const [comentarios, setComentarios] = useState<
    ComentarioItemPresupuestoData[]
  >([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [isLoadingComentarios, setIsLoadingComentarios] = useState(false);
  const [isEnviandoComentario, setIsEnviandoComentario] = useState(false);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const comentariosContainerRef = useRef<HTMLDivElement>(null);
  const comentariosListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setValues(gastoProp);
    setEditingField(null);
    setFieldDraft({
      item: gastoProp.item,
      detalle: gastoProp.detalle ?? '',
      cuenta: gastoProp.cuenta,
      monto: String(gastoProp.monto),
      estado: gastoProp.estado,
      idSolicitud: gastoProp.idSolicitud ?? '',
      idPedido: gastoProp.idPedido ?? '',
      idRecepcion: gastoProp.idRecepcion ?? '',
      meses: mesesFromGasto(gastoProp, anio),
    });
  }, [gastoProp, anio]);

  useEffect(() => {
    const cargarComentarios = async () => {
      setIsLoadingComentarios(true);
      const result = await getComentariosItemPresupuesto(values.id);

      if (result.success && result.data) {
        setComentarios(result.data);
      }
      setIsLoadingComentarios(false);
    };

    void cargarComentarios();
  }, [values.id]);

  const handleStartFieldEdit = (field: BudgetEditableField) => {
    if (!canEdit) return;
    setFieldDraft({
      item: values.item,
      detalle: values.detalle ?? '',
      cuenta: values.cuenta,
      monto: String(values.monto),
      estado: values.estado,
      idSolicitud: values.idSolicitud ?? '',
      idPedido: values.idPedido ?? '',
      idRecepcion: values.idRecepcion ?? '',
      meses: mesesFromGasto(values, anio),
    });
    setEditingField(field);
  };

  const handleCancelFieldEdit = () => {
    setEditingField(null);
    setFieldDraft({
      item: values.item,
      detalle: values.detalle ?? '',
      cuenta: values.cuenta,
      monto: String(values.monto),
      estado: values.estado,
      idSolicitud: values.idSolicitud ?? '',
      idPedido: values.idPedido ?? '',
      idRecepcion: values.idRecepcion ?? '',
      meses: mesesFromGasto(values, anio),
    });
  };

  const handleSaveField = async () => {
    if (!editingField) return;
    setIsSavingField(true);
    try {
      if (editingField === 'meses') {
        const meses = [...fieldDraft.meses].sort((a, b) => a - b);
        const montoPorMes =
          meses.length > 0 ? Math.round(values.monto / meses.length) : 0;
        const result = await setProyeccionMensualMultiple(
          values.id,
          meses,
          anio,
          montoPorMes
        );
        if (!result.success) {
          alert(result.error || 'Error al actualizar meses de ejecución');
          return;
        }
        setValues((prev) => ({
          ...prev,
          proyecciones: meses.map((mes, idx) => ({
            id: prev.proyecciones.find((p) => p.mes === mes && p.anio === anio)
              ?.id ?? `temp-${mes}-${idx}`,
            mes,
            anio,
            monto: montoPorMes,
          })),
        }));
        setEditingField(null);
        if (onUpdate) await onUpdate();
        return;
      }

      const payload: UpdateItemPresupuestoData = {};
      if (editingField === 'item') {
        const item = fieldDraft.item.trim();
        if (!item) {
          alert('El nombre del ítem es obligatorio');
          return;
        }
        payload.item = item;
      } else if (editingField === 'detalle') {
        payload.detalle = fieldDraft.detalle.trim() || null;
      } else if (editingField === 'cuenta') {
        payload.cuenta = fieldDraft.cuenta;
      } else if (editingField === 'monto') {
        const monto = Number(
          String(fieldDraft.monto).replace(/\./g, '').replace(',', '.')
        );
        if (Number.isNaN(monto) || monto < 0) {
          alert('Ingrese un monto válido mayor o igual a 0');
          return;
        }
        payload.monto = monto;
      } else if (editingField === 'estado') {
        payload.estado = fieldDraft.estado;
      } else if (editingField === 'idSolicitud') {
        payload.idSolicitud = fieldDraft.idSolicitud.trim() || null;
      } else if (editingField === 'idPedido') {
        payload.idPedido = fieldDraft.idPedido.trim() || null;
      } else if (editingField === 'idRecepcion') {
        payload.idRecepcion = fieldDraft.idRecepcion.trim() || null;
      }

      const result = await updateItemPresupuesto(values.id, payload);
      if (!result.success) {
        alert(result.error || 'Error al actualizar el ítem');
        return;
      }

      setValues((prev) => ({
        ...prev,
        ...payload,
        detalle:
          payload.detalle !== undefined ? payload.detalle : prev.detalle,
        idSolicitud:
          payload.idSolicitud !== undefined
            ? payload.idSolicitud
            : prev.idSolicitud,
        idPedido:
          payload.idPedido !== undefined ? payload.idPedido : prev.idPedido,
        idRecepcion:
          payload.idRecepcion !== undefined
            ? payload.idRecepcion
            : prev.idRecepcion,
      }));
      setEditingField(null);
      if (onUpdate) await onUpdate();
    } finally {
      setIsSavingField(false);
    }
  };

  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim() || !session?.user) return;

    setIsEnviandoComentario(true);
    const result = await createComentarioItemPresupuesto(
      values.id,
      nuevoComentario.trim()
    );

    if (result.success && result.data) {
      setComentarios([result.data, ...comentarios]);
      setNuevoComentario('');
      if (onUpdate) {
        await onUpdate();
      }
    } else {
      alert(result.error || 'Error al enviar comentario');
    }
    setIsEnviandoComentario(false);
  };

  const toggleMesDraft = (mes: number) => {
    setFieldDraft((prev) => {
      const set = new Set(prev.meses);
      if (set.has(mes)) set.delete(mes);
      else set.add(mes);
      return { ...prev, meses: [...set].sort((a, b) => a - b) };
    });
  };

  const mesesEjecucion = mesesFromGasto(values, anio);

  const body = (
    <>
      <div className="flex-shrink-0 border-b border-gray-100 bg-gray-50/90 px-5 py-4">
        <div className={DETAIL_MODAL_HEADER_ROW_CLASS}>
          <div className="min-w-0 flex-1">
            {editingField === 'item' ? (
              <div className="flex min-w-0 flex-col gap-1">
                <DialogTitle className="sr-only">Editar ítem</DialogTitle>
                <input
                  type="text"
                  value={fieldDraft.item}
                  onChange={(e) =>
                    setFieldDraft((prev) => ({ ...prev, item: e.target.value }))
                  }
                  className="h-auto w-full min-w-0 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xl font-semibold text-gray-900 shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 @min-[720px]:text-2xl"
                  autoFocus
                />
                <ActivityFieldSaveCancel
                  isSaving={isSavingField}
                  onSave={() => void handleSaveField()}
                  onCancel={handleCancelFieldEdit}
                />
              </div>
            ) : (
              <div className="group/field relative min-w-0 pr-8">
                <DialogTitle className={DETAIL_MODAL_TITLE_CLASS}>
                  {values.item}
                </DialogTitle>
                {canEdit && (
                  <ActivityHoverEditButton
                    onClick={() => handleStartFieldEdit('item')}
                    tooltip="Editar ítem"
                  />
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-3 pr-2">
            <span className="text-sm font-medium text-gray-700 @min-[720px]:text-base">Estado</span>
            {editingField === 'estado' ? (
              <div className="flex flex-col gap-1">
                <select
                  value={fieldDraft.estado}
                  onChange={(e) =>
                    setFieldDraft((prev) => ({
                      ...prev,
                      estado: e.target.value as EstadoGastoPresupuesto,
                    }))
                  }
                  className={INPUT_CLASS}
                  autoFocus
                >
                  {ESTADO_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ActivityFieldSaveCancel
                  isSaving={isSavingField}
                  onSave={() => void handleSaveField()}
                  onCancel={handleCancelFieldEdit}
                />
              </div>
            ) : (
              <div className="group/field relative pr-8">
                <EstadoBadge
                  estado={values.estado}
                  className="text-base px-3.5 py-1"
                />
                {canEdit && (
                  <ActivityHoverEditButton
                    onClick={() => handleStartFieldEdit('estado')}
                    tooltip="Editar estado"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={DETAIL_MODAL_COLUMNS_CLASS}>
        {/* Izquierda: Detalle + meses de ejecución */}
        <div className={cn(DETAIL_MODAL_COL_CLASS, DETAIL_MODAL_COL_DIVIDER_CLASS)}>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
              Detalle
            </h3>
            {editingField === 'detalle' ? (
              <div className="min-w-0">
                <textarea
                  value={fieldDraft.detalle}
                  onChange={(e) =>
                    setFieldDraft((prev) => ({
                      ...prev,
                      detalle: e.target.value,
                    }))
                  }
                  className={`${INPUT_CLASS} min-h-[110px] resize-y`}
                  rows={3}
                  autoFocus
                />
                <ActivityFieldSaveCancel
                  isSaving={isSavingField}
                  onSave={() => void handleSaveField()}
                  onCancel={handleCancelFieldEdit}
                />
              </div>
            ) : (
              <div className="group/field relative min-w-0 pr-8">
                <p className="text-[15px] text-gray-800 leading-[1.75] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                  {values.detalle || 'Sin detalle'}
                </p>
                {canEdit && (
                  <ActivityHoverEditButton
                    onClick={() => handleStartFieldEdit('detalle')}
                    tooltip="Editar detalle"
                  />
                )}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
              Meses de ejecución
            </h3>
            {editingField === 'meses' ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-4">
                <div className="flex flex-wrap gap-2">
                  {MONTHS.map((mes, index) => {
                    const mesNum = index + 1;
                    const selected = fieldDraft.meses.includes(mesNum);
                    return (
                      <button
                        key={mes}
                        type="button"
                        onClick={() => toggleMesDraft(mesNum)}
                        className={`rounded-md border px-3 py-2 text-sm shadow-sm transition-colors ${
                          selected
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        {mes}
                      </button>
                    );
                  })}
                </div>
                <ActivityFieldSaveCancel
                  isSaving={isSavingField}
                  onSave={() => void handleSaveField()}
                  onCancel={handleCancelFieldEdit}
                />
              </div>
            ) : (
              <div className="group/field relative rounded-lg border border-gray-200 bg-gray-50/40 p-4 pr-10">
                {mesesEjecucion.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {mesesEjecucion.map((mes) => (
                      <div
                        key={mes}
                        className="bg-white border border-gray-300 rounded-md px-3 py-2 shadow-sm"
                      >
                        <span className="text-sm text-gray-900">
                          {MONTHS[mes - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px] text-gray-400">No definido</p>
                )}
                {canEdit && (
                  <ActivityHoverEditButton
                    onClick={() => handleStartFieldEdit('meses')}
                    tooltip="Editar meses"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Centro: cuenta, monto, IDs */}
        <div
          className={cn(
            DETAIL_MODAL_COL_CLASS,
            DETAIL_MODAL_COL_DIVIDER_CLASS,
            'flex flex-col space-y-6'
          )}
        >
          <div className="grid grid-cols-2">
            <div className="space-y-1 pr-4 text-center">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                Cuenta
              </h3>
              {editingField === 'cuenta' ? (
                <div className="flex flex-col items-center">
                  <select
                    value={fieldDraft.cuenta}
                    onChange={(e) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        cuenta: e.target.value as CuentaPresupuesto,
                      }))
                    }
                    className={`${INPUT_CLASS} max-w-[160px] text-center`}
                    autoFocus
                  >
                    {CUENTA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={() => void handleSaveField()}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative inline-flex items-center justify-center pr-8">
                  <p className="text-xl leading-[1.75] font-semibold text-black">
                    {cuentaLabel(values.cuenta)}
                  </p>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('cuenta')}
                      tooltip="Editar cuenta"
                    />
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1 border-l border-gray-200 pl-4 text-center">
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
                Monto
              </h3>
              {editingField === 'monto' ? (
                <div className="flex flex-col items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={fieldDraft.monto}
                    onChange={(e) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        monto: e.target.value,
                      }))
                    }
                    className={`${INPUT_CLASS} max-w-[160px] text-center tabular-nums`}
                    autoFocus
                  />
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={() => void handleSaveField()}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative inline-flex items-center justify-center pr-8">
                  <p className="text-xl leading-[1.75] font-semibold tabular-nums text-black">
                    ${values.monto.toLocaleString('es-CL')}
                  </p>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('monto')}
                      tooltip="Editar monto"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="border-t border-gray-200" />
          <div className="space-y-14 pt-4">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                N° Solicitud
              </h3>
              {editingField === 'idSolicitud' ? (
                <div className="min-w-0">
                  <input
                    type="text"
                    value={fieldDraft.idSolicitud}
                    onChange={(e) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        idSolicitud: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                    autoFocus
                  />
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={() => void handleSaveField()}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative min-w-0 pr-8">
                  <p className="text-[15px] leading-[1.75] text-gray-800">
                    {values.idSolicitud || 'No definido'}
                  </p>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('idSolicitud')}
                      tooltip="Editar N° solicitud"
                    />
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                N° Orden de compra
              </h3>
              {editingField === 'idPedido' ? (
                <div className="min-w-0">
                  <input
                    type="text"
                    value={fieldDraft.idPedido}
                    onChange={(e) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        idPedido: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                    autoFocus
                  />
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={() => void handleSaveField()}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative min-w-0 pr-8">
                  <p className="text-[15px] leading-[1.75] text-gray-800">
                    {values.idPedido || 'No definido'}
                  </p>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('idPedido')}
                      tooltip="Editar N° orden de compra"
                    />
                  )}
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900 mb-2">
                N° Recepción
              </h3>
              {editingField === 'idRecepcion' ? (
                <div className="min-w-0">
                  <input
                    type="text"
                    value={fieldDraft.idRecepcion}
                    onChange={(e) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        idRecepcion: e.target.value,
                      }))
                    }
                    className={INPUT_CLASS}
                    autoFocus
                  />
                  <ActivityFieldSaveCancel
                    isSaving={isSavingField}
                    onSave={() => void handleSaveField()}
                    onCancel={handleCancelFieldEdit}
                  />
                </div>
              ) : (
                <div className="group/field relative min-w-0 pr-8">
                  <p className="text-[15px] leading-[1.75] text-gray-800">
                    {values.idRecepcion || 'No definido'}
                  </p>
                  {canEdit && (
                    <ActivityHoverEditButton
                      onClick={() => handleStartFieldEdit('idRecepcion')}
                      tooltip="Editar N° recepción"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Derecha: Comentarios */}
        <div
          ref={comentariosContainerRef}
          className={cn(DETAIL_MODAL_COL_CLASS, 'flex flex-col space-y-0')}
        >
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4 flex-shrink-0">
            <MessageSquare
              className="h-3.5 w-3.5 text-gray-500"
              strokeWidth={2}
            />
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-gray-900">
              Comentarios
            </h3>
          </div>

          <div
            ref={comentariosListRef}
            className="space-y-3 flex-1 overflow-y-auto mb-4 min-h-0 custom-scrollbar"
          >
            {isLoadingComentarios ? (
              <p className="text-[13px] text-gray-400">
                Cargando comentarios...
              </p>
            ) : comentarios.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-4">
                <p className="text-[13px] text-gray-400">
                  No hay comentarios aún
                </p>
              </div>
            ) : (
              comentarios.map((comentario) => (
                <div
                  key={comentario.id}
                  className="flex gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                >
                  <div className="flex-shrink-0">
                    <img
                      src={DEFAULT_AVATAR}
                      alt={comentario.user.name || 'Usuario'}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2 flex-wrap">
                      <span className="text-[13px] font-medium text-gray-800">
                        {comentario.user.name || 'Usuario'}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(comentario.createdAt).toLocaleDateString(
                          'es-ES',
                          {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </span>
                    </div>
                    <p className="text-[13px] text-gray-700 leading-snug whitespace-pre-wrap">
                      {comentario.contenido}
                    </p>
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
                  alt={session.user.name || 'Usuario'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="text-[12px] text-gray-400">
                  Comentas como {session.user.name || session.user.email}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={nuevoComentario}
                    onChange={(e) => setNuevoComentario(e.target.value)}
                    placeholder="Escribe un comentario..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 resize-none text-[13px] text-gray-800"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        void handleEnviarComentario();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void handleEnviarComentario()}
                    disabled={!nuevoComentario.trim() || isEnviandoComentario}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-sm text-gray-500 hover:text-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed self-end focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                    title="Enviar comentario (Ctrl+Enter)"
                  >
                    <Send className="h-4 w-4" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (!wrapInDialog) {
    return body;
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent
        ref={dialogContentRef}
        closeButtonPosition="outside-top-right"
        className={DIALOG_CLASS}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
}
