'use client';

const TABLE_HEADER_BG = '#d1d5db';
const TABLE_HEADER_TEXT = '#374151';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Maximize,
  Minimize,
  Pencil,
  TrendingUp,
  Plus,
  Trash2,
  Search,
  Check,
  X,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePresupuesto } from '@/hooks/usePresupuesto';
import {
  createItemPresupuesto,
  updateItemPresupuesto,
  deleteItemPresupuesto,
  updatePresupuestoAdjudicado,
  setProyeccionMensualMultiple,
  type CreateItemPresupuestoData,
  type UpdateItemPresupuestoData,
} from '@/lib/actions/presupuesto';
import type {
  CuentaPresupuesto,
  EstadoGastoPresupuesto,
  ItemPresupuestoItem,
} from '@/types/presupuesto';
import { GastoPresupuestoModal } from './GastoPresupuestoModal';
import {
  computeDeltaSaldo,
  formatPresupuestoMonto,
  mergeDeltaEnResumen,
} from '@/lib/utils/presupuesto-calculos';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

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

const CUENTA_LABEL: Record<CuentaPresupuesto, string> = {
  RRHH: 'RRHH',
  OPERACION: 'Operación',
  INVERSION: 'Inversión',
};

/** Orden fijo para la tabla de desgloses: RRHH → Operación → Inversión */
const CUENTA_ORDEN: Record<CuentaPresupuesto, number> = {
  RRHH: 0,
  OPERACION: 1,
  INVERSION: 2,
};

const ESTADO_LABEL: Record<EstadoGastoPresupuesto, string> = {
  PENDIENTE: 'Pendiente',
  SOLICITADO: 'Solicitado',
  EN_PEDIDO: 'En Pedido',
  EJECUTADO_OK: 'Ejecutado OK',
};

export function EstadoBadge({ estado }: { estado: EstadoGastoPresupuesto }) {
  const variant =
    estado === 'EJECUTADO_OK'
      ? 'default'
      : estado === 'EN_PEDIDO'
        ? 'secondary'
        : 'outline';
  const className =
    estado === 'EJECUTADO_OK'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : estado === 'EN_PEDIDO'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : estado === 'SOLICITADO'
          ? 'bg-amber-100 text-amber-800 border-amber-200'
          : 'bg-gray-100 text-gray-700 border-gray-200';
  return (
    <Badge variant={variant} className={className}>
      {ESTADO_LABEL[estado]}
    </Badge>
  );
}

function DataBar({
  pct,
  darkTrack = false,
}: {
  pct: number;
  darkTrack?: boolean;
}) {
  const trackClass = darkTrack ? 'bg-gray-300' : 'bg-gray-200';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div
        className={`flex-1 ${trackClass} rounded-full h-2.5 overflow-hidden`}
      >
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 tabular-nums w-8">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

interface PresupuestoCardProps {
  projectId: string;
  presupuestoTotal?: number;
  presupuestoAdjudicado?: number;
  projectName?: string;
  topLoaderEnabled?: boolean;
}

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

function formatMesesEjecucion(meses: number[]): string {
  if (meses.length === 0) return '—';
  const nombresMeses = meses.map((mes) => MONTHS[mes - 1]);
  const grupos: string[][] = [];
  for (let i = 0; i < nombresMeses.length; i += 3)
    grupos.push(nombresMeses.slice(i, i + 3));
  return grupos.map((grupo) => grupo.join(', ')).join('\n');
}

function MesesEjecucionEditor({
  item,
  anio,
  onUpdate,
}: {
  item: ItemPresupuestoItem;
  anio: number;
  onUpdate: () => void;
}) {
  const [selectedMeses, setSelectedMeses] = useState<Set<number>>(
    () =>
      new Set(
        item.proyecciones.filter((p) => p.anio === anio).map((p) => p.mes)
      )
  );
  const toggleMes = async (mes: number) => {
    const newSelected = new Set(selectedMeses);
    if (newSelected.has(mes)) newSelected.delete(mes);
    else newSelected.add(mes);
    setSelectedMeses(newSelected);
    const montoPorMes =
      newSelected.size > 0 ? Math.round(item.monto / newSelected.size) : 0;
    const result = await setProyeccionMensualMultiple(
      item.id,
      [...newSelected].sort((a, b) => a - b),
      anio,
      montoPorMes
    );
    if (result.success) onUpdate();
  };
  const displayText =
    selectedMeses.size > 0
      ? [...selectedMeses]
          .sort((a, b) => a - b)
          .map((mes) => MONTHS[mes - 1])
          .join(', ')
      : '—';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-8 text-sm w-full justify-start truncate"
        >
          <span className="truncate">{displayText}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
        {MONTHS.map((mes, index) => (
          <DropdownMenuCheckboxItem
            key={index}
            checked={selectedMeses.has(index + 1)}
            onCheckedChange={() => toggleMes(index + 1)}
            onSelect={(e) => e.preventDefault()}
          >
            {mes}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PresupuestoCard({
  projectId,
  presupuestoTotal = 0,
  presupuestoAdjudicado: presupuestoAdjudicadoInitial = 0,
  projectName,
  topLoaderEnabled = true,
}: PresupuestoCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    cuenta: CuentaPresupuesto;
    item: string;
    detalle: string;
    monto: number;
    idSolicitud: string;
    idPedido: string;
    idRecepcion: string;
    estado: EstadoGastoPresupuesto;
  } | null>(null);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [presupuestoAdjudicado, setPresupuestoAdjudicado] = useState(
    presupuestoAdjudicadoInitial
  );
  const [isEditingAdjudicado, setIsEditingAdjudicado] = useState(false);
  const [adjudicadoDraft, setAdjudicadoDraft] = useState('');
  const [isSavingAdjudicado, setIsSavingAdjudicado] = useState(false);
  const [newItemData, setNewItemData] = useState<{
    cuenta: CuentaPresupuesto;
    item: string;
    detalle: string;
    monto: number;
    selectedMeses: Set<number>;
    idSolicitud: string;
    idPedido: string;
    idRecepcion: string;
  }>({
    cuenta: 'RRHH',
    item: '',
    detalle: '',
    monto: 0,
    selectedMeses: new Set(),
    idSolicitud: '',
    idPedido: '',
    idRecepcion: '',
  });
  const [selectedGastoForModal, setSelectedGastoForModal] =
    useState<ItemPresupuestoItem | null>(null);
  const { items, resumenPorCuenta, loading, error, refetch, patchItem, addItemOptimistic, removeItemOptimistic, replaceItemId } = usePresupuesto(
    projectId,
    presupuestoTotal
  );
  const deltaSaldo = useMemo(
    () => computeDeltaSaldo(presupuestoAdjudicado, items),
    [presupuestoAdjudicado, items]
  );
  const resumenMacro = useMemo(
    () => mergeDeltaEnResumen(resumenPorCuenta, deltaSaldo),
    [resumenPorCuenta, deltaSaldo]
  );
  const anio = new Date().getFullYear();

  useEffect(() => {
    setPresupuestoAdjudicado(presupuestoAdjudicadoInitial);
  }, [presupuestoAdjudicadoInitial]);

  const toggleFullscreen = () => setIsFullscreen((p) => !p);
  const startEditingAdjudicado = () => {
    setAdjudicadoDraft(
      presupuestoAdjudicado > 0 ? String(presupuestoAdjudicado) : ''
    );
    setIsEditingAdjudicado(true);
  };
  const cancelEditingAdjudicado = () => {
    setIsEditingAdjudicado(false);
    setAdjudicadoDraft('');
  };
  const handleSaveAdjudicado = useCallback(async () => {
    if (isSavingAdjudicado) return;
    const monto = parseInt(adjudicadoDraft, 10);
    if (Number.isNaN(monto) || monto < 0) {
      alert('Ingrese un monto válido mayor o igual a 0.');
      return;
    }
    setIsSavingAdjudicado(true);
    const result = await updatePresupuestoAdjudicado(projectId, monto);
    if (result.success) {
      setPresupuestoAdjudicado(monto);
      setIsEditingAdjudicado(false);
      setAdjudicadoDraft('');
    } else {
      alert(result.error ?? 'Error al guardar presupuesto adjudicado');
    }
    setIsSavingAdjudicado(false);
  }, [adjudicadoDraft, isSavingAdjudicado, projectId]);
  const startAddingRow = () => {
    setEditingItemId(null);
    setEditDraft(null);
    setIsAddingRow(true);
  };
  const cancelAddingRow = () => {
    setIsAddingRow(false);
    setNewItemData({
      cuenta: 'RRHH',
      item: '',
      detalle: '',
      monto: 0,
      selectedMeses: new Set(),
      idSolicitud: '',
      idPedido: '',
      idRecepcion: '',
    });
  };
  const startEditItem = (itemId: string) => {
    const row = items.find((i) => i.id === itemId);
    if (!row) return;
    setIsAddingRow(false);
    setEditingItemId(itemId);
    setEditDraft({
      cuenta: row.cuenta,
      item: row.item,
      detalle: row.detalle ?? '',
      monto: row.monto,
      idSolicitud: row.idSolicitud ?? '',
      idPedido: row.idPedido ?? '',
      idRecepcion: row.idRecepcion ?? '',
      estado: row.estado,
    });
  };
  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditDraft(null);
  };
  const handleSaveEditItem = useCallback(async () => {
    if (!editingItemId || !editDraft) return;
    if (!editDraft.item.trim()) {
      alert('El ítem es obligatorio.');
      return;
    }
    if (Number.isNaN(editDraft.monto) || editDraft.monto < 0) {
      alert('Ingrese un monto válido mayor o igual a 0.');
      return;
    }

    const itemId = editingItemId;
    const previous = items.find((i) => i.id === itemId);
    if (!previous) return;

    const data: UpdateItemPresupuestoData = {
      cuenta: editDraft.cuenta,
      item: editDraft.item.trim(),
      detalle: editDraft.detalle.trim() || null,
      monto: editDraft.monto,
      idSolicitud: editDraft.idSolicitud.trim() || null,
      idPedido: editDraft.idPedido.trim() || null,
      idRecepcion: editDraft.idRecepcion.trim() || null,
      estado: editDraft.estado,
    };

    patchItem(itemId, data);
    setEditingItemId(null);
    setEditDraft(null);

    const result = await updateItemPresupuesto(itemId, data);
    if (!result.success) {
      patchItem(itemId, {
        cuenta: previous.cuenta,
        item: previous.item,
        detalle: previous.detalle,
        monto: previous.monto,
        estado: previous.estado,
        idSolicitud: previous.idSolicitud,
        idPedido: previous.idPedido,
        idRecepcion: previous.idRecepcion,
      });
      alert(result.error ?? 'Error al actualizar el ítem');
    }
  }, [editingItemId, editDraft, items, patchItem]);

  const handleSaveNewItem = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (
      !newItemData.cuenta ||
      !newItemData.item?.trim() ||
      !newItemData.monto ||
      newItemData.monto <= 0
    ) {
      alert(
        'Por favor complete todos los campos requeridos: cuenta, nombre del ítem y monto (mayor a 0).'
      );
      setIsSubmitting(false);
      return;
    }

    const snapshot = { ...newItemData };
    const tempId = `temp-item-${Date.now()}`;
    const optimisticItem: ItemPresupuestoItem = {
      id: tempId,
      proyectoId: projectId,
      cuenta: snapshot.cuenta as CuentaPresupuesto,
      item: snapshot.item.trim(),
      detalle: snapshot.detalle?.trim() || null,
      monto: snapshot.monto,
      estado: 'PENDIENTE',
      idSolicitud: snapshot.idSolicitud.trim() || null,
      idPedido: snapshot.idPedido.trim() || null,
      idRecepcion: snapshot.idRecepcion.trim() || null,
      orden: items.length,
      proyecciones: [],
      comentariosCount: 0,
    };

    addItemOptimistic(optimisticItem);
    cancelAddingRow();
    setIsSubmitting(false);

    const data: CreateItemPresupuestoData = {
      cuenta: snapshot.cuenta,
      item: snapshot.item.trim(),
      detalle: snapshot.detalle?.trim() || null,
      monto: snapshot.monto,
    };
    const result = await createItemPresupuesto(projectId, data);
    if (result.success && result.data?.id) {
      const itemId = result.data.id;
      replaceItemId(tempId, itemId);
      const updatePromises: Promise<unknown>[] = [];
      const updateData: UpdateItemPresupuestoData = {};
      if (snapshot.idSolicitud.trim())
        updateData.idSolicitud = snapshot.idSolicitud.trim();
      if (snapshot.idPedido.trim())
        updateData.idPedido = snapshot.idPedido.trim();
      if (snapshot.idRecepcion.trim())
        updateData.idRecepcion = snapshot.idRecepcion.trim();
      if (Object.keys(updateData).length > 0)
        updatePromises.push(updateItemPresupuesto(itemId, updateData));
      if (snapshot.selectedMeses.size > 0) {
        const meses = Array.from(snapshot.selectedMeses).sort((a, b) => a - b);
        updatePromises.push(
          setProyeccionMensualMultiple(
            itemId,
            meses,
            anio,
            Math.round(snapshot.monto / snapshot.selectedMeses.size)
          )
        );
      }
      if (updatePromises.length > 0) await Promise.all(updatePromises);
      void refetch(false);
    } else {
      removeItemOptimistic(tempId);
      alert(`Error al crear el ítem: ${result.error}`);
    }
  }, [
    refetch,
    isSubmitting,
    newItemData,
    projectId,
    anio,
    items.length,
    addItemOptimistic,
    removeItemOptimistic,
    replaceItemId,
  ]);

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      if (
        !confirm(
          '¿Está seguro de que desea eliminar este ítem de presupuesto? Esta acción no se puede deshacer.'
        )
      ) {
        return;
      }
      const previous = items.find((i) => i.id === itemId);
      if (!previous) return;

      setEditingItemId((current) => (current === itemId ? null : current));
      setEditDraft((current) =>
        editingItemId === itemId ? null : current
      );
      removeItemOptimistic(itemId);

      const result = await deleteItemPresupuesto(itemId);
      if (!result.success) {
        addItemOptimistic(previous);
        alert(`Error al eliminar el ítem: ${result.error}`);
      }
    },
    [items, removeItemOptimistic, addItemOptimistic]
  );

  usePageTopLoader(loading, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });

  if (loading) {
    return <div className="h-full min-h-[120px]" />;
  }
  if (error)
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
        </div>
      </div>
    );

  const baseTotal = resumenMacro.totalMonto || 1;
  const totalPesoPct =
    baseTotal > 0 ? (resumenMacro.totalMonto / baseTotal) * 100 : 0;

  const content = (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col pt-2 px-6 pb-4">
        <div className="flex-shrink-0 flex flex-col items-stretch gap-4 mb-6 w-full">
          <div className="flex items-center justify-between w-full min-w-0 gap-4">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      onClick={toggleFullscreen}
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm"
                    >
                      {isFullscreen ? (
                        <Minimize className="h-4 w-4" />
                      ) : (
                        <Maximize className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {isFullscreen
                        ? 'Salir de pantalla completa'
                        : 'Ver en pantalla completa'}
                    </p>
                  </TooltipContent>
                </Tooltip>
                {isFullscreen && projectName && (
                  <h1 className="text-2xl font-bold text-gray-900 shrink-0 ml-2 mr-2">
                    {projectName}
                  </h1>
                )}
              </TooltipProvider>
            </div>
            <div className="flex items-center space-x-4 shrink-0">
              <div className="flex items-center gap-2 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  {deltaSaldo >= 0 ? 'Saldo a favor' : 'Saldo en contra'}
                </span>
                <span
                  className={`text-sm font-bold tabular-nums whitespace-nowrap ${deltaSaldo < 0 ? 'text-red-600' : 'text-emerald-700'}`}
                >
                  {formatPresupuestoMonto(deltaSaldo)}
                </span>
              </div>
              <div className="flex items-center gap-2 h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  Presupuesto adjudicado
                </span>
                {isEditingAdjudicado ? (
                  <Input
                    type="number"
                    value={adjudicadoDraft}
                    onChange={(e) => setAdjudicadoDraft(e.target.value)}
                    placeholder="0"
                    className="h-7 w-28 text-sm font-semibold tabular-nums px-2"
                    min="0"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void handleSaveAdjudicado();
                      if (e.key === 'Escape') cancelEditingAdjudicado();
                    }}
                  />
                ) : (
                  <span className="text-sm font-bold text-gray-900 tabular-nums whitespace-nowrap">
                    ${presupuestoAdjudicado.toLocaleString('es-CL')}
                  </span>
                )}
                {isEditingAdjudicado ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleSaveAdjudicado()}
                      disabled={isSavingAdjudicado}
                      className="p-1.5 bg-gray-100 rounded-full hover:bg-green-100 transition-colors cursor-pointer disabled:opacity-50"
                      title={
                        isSavingAdjudicado ? 'Guardando...' : 'Guardar monto'
                      }
                    >
                      <Check className="h-3.5 w-3.5 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingAdjudicado}
                      disabled={isSavingAdjudicado}
                      className="p-1.5 bg-gray-100 rounded-full hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                      title="Cancelar"
                    >
                      <X className="h-3.5 w-3.5 text-gray-700" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startEditingAdjudicado}
                    className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer shrink-0"
                    title="Editar presupuesto adjudicado"
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-700" />
                  </button>
                )}
              </div>
              <div className="flex items-center justify-center h-10 w-10 p-2.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm shrink-0">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-base font-semibold text-gray-900">
                  Progreso
                </span>
                <div className="flex items-center space-x-3">
                  <div className="w-72 bg-gray-200 rounded-full h-2.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300 shadow-sm"
                      style={{
                        width: `${Math.min(100, resumenMacro.pctGlobalAvance)}%`,
                      }}
                    />
                  </div>
                  <span className="text-4xl font-bold text-emerald-600 tabular-nums">
                    {resumenMacro.pctGlobalAvance}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden w-full">
            <Table>
              <TableHeader>
                <TableRow
                  className="[&_th]:text-center"
                  style={{ backgroundColor: TABLE_HEADER_BG }}
                >
                  <TableHead
                    className="font-semibold"
                    style={{
                      backgroundColor: TABLE_HEADER_BG,
                      color: TABLE_HEADER_TEXT,
                    }}
                  >
                    Cuenta
                  </TableHead>
                  <TableHead
                    className="font-semibold w-16"
                    style={{
                      backgroundColor: TABLE_HEADER_BG,
                      color: TABLE_HEADER_TEXT,
                    }}
                  >
                    %
                  </TableHead>
                  <TableHead
                    className="font-semibold border-r border-gray-200"
                    style={{
                      backgroundColor: TABLE_HEADER_BG,
                      color: TABLE_HEADER_TEXT,
                    }}
                  >
                    Monto Cuenta
                  </TableHead>
                  <TableHead
                    className="font-semibold"
                    style={{
                      backgroundColor: TABLE_HEADER_BG,
                      color: TABLE_HEADER_TEXT,
                    }}
                  >
                    % Solicitado
                  </TableHead>
                  <TableHead
                    className="font-semibold border-r border-gray-200"
                    style={{
                      backgroundColor: TABLE_HEADER_BG,
                      color: TABLE_HEADER_TEXT,
                    }}
                  >
                    Monto Solicitado
                  </TableHead>
                  <TableHead
                    className="font-semibold"
                    style={{
                      backgroundColor: TABLE_HEADER_BG,
                      color: TABLE_HEADER_TEXT,
                    }}
                  >
                    % Ejecutado
                  </TableHead>
                  <TableHead
                    className="font-semibold border-r border-gray-200"
                    style={{
                      backgroundColor: TABLE_HEADER_BG,
                      color: TABLE_HEADER_TEXT,
                    }}
                  >
                    Monto Ejecutado
                  </TableHead>
                  <TableHead
                    className="font-semibold"
                    style={{
                      backgroundColor: TABLE_HEADER_BG,
                      color: TABLE_HEADER_TEXT,
                    }}
                  >
                    Saldo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumenMacro.porCuenta.map((row) => (
                  <TableRow
                    key={row.cuenta}
                    className="odd:bg-gray-50/50 hover:bg-gray-100/80"
                  >
                    <TableCell className="font-medium text-center">
                      {CUENTA_LABEL[row.cuenta]}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {Math.round(row.porcentajePeso)}%
                    </TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">
                      ${row.monto.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctSolicitado} />
                    </TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">
                      ${row.montoSolicitado.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctEjecutado} />
                    </TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">
                      ${row.montoEjecutado.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      ${row.saldo.toLocaleString('es-CL')}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-200 font-semibold hover:bg-gray-200">
                  <TableCell className="text-center">TOTALES</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {Math.round(totalPesoPct)}%
                  </TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">
                    ${resumenMacro.totalMonto.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <DataBar
                      pct={resumenMacro.pctTotalSolicitado}
                      darkTrack
                    />
                  </TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">
                    ${resumenMacro.totalSolicitado.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <DataBar
                      pct={resumenMacro.pctTotalEjecutado}
                      darkTrack
                    />
                  </TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">
                    ${resumenMacro.totalEjecutado.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    ${resumenMacro.totalSaldo.toLocaleString('es-CL')}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col space-y-2">
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col">
            <div
              className="flex-1 overflow-y-auto min-h-0"
              style={{ width: '100%' }}
            >
              <Table
                className="table-fixed"
                style={{ width: '100%', tableLayout: 'fixed' }}
              >
                <TableHeader>
                  <TableRow
                    className="[&_th]:text-center [&_th]:align-middle [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:shadow-sm"
                    style={{ backgroundColor: TABLE_HEADER_BG }}
                  >
                    <TableHead
                      className="font-semibold text-center w-[100px] min-w-[100px] max-w-[100px] border-r border-gray-200"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: TABLE_HEADER_TEXT,
                      }}
                    ></TableHead>
                    <TableHead
                      className="font-semibold text-center w-[120px] min-w-[120px] max-w-[120px] border-r border-gray-200"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: TABLE_HEADER_TEXT,
                      }}
                    >
                      Cuenta
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center w-[250px] min-w-[250px] max-w-[250px] border-r border-gray-200"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: TABLE_HEADER_TEXT,
                      }}
                    >
                      Item
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center flex-1 min-w-[150px] border-r border-gray-200"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: TABLE_HEADER_TEXT,
                      }}
                    >
                      Detalle
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center w-[140px] min-w-[140px] max-w-[140px] border-r border-gray-200"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: TABLE_HEADER_TEXT,
                      }}
                    >
                      Monto
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center w-[220px] min-w-[220px] max-w-[220px] border-r border-gray-200"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: TABLE_HEADER_TEXT,
                      }}
                    >
                      Mes de ejecución
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center w-[130px] min-w-[130px] max-w-[130px]"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: '#991b1b',
                      }}
                    >
                      N° Solicitud
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center w-[130px] min-w-[130px] max-w-[130px]"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: '#991b1b',
                      }}
                    >
                      N° OC
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center w-[130px] min-w-[130px] max-w-[130px] border-r border-gray-200"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: '#991b1b',
                      }}
                    >
                      N° Recepción
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center w-[150px] min-w-[150px] max-w-[150px] border-r border-gray-200"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: TABLE_HEADER_TEXT,
                      }}
                    >
                      Estado
                    </TableHead>
                    <TableHead
                      className="font-semibold text-center w-[75px] min-w-[75px] max-w-[75px]"
                      style={{
                        backgroundColor: TABLE_HEADER_BG,
                        color: TABLE_HEADER_TEXT,
                      }}
                    ></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...items]
                    .sort(
                      (a, b) => CUENTA_ORDEN[a.cuenta] - CUENTA_ORDEN[b.cuenta]
                    )
                    .map((row) => {
                      const mesesEjecucion = row.proyecciones
                        .filter((p) => p.anio === anio)
                        .map((p) => p.mes)
                        .sort((a, b) => a - b);
                      const mesEjecucionTexto =
                        mesesEjecucion.length > 0
                          ? [...new Set(mesesEjecucion)]
                              .map((mes) => MONTHS[mes - 1])
                              .join(', ')
                          : '—';
                      const isRowEditing = editingItemId === row.id;
                      const draft = isRowEditing ? editDraft : null;
                      return (
                        <TableRow
                          key={row.id}
                          className={`hover:bg-gray-50/80 ${isRowEditing ? 'bg-blue-50/50' : ''}`}
                        >
                          <TableCell className="text-center align-middle w-[100px] min-w-[100px] max-w-[100px] whitespace-normal border-r border-gray-200">
                            <div className="flex items-center justify-center gap-1">
                              {isRowEditing ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={handleSaveEditItem}
                                    className="p-2 bg-gray-100 rounded-full hover:bg-green-100 transition-colors cursor-pointer"
                                    title="Guardar cambios"
                                  >
                                    <Check className="h-4 w-4 text-gray-700" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={cancelEditItem}
                                    className="p-2 bg-gray-100 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
                                    title="Cancelar edición"
                                  >
                                    <X className="h-4 w-4 text-gray-700" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => startEditItem(row.id)}
                                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                                    title="Editar gasto"
                                  >
                                    <Pencil className="h-4 w-4 text-gray-700" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteItem(row.id)}
                                    className="p-2 bg-gray-100 rounded-full hover:bg-red-100 transition-colors cursor-pointer"
                                    title="Eliminar gasto"
                                  >
                                    <Trash2 className="h-4 w-4 text-gray-700" />
                                  </button>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-center align-middle w-[120px] min-w-[120px] max-w-[120px] whitespace-normal border-r border-gray-200">
                            {isRowEditing && draft ? (
                              <Select
                                value={draft.cuenta}
                                onValueChange={(v) =>
                                  setEditDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          cuenta: v as CuentaPresupuesto,
                                        }
                                      : prev
                                  )
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CUENTA_OPTIONS.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              CUENTA_LABEL[row.cuenta]
                            )}
                          </TableCell>
                          <TableCell
                            className="align-middle w-[250px] min-w-[250px] max-w-[250px] border-r border-gray-200 whitespace-normal"
                            style={{
                              verticalAlign: 'middle',
                              wordWrap: 'break-word',
                            }}
                          >
                            {isRowEditing && draft ? (
                              <div className="relative">
                                <textarea
                                  value={draft.item}
                                  onChange={(e) =>
                                    setEditDraft((prev) =>
                                      prev
                                        ? { ...prev, item: e.target.value }
                                        : prev
                                    )
                                  }
                                  className="text-sm w-full resize-none p-2 border border-gray-300 rounded"
                                  rows={1}
                                  style={{
                                    height: 'auto',
                                    minHeight: '2.5rem',
                                    overflow: 'hidden',
                                    resize: 'none',
                                  }}
                                  ref={(element) => {
                                    if (element) {
                                      element.style.height = 'auto';
                                      element.style.height = `${element.scrollHeight}px`;
                                    }
                                  }}
                                  onInput={(e) => {
                                    const target =
                                      e.target as HTMLTextAreaElement;
                                    const prevHeight = target.style.height;
                                    target.style.height = 'auto';
                                    const newHeight = `${target.scrollHeight}px`;
                                    if (newHeight !== prevHeight) {
                                      target.style.height = newHeight;
                                    } else {
                                      target.style.height = prevHeight;
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="whitespace-normal break-words">
                                {row.item}
                              </div>
                            )}
                          </TableCell>
                          <TableCell
                            className="text-gray-600 align-middle flex-1 min-w-[150px] max-w-[400px] border-r border-gray-200"
                            style={{
                              verticalAlign: 'middle',
                              wordWrap: 'break-word',
                            }}
                          >
                            {isRowEditing && draft ? (
                              <div className="relative">
                                <textarea
                                  value={draft.detalle}
                                  placeholder="—"
                                  onChange={(e) =>
                                    setEditDraft((prev) =>
                                      prev
                                        ? { ...prev, detalle: e.target.value }
                                        : prev
                                    )
                                  }
                                  className="text-sm w-full resize-none p-2 border border-gray-300 rounded"
                                  rows={1}
                                  style={{
                                    height: 'auto',
                                    minHeight: '2.5rem',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    resize: 'none',
                                    wordWrap: 'break-word',
                                  }}
                                  ref={(element) => {
                                    if (element) {
                                      element.style.height = 'auto';
                                      element.style.height = `${element.scrollHeight}px`;
                                    }
                                  }}
                                  onInput={(e) => {
                                    const target =
                                      e.target as HTMLTextAreaElement;
                                    const prevHeight = target.style.height;
                                    target.style.height = 'auto';
                                    const newHeight = `${target.scrollHeight}px`;
                                    if (newHeight !== prevHeight) {
                                      target.style.height = newHeight;
                                    } else {
                                      target.style.height = prevHeight;
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className="whitespace-normal break-words"
                                style={{ maxWidth: '100%' }}
                              >
                                {row.detalle ?? '—'}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums font-medium align-middle w-[140px] min-w-[140px] max-w-[140px] whitespace-normal border-r border-gray-200">
                            {isRowEditing && draft ? (
                              <Input
                                type="number"
                                value={draft.monto}
                                className="h-8 text-sm w-24"
                                onChange={(e) => {
                                  const v = parseInt(e.target.value, 10);
                                  setEditDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          monto: Number.isNaN(v) ? 0 : v,
                                        }
                                      : prev
                                  );
                                }}
                              />
                            ) : (
                              <>${row.monto.toLocaleString('es-CL')}</>
                            )}
                          </TableCell>
                          <TableCell
                            className="text-center text-sm align-middle w-[220px] min-w-[220px] max-w-[220px] border-r border-gray-200"
                            style={{ whiteSpace: 'pre-line' }}
                          >
                            {isRowEditing ? (
                              <MesesEjecucionEditor
                                item={row}
                                anio={anio}
                                onUpdate={async () => {
                                  await refetch(false);
                                }}
                              />
                            ) : (
                              formatMesesEjecucion(mesesEjecucion)
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal">
                            {isRowEditing && draft ? (
                              <Input
                                value={draft.idSolicitud}
                                placeholder="—"
                                className="h-8 text-sm"
                                onChange={(e) =>
                                  setEditDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          idSolicitud: e.target.value,
                                        }
                                      : prev
                                  )
                                }
                              />
                            ) : (
                              (row.idSolicitud ?? '—')
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal">
                            {isRowEditing && draft ? (
                              <Input
                                value={draft.idPedido}
                                placeholder="—"
                                className="h-8 text-sm"
                                onChange={(e) =>
                                  setEditDraft((prev) =>
                                    prev
                                      ? { ...prev, idPedido: e.target.value }
                                      : prev
                                  )
                                }
                              />
                            ) : (
                              (row.idPedido ?? '—')
                            )}
                          </TableCell>
                          <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal border-r border-gray-200">
                            {isRowEditing && draft ? (
                              <Input
                                value={draft.idRecepcion}
                                placeholder="—"
                                className="h-8 text-sm"
                                onChange={(e) =>
                                  setEditDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          idRecepcion: e.target.value,
                                        }
                                      : prev
                                  )
                                }
                              />
                            ) : (
                              (row.idRecepcion ?? '—')
                            )}
                          </TableCell>
                          <TableCell className="text-center align-middle w-[150px] min-w-[150px] max-w-[150px] whitespace-normal border-r border-gray-200">
                            {isRowEditing && draft ? (
                              <Select
                                value={draft.estado}
                                onValueChange={(v) =>
                                  setEditDraft((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          estado: v as EstadoGastoPresupuesto,
                                        }
                                      : prev
                                  )
                                }
                              >
                                <SelectTrigger className="h-8 text-sm w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ESTADO_OPTIONS.map((opt) => (
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <EstadoBadge estado={row.estado} />
                            )}
                          </TableCell>
                          <TableCell className="text-center align-middle w-[75px] min-w-[75px] max-w-[75px] whitespace-normal">
                            <div className="relative">
                              <button
                                onClick={() => setSelectedGastoForModal(row)}
                                className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                                title="Ver detalles"
                              >
                                <Search className="h-5 w-5 text-gray-700" />
                              </button>
                              {row.comentariosCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                                  {row.comentariosCount}
                                </span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  {isAddingRow && (
                    <TableRow className="bg-blue-50 border-2 border-blue-200">
                      <TableCell className="text-center align-middle w-[100px] min-w-[100px] max-w-[100px] whitespace-normal border-r border-gray-200">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={handleSaveNewItem}
                            disabled={isSubmitting}
                            className="p-2 bg-gray-100 rounded-full hover:bg-green-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              isSubmitting ? 'Guardando...' : 'Guardar gasto'
                            }
                          >
                            <Check className="h-4 w-4 text-gray-700" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelAddingRow}
                            disabled={isSubmitting}
                            className="p-2 bg-gray-100 rounded-full hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4 text-gray-700" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-center align-middle w-[120px] min-w-[120px] max-w-[120px] whitespace-normal border-r border-gray-200">
                        <Select
                          value={newItemData.cuenta || 'RRHH'}
                          onValueChange={(value: CuentaPresupuesto) =>
                            setNewItemData((prev) => ({
                              ...prev,
                              cuenta: value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CUENTA_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-middle w-[250px] min-w-[250px] max-w-[250px] border-r border-gray-200 whitespace-normal">
                        <Input
                          value={newItemData.item || ''}
                          onChange={(e) =>
                            setNewItemData((prev) => ({
                              ...prev,
                              item: e.target.value,
                            }))
                          }
                          placeholder="Nombre del ítem *"
                          className="h-8 text-sm"
                          required
                        />
                      </TableCell>
                      <TableCell className="text-gray-600 align-middle flex-1 min-w-[150px] max-w-[400px] border-r border-gray-200">
                        <Input
                          value={newItemData.detalle || ''}
                          onChange={(e) =>
                            setNewItemData((prev) => ({
                              ...prev,
                              detalle: e.target.value || '',
                            }))
                          }
                          placeholder="Detalle (opcional)"
                          className="h-8 text-sm w-full"
                        />
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium align-middle w-[140px] min-w-[140px] max-w-[140px] whitespace-normal border-r border-gray-200">
                        <Input
                          type="number"
                          value={newItemData.monto || ''}
                          onChange={(e) =>
                            setNewItemData((prev) => ({
                              ...prev,
                              monto: parseInt(e.target.value) || 0,
                            }))
                          }
                          placeholder="0"
                          className="h-8 text-sm w-24"
                          min="0"
                          required
                        />
                      </TableCell>
                      <TableCell className="text-center text-sm align-middle w-[220px] min-w-[220px] max-w-[220px] border-r border-gray-200">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-8 text-sm w-full justify-start truncate"
                            >
                              <span className="truncate">
                                {newItemData.selectedMeses.size > 0
                                  ? [...newItemData.selectedMeses]
                                      .sort((a, b) => a - b)
                                      .map((mes) => MONTHS[mes - 1])
                                      .join(', ')
                                  : 'Seleccionar meses (opcional)'}
                              </span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
                            {MONTHS.map((mes, index) => (
                              <DropdownMenuCheckboxItem
                                key={index}
                                checked={newItemData.selectedMeses.has(
                                  index + 1
                                )}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(
                                    newItemData.selectedMeses
                                  );
                                  if (checked) {
                                    newSelected.add(index + 1);
                                  } else {
                                    newSelected.delete(index + 1);
                                  }
                                  setNewItemData((prev) => ({
                                    ...prev,
                                    selectedMeses: newSelected,
                                  }));
                                }}
                                onSelect={(e) => e.preventDefault()}
                              >
                                {mes}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal">
                        <Input
                          value={newItemData.idSolicitud}
                          onChange={(e) =>
                            setNewItemData((prev) => ({
                              ...prev,
                              idSolicitud: e.target.value,
                            }))
                          }
                          placeholder="—"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal">
                        <Input
                          value={newItemData.idPedido}
                          onChange={(e) =>
                            setNewItemData((prev) => ({
                              ...prev,
                              idPedido: e.target.value,
                            }))
                          }
                          placeholder="—"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal border-r border-gray-200">
                        <Input
                          value={newItemData.idRecepcion}
                          onChange={(e) =>
                            setNewItemData((prev) => ({
                              ...prev,
                              idRecepcion: e.target.value,
                            }))
                          }
                          placeholder="—"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center align-middle w-[150px] min-w-[150px] max-w-[150px] whitespace-normal border-r border-gray-200">
                        <EstadoBadge estado="PENDIENTE" />
                      </TableCell>
                      <TableCell className="text-center align-middle w-[75px] min-w-[75px] max-w-[75px] whitespace-normal"></TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-slate-50/90 border-t-2 border-gray-300">
                    <TableCell className="text-center align-middle w-[100px] min-w-[100px] max-w-[100px] whitespace-normal border-r border-gray-200" />
                    <TableCell className="font-medium text-center align-middle w-[120px] min-w-[120px] max-w-[120px] whitespace-normal border-r border-gray-200">
                      {CUENTA_LABEL.OPERACION}
                    </TableCell>
                    <TableCell className="align-middle w-[250px] min-w-[250px] max-w-[250px] border-r border-gray-200 whitespace-normal font-semibold">
                      DELTA
                    </TableCell>
                    <TableCell className="text-gray-600 align-middle flex-1 min-w-[150px] max-w-[400px] border-r border-gray-200">
                      {deltaSaldo >= 0 ? 'Saldo a favor' : 'Saldo en contra'}
                    </TableCell>
                    <TableCell
                      className={`text-center tabular-nums font-semibold align-middle w-[140px] min-w-[140px] max-w-[140px] whitespace-normal border-r border-gray-200 ${deltaSaldo < 0 ? 'text-red-600' : 'text-emerald-700'}`}
                    >
                      {formatPresupuestoMonto(deltaSaldo)}
                    </TableCell>
                    <TableCell className="text-center text-sm align-middle w-[220px] min-w-[220px] max-w-[220px] border-r border-gray-200">
                      —
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal">
                      —
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal">
                      —
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal border-r border-gray-200">
                      —
                    </TableCell>
                    <TableCell className="text-center align-middle w-[150px] min-w-[150px] max-w-[150px] whitespace-normal border-r border-gray-200">
                      <Badge
                        variant="outline"
                        className="bg-red-100 text-red-800 border-red-200"
                      >
                        {ESTADO_LABEL.PENDIENTE}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center align-middle w-[75px] min-w-[75px] max-w-[75px] whitespace-normal" />
                  </TableRow>
                  {!isAddingRow && (
                    <TableRow
                      className="hover:bg-green-50/70 transition-colors cursor-pointer border-t-2 border-dashed border-gray-200"
                      onClick={startAddingRow}
                    >
                      <TableCell colSpan={11} className="text-center py-4">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startAddingRow();
                          }}
                          className="p-3 bg-gray-100 rounded-full hover:bg-green-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Agregar gasto"
                        >
                          <Plus className="h-5 w-5 text-gray-700" />
                        </button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto p-4' : 'h-full'}`}
    >
      {content}
      {selectedGastoForModal && (
        <GastoPresupuestoModal
          gasto={selectedGastoForModal}
          onClose={() => setSelectedGastoForModal(null)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
}
