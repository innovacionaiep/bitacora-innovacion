'use client';

/** Color de fondo de la cabecera de las tablas (gris claro). Cámbialo aquí para afectar ambas tablas. */
const TABLE_HEADER_BG = '#d1d5db';
/** Color del texto de la cabecera (oscuro para contraste sobre gris claro). */
const TABLE_HEADER_TEXT = '#374151';

import { useState, useCallback } from 'react';
import { Maximize, Minimize, Pencil, TrendingUp } from 'lucide-react';
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
  updateItemPresupuesto,
  type UpdateItemPresupuestoData,
} from '@/lib/actions/presupuesto';
import type { CuentaPresupuesto, EstadoGastoPresupuesto } from '@/types/presupuesto';

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

const ESTADO_LABEL: Record<EstadoGastoPresupuesto, string> = {
  PENDIENTE: 'Pendiente',
  SOLICITADO: 'Solicitado',
  EN_PEDIDO: 'En Pedido',
  EJECUTADO_OK: 'Ejecutado OK',
};

function EstadoBadge({ estado }: { estado: EstadoGastoPresupuesto }) {
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

export function PresupuestoCard({
  projectId,
  presupuestoTotal = 0,
  projectName,
}: PresupuestoCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { items, resumenPorCuenta, loading, error, refetch } = usePresupuesto(
    projectId,
    presupuestoTotal
  );
  const anio = new Date().getFullYear();

  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);
  const toggleEditMode = () => setIsEditMode((prev) => !prev);

  const handleUpdateItem = useCallback(
    async (itemId: string, data: UpdateItemPresupuestoData) => {
      const result = await updateItemPresupuesto(itemId, data);
      if (result.success) {
        await refetch(false);
      }
    },
    [refetch]
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando presupuesto...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
        </div>
      </div>
    );
  }

  // 100% = suma total de todos los gastos (dinámico, no presupuesto fijo)
  const baseTotal = resumenPorCuenta.totalMonto || 1;
  const totalPesoPct = baseTotal > 0 ? (resumenPorCuenta.totalMonto / baseTotal) * 100 : 0;

  // Promedios de las tres cuentas para la fila TOTALES (RRHH, Operación, Inversión)
  const n = resumenPorCuenta.porCuenta.length || 1;
  const avgPctSolicitado =
    resumenPorCuenta.porCuenta.reduce((s, r) => s + r.pctSolicitado, 0) / n;
  const avgPctEnPedido =
    resumenPorCuenta.porCuenta.reduce((s, r) => s + r.pctEnPedido, 0) / n;
  const avgPctEjecutado =
    resumenPorCuenta.porCuenta.reduce((s, r) => s + r.pctEjecutado, 0) / n;
  const avgPctAvanceCuenta =
    resumenPorCuenta.porCuenta.reduce((s, r) => s + r.pctTotal, 0) / n;

  const content = (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`flex-1 overflow-auto min-h-0 pt-2 px-6 pb-6`}>
        {/* Sección 1: Avance presupuesto — condensado en la parte superior izquierda */}
        <div className="flex flex-col items-stretch gap-4 mb-6 w-full">
          {/* Header: botón fullscreen + título (si aplica) a la izquierda; icono, barra y % a la derecha (igual que Actividades) */}
          <div className="flex items-center justify-between w-full min-w-0 gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <TooltipProvider>
                <>
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
                <h1 className="text-2xl font-bold text-gray-900 shrink-0 ml-2">
                  {projectName}
                </h1>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    onClick={toggleEditMode}
                    variant="ghost"
                    size="sm"
                    className={`h-10 w-10 shrink-0 rounded-lg transition-all duration-200 flex items-center justify-center border shadow-sm ${isFullscreen ? 'ml-2' : ''} ${
                      isEditMode
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200'
                    }`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {isEditMode
                      ? 'Salir del modo edición'
                      : 'Editar ítems de presupuesto'}
                  </p>
                </TooltipContent>
              </Tooltip>
                </>
              </TooltipProvider>
            </div>
            {/* Progreso del proyecto (mismo estilo que tab Actividades) */}
            <div className="flex items-center space-x-4 shrink-0">
              <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg shadow-sm">
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
                        width: `${Math.min(100, resumenPorCuenta.pctGlobalAvance)}%`,
                      }}
                    />
                  </div>
                  <span className="text-4xl font-bold text-emerald-600 tabular-nums">
                    {resumenPorCuenta.pctGlobalAvance}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* Tabla de progreso del presupuesto */}
          <div className="border rounded-lg overflow-hidden w-full">
            <Table>
              <TableHeader>
                <TableRow
                  className="[&_th]:text-center"
                  style={{ backgroundColor: TABLE_HEADER_BG }}
                >
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Cuenta
                  </TableHead>
                  <TableHead className="font-semibold w-16" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    %
                  </TableHead>
                  <TableHead className="font-semibold border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Monto Cuenta
                  </TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    % Solicitado
                  </TableHead>
                  <TableHead className="font-semibold border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Monto Solicitado
                  </TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    % En Pedido
                  </TableHead>
                  <TableHead className="font-semibold border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Monto En Pedido
                  </TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    % Ejecutado
                  </TableHead>
                  <TableHead className="font-semibold border-r border-gray-200" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Monto Ejecutado
                  </TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    % Avance Cuenta
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumenPorCuenta.porCuenta.map((row) => (
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
                      $
                      {row.monto.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctSolicitado} />
                    </TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">
                      $
                      {row.montoSolicitado.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctEnPedido} />
                    </TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">
                      $
                      {row.montoEnPedido.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctEjecutado} />
                    </TableCell>
                    <TableCell className="text-center tabular-nums border-r border-gray-200">
                      $
                      {row.montoEjecutado.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctTotal} />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-200 font-semibold hover:bg-gray-200">
                  <TableCell className="text-center">TOTALES</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {Math.round(totalPesoPct)}%
                  </TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">
                    $
                    {resumenPorCuenta.totalMonto.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <DataBar pct={avgPctSolicitado} darkTrack />
                  </TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">
                    $
                    {resumenPorCuenta.totalSolicitado.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <DataBar pct={avgPctEnPedido} darkTrack />
                  </TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">
                    $
                    {resumenPorCuenta.totalEnPedido.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <DataBar pct={avgPctEjecutado} darkTrack />
                  </TableCell>
                  <TableCell className="text-center tabular-nums border-r border-white">
                    $
                    {resumenPorCuenta.totalEjecutado.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <DataBar pct={avgPctAvanceCuenta} darkTrack />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Sección 2–4: Tabla unificada Detalle + Temporalidad + IDs + Estado */}
        <div className="space-y-3">
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow
                  className="[&_th]:text-center"
                  style={{ backgroundColor: TABLE_HEADER_BG }}
                >
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Cuenta
                  </TableHead>
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Item
                  </TableHead>
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Detalle
                  </TableHead>
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Monto
                  </TableHead>
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Mes de ejecución
                  </TableHead>
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: '#991b1b' }}>
                    N° Solicitud
                  </TableHead>
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: '#991b1b' }}>
                    N° OC
                  </TableHead>
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: '#991b1b' }}>
                    N° Recepción
                  </TableHead>
                  <TableHead className="font-semibold whitespace-nowrap" style={{ backgroundColor: TABLE_HEADER_BG, color: '#991b1b' }}>
                    Observación / Estado
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4 + 1 + 4}
                      className="text-center text-gray-500 py-8"
                    >
                      No hay ítems de presupuesto. Agrega gastos para hacer
                      seguimiento.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((row) => {
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
                        <TableCell className="font-medium">
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
                        <TableCell>
                          {isEditMode ? (
                            <Input
                              defaultValue={row.item}
                              className="h-8 text-sm"
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v && v !== row.item)
                                  handleUpdateItem(row.id, { item: v });
                              }}
                            />
                          ) : (
                            row.item
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 max-w-[200px]">
                          {isEditMode ? (
                            <Input
                              defaultValue={row.detalle ?? ''}
                              placeholder="—"
                              className="h-8 text-sm"
                              onBlur={(e) => {
                                const v = e.target.value.trim() || null;
                                if (v !== (row.detalle ?? ''))
                                  handleUpdateItem(row.id, { detalle: v });
                              }}
                            />
                          ) : (
                            <span className="truncate block">
                              {row.detalle ?? '—'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
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
                        <TableCell className="text-center text-sm">
                          {mesEjecucionTexto}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
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
                        <TableCell className="tabular-nums text-sm">
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
                        <TableCell className="tabular-nums text-sm">
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
                        <TableCell>
                          {isEditMode ? (
                            <Select
                              value={row.estado}
                              onValueChange={(v) =>
                                handleUpdateItem(row.id, {
                                  estado: v as EstadoGastoPresupuesto,
                                })
                              }
                            >
                              <SelectTrigger className="h-8 text-sm w-[130px]">
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
                  })
                )}
              </TableBody>
            </Table>
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
    </div>
  );
}
