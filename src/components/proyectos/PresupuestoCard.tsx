'use client';

const TABLE_HEADER_BG = '#d1d5db';
const TABLE_HEADER_TEXT = '#374151';

import { useState, useCallback } from 'react';
import { Maximize, Minimize, Pencil, TrendingUp, Plus, Trash2 } from 'lucide-react';
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
  setProyeccionMensualMultiple,
  type CreateItemPresupuestoData,
  type UpdateItemPresupuestoData,
} from '@/lib/actions/presupuesto';
import type { CuentaPresupuesto, EstadoGastoPresupuesto, ItemPresupuestoItem } from '@/types/presupuesto';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const CUENTA_LABEL: Record<CuentaPresupuesto, string> = {
  RRHH: 'RRHH',
  OPERACION: 'Operación',
  INVERSION: 'Inversión',
};

const ESTADO_LABEL: Record<EstadoGastoPresupuesto, string> = {
  PENDIENTE: 'Pendiente',
  SOLICITADO: 'Solicitado',
  EN_PEDIDO: 'En Pedido',
  EJECUTADO_OK: 'Ejecutado OK',
};

function EstadoBadge({ estado }: { estado: EstadoGastoPresupuesto }) {
  const variant = estado === 'EJECUTADO_OK' ? 'default' : estado === 'EN_PEDIDO' ? 'secondary' : 'outline';
  const className = estado === 'EJECUTADO_OK' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : estado === 'EN_PEDIDO' ? 'bg-blue-100 text-blue-800 border-blue-200' : estado === 'SOLICITADO' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-700 border-gray-200';
  return <Badge variant={variant} className={className}>{ESTADO_LABEL[estado]}</Badge>;
}

function DataBar({ pct, darkTrack = false }: { pct: number; darkTrack?: boolean }) {
  const trackClass = darkTrack ? 'bg-gray-300' : 'bg-gray-200';
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className={`flex-1 ${trackClass} rounded-full h-2.5 overflow-hidden`}>
        <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-700 tabular-nums w-8">{Math.round(pct)}%</span>
    </div>
  );
}

interface PresupuestoCardProps {
  projectId: string;
  presupuestoTotal?: number;
  projectName?: string;
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
  for (let i = 0; i < nombresMeses.length; i += 3) grupos.push(nombresMeses.slice(i, i + 3));
  return grupos.map((grupo) => grupo.join(', ')).join('\n');
}

function MesesEjecucionEditor({ item, anio, onUpdate }: { item: ItemPresupuestoItem; anio: number; onUpdate: () => void }) {
  const [selectedMeses, setSelectedMeses] = useState<Set<number>>(() => new Set(item.proyecciones.filter((p) => p.anio === anio).map((p) => p.mes)));
  const toggleMes = async (mes: number) => {
    const newSelected = new Set(selectedMeses);
    if (newSelected.has(mes)) newSelected.delete(mes);
    else newSelected.add(mes);
    setSelectedMeses(newSelected);
    const montoPorMes = newSelected.size > 0 ? Math.round(item.monto / newSelected.size) : 0;
    const result = await setProyeccionMensualMultiple(item.id, [...newSelected].sort((a, b) => a - b), anio, montoPorMes);
    if (result.success) onUpdate();
  };
  const displayText = selectedMeses.size > 0 ? [...selectedMeses].sort((a, b) => a - b).map((mes) => MONTHS[mes - 1]).join(', ') : '—';
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-8 text-sm w-full justify-start truncate"><span className="truncate">{displayText}</span></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 max-h-64 overflow-y-auto">
        {MONTHS.map((mes, index) => (
          <DropdownMenuCheckboxItem key={index} checked={selectedMeses.has(index + 1)} onCheckedChange={() => toggleMes(index + 1)} onSelect={(e) => e.preventDefault()}>
            {mes}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PresupuestoCard({ projectId, presupuestoTotal = 0, projectName }: PresupuestoCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [newItemData, setNewItemData] = useState<{
    cuenta: CuentaPresupuesto;
    item: string;
    detalle: string;
    monto: number;
    selectedMeses: Set<number>;
    idSolicitud: string;
    idPedido: string;
    idRecepcion: string;
  }>({ cuenta: 'RRHH', item: '', detalle: '', monto: 0, selectedMeses: new Set(), idSolicitud: '', idPedido: '', idRecepcion: '' });
  const { items, resumenPorCuenta, loading, error, refetch } = usePresupuesto(projectId, presupuestoTotal);
  const anio = new Date().getFullYear();

  const toggleFullscreen = () => setIsFullscreen((p) => !p);
  const toggleEditMode = () => { setIsEditMode((p) => !p); if (!isEditMode) { setIsDeleteMode(false); setIsAddingRow(false); } };
  const toggleAddingRow = () => { setIsAddingRow((p) => !p); if (!isAddingRow) { setIsEditMode(false); setIsDeleteMode(false); } };
  const toggleDeleteMode = () => { setIsDeleteMode((p) => !p); if (!isDeleteMode) { setIsEditMode(false); setIsAddingRow(false); } };

  const handleSaveNewItem = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!newItemData.cuenta || !newItemData.item?.trim() || !newItemData.monto || newItemData.monto <= 0) {
      alert('Por favor complete todos los campos requeridos: cuenta, nombre del ítem y monto (mayor a 0).');
      setIsSubmitting(false);
      return;
    }
    const data: CreateItemPresupuestoData = { cuenta: newItemData.cuenta, item: newItemData.item.trim(), detalle: newItemData.detalle?.trim() || null, monto: newItemData.monto };
    const result = await createItemPresupuesto(projectId, data);
    if (result.success && result.data?.id) {
      const itemId = result.data.id;
      const updatePromises: Promise<unknown>[] = [];
      const updateData: UpdateItemPresupuestoData = {};
      if (newItemData.idSolicitud.trim()) updateData.idSolicitud = newItemData.idSolicitud.trim();
      if (newItemData.idPedido.trim()) updateData.idPedido = newItemData.idPedido.trim();
      if (newItemData.idRecepcion.trim()) updateData.idRecepcion = newItemData.idRecepcion.trim();
      if (Object.keys(updateData).length > 0) updatePromises.push(updateItemPresupuesto(itemId, updateData));
      if (newItemData.selectedMeses.size > 0) {
        const meses = Array.from(newItemData.selectedMeses).sort((a, b) => a - b);
        updatePromises.push(setProyeccionMensualMultiple(itemId, meses, anio, Math.round(newItemData.monto / newItemData.selectedMeses.size)));
      }
      if (updatePromises.length > 0) await Promise.all(updatePromises);
      setNewItemData({ cuenta: 'RRHH', item: '', detalle: '', monto: 0, selectedMeses: new Set(), idSolicitud: '', idPedido: '', idRecepcion: '' });
      setIsAddingRow(false);
      await refetch(false);
    } else alert(`Error al crear el ítem: ${result.error}`);
    setIsSubmitting(false);
  }, [refetch, isSubmitting, newItemData, projectId, anio]);

  const handleUpdateItem = useCallback(async (itemId: string, data: UpdateItemPresupuestoData) => {
    const result = await updateItemPresupuesto(itemId, data);
    if (result.success) await refetch(false);
  }, [refetch]);

  const handleDeleteItem = useCallback(async (itemId: string) => {
    if (confirm('¿Está seguro de que desea eliminar este ítem de presupuesto? Esta acción no se puede deshacer.')) {
      const result = await deleteItemPresupuesto(itemId);
      if (result.success) await refetch(false);
      else alert(`Error al eliminar el ítem: ${result.error}`);
    }
  }, [refetch]);

  if (loading) return (<div className="h-full flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" /><p className="text-muted-foreground">Cargando presupuesto...</p></div></div>);
  if (error) return (<div className="h-full flex items-center justify-center"><div className="text-center"><p className="text-red-500 mb-4">{error}</p></div></div>);

  const baseTotal = resumenPorCuenta.totalMonto || 1;
  const totalPesoPct = baseTotal > 0 ? (resumenPorCuenta.totalMonto / baseTotal) * 100 : 0;
  const n = resumenPorCuenta.porCuenta.length || 1;
  const avgPctSolicitado = resumenPorCuenta.porCuenta.reduce((s, r) => s + r.pctSolicitado, 0) / n;
  const avgPctEnPedido = resumenPorCuenta.porCuenta.reduce((s, r) => s + r.pctEnPedido, 0) / n;
  const avgPctEjecutado = resumenPorCuenta.porCuenta.reduce((s, r) => s + r.pctEjecutado, 0) / n;
  const avgPctAvanceCuenta = resumenPorCuenta.porCuenta.reduce((s, r) => s + r.pctTotal, 0) / n;

  const content = (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 flex flex-col pt-2 px-6 pb-4">
        <div className="flex-shrink-0 flex flex-col items-stretch gap-4 mb-6 w-full">
          <div className="flex items-center justify-between w-full min-w-0 gap-4">
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><Button type="button" onClick={toggleFullscreen} variant="ghost" size="sm" className="h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 shadow-sm">{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</Button></TooltipTrigger><TooltipContent><p>{isFullscreen ? 'Salir de pantalla completa' : 'Ver en pantalla completa'}</p></TooltipContent></Tooltip>
                {isFullscreen && projectName && <h1 className="text-2xl font-bold text-gray-900 shrink-0 ml-2 mr-2">{projectName}</h1>}
                <Tooltip><TooltipTrigger asChild><Button type="button" onClick={toggleEditMode} variant="ghost" size="sm" className={`h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 ${isEditMode ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}><Pencil className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>{isEditMode ? 'Salir del modo edición' : 'Editar ítems de presupuesto'}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" onClick={toggleAddingRow} variant="ghost" size="sm" className={`h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 ${isAddingRow ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}><Plus className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>{isAddingRow ? 'Cancelar agregar ítem' : 'Agregar ítem de presupuesto'}</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button type="button" onClick={toggleDeleteMode} variant="ghost" size="sm" className={`h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ml-1 ${isDeleteMode ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'}`}><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>{isDeleteMode ? 'Salir del modo eliminación' : 'Eliminar ítems de presupuesto'}</p></TooltipContent></Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center space-x-4 shrink-0">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
              <div className="flex items-center space-x-3">
                <span className="text-base font-semibold text-gray-900">Progreso</span>
                <div className="flex items-center space-x-3">
                  <div className="w-72 bg-gray-200 rounded-full h-2.5 shadow-inner">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-2.5 rounded-full transition-all duration-300 shadow-sm" style={{ width: `${Math.min(100, resumenPorCuenta.pctGlobalAvance)}%` }} />
                  </div>
                  <span className="text-4xl font-bold text-emerald-600 tabular-nums">{resumenPorCuenta.pctGlobalAvance}%</span>
                </div>
              </div>
            </div>
          </div>
          <div className="border rounded-lg overflow-hidden w-full">
            <Table>
              <TableHeader>
                <TableRow className="[&_th]:text-center" style={{ backgroundColor: TABLE_HEADER_BG }}>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Cuenta</TableHead>
                  <TableHead className="font-semibold w-16" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>%</TableHead>
                  <TableHead className="font-semibold border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Monto Cuenta</TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>% Solicitado</TableHead>
                  <TableHead className="font-semibold border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Monto Solicitado</TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>% En Pedido</TableHead>
                  <TableHead className="font-semibold border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Monto En Pedido</TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>% Ejecutado</TableHead>
                  <TableHead className="font-semibold border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Monto Ejecutado</TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>% Avance Cuenta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumenPorCuenta.porCuenta.map((row) => (
                  <TableRow key={row.cuenta} className="odd:bg-gray-50/50 hover:bg-gray-100/80">
                    <TableCell className="font-medium text-center">{CUENTA_LABEL[row.cuenta]}</TableCell>
                    <TableCell className="text-center tabular-nums">{Math.round(row.porcentajePeso)}%</TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">${row.monto.toLocaleString('es-CL')}</TableCell>
                    <TableCell><DataBar pct={row.pctSolicitado} /></TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">${row.montoSolicitado.toLocaleString('es-CL')}</TableCell>
                    <TableCell><DataBar pct={row.pctEnPedido} /></TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">${row.montoEnPedido.toLocaleString('es-CL')}</TableCell>
                    <TableCell><DataBar pct={row.pctEjecutado} /></TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">${row.montoEjecutado.toLocaleString('es-CL')}</TableCell>
                    <TableCell><DataBar pct={row.pctTotal} /></TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-200 font-semibold hover:bg-gray-200">
                  <TableCell className="text-center">TOTALES</TableCell>
                  <TableCell className="text-center tabular-nums">{Math.round(totalPesoPct)}%</TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">${resumenPorCuenta.totalMonto.toLocaleString('es-CL')}</TableCell>
                  <TableCell><DataBar pct={avgPctSolicitado} darkTrack /></TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">${resumenPorCuenta.totalSolicitado.toLocaleString('es-CL')}</TableCell>
                  <TableCell><DataBar pct={avgPctEnPedido} darkTrack /></TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">${resumenPorCuenta.totalEnPedido.toLocaleString('es-CL')}</TableCell>
                  <TableCell><DataBar pct={avgPctEjecutado} darkTrack /></TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">${resumenPorCuenta.totalEjecutado.toLocaleString('es-CL')}</TableCell>
                  <TableCell><DataBar pct={avgPctAvanceCuenta} darkTrack /></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col space-y-2">
          <div className="flex-1 min-h-0 border rounded-lg overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto min-h-0" style={{ width: '100%' }}>
              <Table className="table-fixed" style={{ width: '100%', tableLayout: 'fixed' }}>
                <TableHeader>
                  <TableRow className="[&_th]:text-center [&_th]:align-middle [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:shadow-sm" style={{ backgroundColor: TABLE_HEADER_BG }}>
                    {isDeleteMode && <TableHead className="font-semibold text-center w-[50px] min-w-[50px] max-w-[50px] border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }} />}
                    <TableHead className="font-semibold text-center w-[120px] min-w-[120px] max-w-[120px] border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Cuenta</TableHead>
                    <TableHead className="font-semibold text-center w-[250px] min-w-[250px] max-w-[250px] border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Item</TableHead>
                    <TableHead className="font-semibold text-center flex-1 min-w-[150px] border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Detalle</TableHead>
                    <TableHead className="font-semibold text-center w-[140px] min-w-[140px] max-w-[140px] border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Monto</TableHead>
                    <TableHead className="font-semibold text-center w-[220px] min-w-[220px] max-w-[220px] border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Mes de ejecución</TableHead>
                    <TableHead className="font-semibold text-center w-[130px] min-w-[130px] max-w-[130px]" style={{ backgroundColor: TABLE_HEADER_BG, color: '#991b1b' }}>N° Solicitud</TableHead>
                    <TableHead className="font-semibold text-center w-[130px] min-w-[130px] max-w-[130px]" style={{ backgroundColor: TABLE_HEADER_BG, color: '#991b1b' }}>N° OC</TableHead>
                    <TableHead className="font-semibold text-center w-[130px] min-w-[130px] max-w-[130px] border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: '#991b1b' }}>N° Recepción</TableHead>
                    <TableHead className="font-semibold text-center w-[150px] min-w-[150px] max-w-[150px]" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 && !isAddingRow && (
                    <TableRow>
                      <TableCell
                        colSpan={9 + (isDeleteMode ? 1 : 0)}
                        className="text-center text-gray-500 py-8"
                      >
                        No hay ítems de presupuesto. Agrega gastos para hacer
                        seguimiento.
                      </TableCell>
                    </TableRow>
                  )}
                  {isAddingRow && (
                    <TableRow className="bg-blue-50 border-2 border-blue-200">
                      {isDeleteMode && (
                        <TableCell className="text-center align-middle w-[50px] min-w-[50px] max-w-[50px] whitespace-normal border-r border-gray-200"></TableCell>
                      )}
                      <TableCell className="font-medium text-center align-middle w-[120px] min-w-[120px] max-w-[120px] whitespace-normal border-r border-gray-200">
                        <Select
                          value={newItemData.cuenta || 'RRHH'}
                          onValueChange={(value: CuentaPresupuesto) =>
                            setNewItemData(prev => ({ ...prev, cuenta: value }))
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
                      </TableCell>
                      <TableCell className="align-middle w-[250px] min-w-[250px] max-w-[250px] border-r border-gray-200 whitespace-normal">
                        <Input
                          value={newItemData.item || ''}
                          onChange={(e) => setNewItemData(prev => ({ ...prev, item: e.target.value }))}
                          placeholder="Nombre del ítem *"
                          className="h-8 text-sm"
                          required
                        />
                      </TableCell>
                      <TableCell className="text-gray-600 align-middle flex-1 min-w-[150px] max-w-[400px] border-r border-gray-200">
                        <Input
                          value={newItemData.detalle || ''}
                          onChange={(e) => setNewItemData(prev => ({ ...prev, detalle: e.target.value || null }))}
                          placeholder="Detalle (opcional)"
                          className="h-8 text-sm w-full"
                        />
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium align-middle w-[140px] min-w-[140px] max-w-[140px] whitespace-normal border-r border-gray-200">
                        <Input
                          type="number"
                          value={newItemData.monto || ''}
                          onChange={(e) => setNewItemData(prev => ({ ...prev, monto: parseInt(e.target.value) || 0 }))}
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
                                checked={newItemData.selectedMeses.has(index + 1)}
                                onCheckedChange={(checked) => {
                                  const newSelected = new Set(newItemData.selectedMeses);
                                  if (checked) {
                                    newSelected.add(index + 1);
                                  } else {
                                    newSelected.delete(index + 1);
                                  }
                                  setNewItemData(prev => ({ ...prev, selectedMeses: newSelected }));
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
                          onChange={(e) => setNewItemData(prev => ({ ...prev, idSolicitud: e.target.value }))}
                          placeholder="—"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal">
                        <Input
                          value={newItemData.idPedido}
                          onChange={(e) => setNewItemData(prev => ({ ...prev, idPedido: e.target.value }))}
                          placeholder="—"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal border-r border-gray-200">
                        <Input
                          value={newItemData.idRecepcion}
                          onChange={(e) => setNewItemData(prev => ({ ...prev, idRecepcion: e.target.value }))}
                          placeholder="—"
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell className="text-center align-middle w-[150px] min-w-[150px] max-w-[150px] whitespace-normal">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveNewItem}
                            disabled={isSubmitting}
                            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSubmitting ? "Guardando..." : "Guardar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
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
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                  {items.map((row) => {
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
                    return (
                      <TableRow key={row.id} className="hover:bg-gray-50/80">
                        {isDeleteMode && (
                          <TableCell className="text-center align-middle w-[50px] min-w-[50px] max-w-[50px] whitespace-normal border-r border-gray-200">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteItem(row.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </TableCell>
                        )}
                        <TableCell className="font-medium text-center align-middle w-[120px] min-w-[120px] max-w-[120px] whitespace-normal border-r border-gray-200">
                          {isEditMode ? (
                            <Select
                              value={row.cuenta}
                              onValueChange={(v) =>
                                handleUpdateItem(row.id, {
                                  cuenta: v as CuentaPresupuesto,
                                })
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
                        <TableCell className="align-middle w-[250px] min-w-[250px] max-w-[250px] border-r border-gray-200 whitespace-normal" style={{ verticalAlign: 'middle', wordWrap: 'break-word' }}>
                          {isEditMode ? (
                            <div className="relative">
                              <textarea
                                defaultValue={row.item}
                                className="text-sm w-full resize-none p-2 border border-gray-300 rounded"
                                rows={1}
                                style={{ height: 'auto', minHeight: '2.5rem', overflow: 'hidden', resize: 'none' }}
                                ref={(element) => {
                                  if (element) {
                                    element.style.height = 'auto';
                                    element.style.height = `${element.scrollHeight}px`;
                                  }
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  const prevHeight = target.style.height;
                                  target.style.height = 'auto';
                                  const newHeight = `${target.scrollHeight}px`;
                                  if (newHeight !== prevHeight) {
                                    target.style.height = newHeight;
                                  } else {
                                    target.style.height = prevHeight;
                                  }
                                }}
                                onBlur={(e) => {
                                  const v = e.target.value.trim();
                                  if (v && v !== row.item)
                                    handleUpdateItem(row.id, { item: v });
                                }}
                              />
                            </div>
                          ) : (
                            <div className="whitespace-normal break-words">{row.item}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 align-middle flex-1 min-w-[150px] max-w-[400px] border-r border-gray-200" style={{ verticalAlign: 'middle', wordWrap: 'break-word' }}>
                          {isEditMode ? (
                            <div className="relative">
                              <textarea
                                defaultValue={row.detalle ?? ''}
                                placeholder="—"
                                className="text-sm w-full resize-none p-2 border border-gray-300 rounded"
                                rows={1}
                                style={{ height: 'auto', minHeight: '2.5rem', maxWidth: '100%', overflow: 'hidden', resize: 'none', wordWrap: 'break-word' }}
                                ref={(element) => {
                                  if (element) {
                                    element.style.height = 'auto';
                                    element.style.height = `${element.scrollHeight}px`;
                                  }
                                }}
                                onInput={(e) => {
                                  const target = e.target as HTMLTextAreaElement;
                                  const prevHeight = target.style.height;
                                  target.style.height = 'auto';
                                  const newHeight = `${target.scrollHeight}px`;
                                  if (newHeight !== prevHeight) {
                                    target.style.height = newHeight;
                                  } else {
                                    target.style.height = prevHeight;
                                  }
                                }}
                                onBlur={(e) => {
                                  const v = e.target.value.trim() || null;
                                  if (v !== (row.detalle ?? ''))
                                    handleUpdateItem(row.id, { detalle: v });
                                }}
                              />
                            </div>
                          ) : (
                            <div className="whitespace-normal break-words" style={{ maxWidth: '100%' }}>{row.detalle ?? '—'}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums font-medium align-middle w-[140px] min-w-[140px] max-w-[140px] whitespace-normal border-r border-gray-200">
                          {isEditMode ? (
                            <Input
                              type="number"
                              defaultValue={row.monto}
                              className="h-8 text-sm w-24"
                              onBlur={(e) => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v >= 0 && v !== row.monto)
                                  handleUpdateItem(row.id, { monto: v });
                              }}
                            />
                          ) : (
                            <>${row.monto.toLocaleString('es-CL')}</>
                          )}
                        </TableCell>
                        <TableCell className="text-center text-sm align-middle w-[220px] min-w-[220px] max-w-[220px] border-r border-gray-200" style={{ whiteSpace: 'pre-line' }}>
                          {isEditMode ? (
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
                          {isEditMode ? (
                            <Input
                              defaultValue={row.idSolicitud ?? ''}
                              placeholder="—"
                              className="h-8 text-sm"
                              onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (row.idSolicitud ?? ''))
                                  handleUpdateItem(row.id, {
                                    idSolicitud: v,
                                  });
                              }}
                            />
                          ) : (
                            row.idSolicitud ?? '—'
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal">
                          {isEditMode ? (
                            <Input
                              defaultValue={row.idPedido ?? ''}
                              placeholder="—"
                              className="h-8 text-sm"
                              onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (row.idPedido ?? ''))
                                  handleUpdateItem(row.id, { idPedido: v });
                              }}
                            />
                          ) : (
                            row.idPedido ?? '—'
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm align-middle w-[130px] min-w-[130px] max-w-[130px] whitespace-normal border-r border-gray-200">
                          {isEditMode ? (
                            <Input
                              defaultValue={row.idRecepcion ?? ''}
                              placeholder="—"
                              className="h-8 text-sm"
                              onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (row.idRecepcion ?? ''))
                                  handleUpdateItem(row.id, {
                                    idRecepcion: v,
                                  });
                              }}
                            />
                          ) : (
                            row.idRecepcion ?? '—'
                          )}
                        </TableCell>
                        <TableCell className="text-center align-middle w-[150px] min-w-[150px] max-w-[150px] whitespace-normal">
                          {isEditMode ? (
                            <Select
                              value={row.estado}
                              onValueChange={(v) =>
                                handleUpdateItem(row.id, {
                                  estado: v as EstadoGastoPresupuesto,
                                })
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white overflow-auto p-4' : 'h-full'}`}>
      {content}
    </div>
  );
}