'use client';

/** Color de fondo de la cabecera de las tablas (gris claro). Cámbialo aquí para afectar ambas tablas. */
const TABLE_HEADER_BG = '#d1d5db';
/** Color del texto de la cabecera (oscuro para contraste sobre gris claro). */
const TABLE_HEADER_TEXT = '#374151';

import { useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
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
import { usePresupuesto } from '@/hooks/usePresupuesto';
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

function DataBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
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
}

export function PresupuestoCard({
  projectId,
  presupuestoTotal = 0,
}: PresupuestoCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { items, resumenPorCuenta, loading, error } = usePresupuesto(
    projectId,
    presupuestoTotal
  );
  const anio = new Date().getFullYear();

  const toggleFullscreen = () => setIsFullscreen((prev) => !prev);

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

  const techo =
    presupuestoTotal > 0 ? presupuestoTotal : resumenPorCuenta.totalMonto || 1;
  const totalPesoPct =
    techo > 0 ? (resumenPorCuenta.totalMonto / techo) * 100 : 0;

  const content = (
    <div className="h-full flex flex-col overflow-hidden">
      <div className={`flex-1 overflow-auto min-h-0 pt-2 px-6 pb-6`}>
        {/* Sección 1: Avance presupuesto — condensado en la parte superior izquierda */}
        <div className="flex flex-col items-stretch gap-4 mb-6 w-full max-w-5xl">
          {/* Barra global de avance: mismo ancho que la tabla */}
          <div className="flex items-center gap-2 w-full min-w-0">
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
            </TooltipProvider>
            <span className="text-lg font-medium text-gray-600 shrink-0">
              % Avance total
            </span>
            <div className="flex-1 min-w-0 bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, resumenPorCuenta.pctGlobalAvance)}%`,
                }}
              />
            </div>
            <span className="text-lg font-bold text-emerald-600 tabular-nums shrink-0">
              {resumenPorCuenta.pctGlobalAvance}%
            </span>
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
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    Monto
                  </TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    % Solicitado
                  </TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    % En Pedido
                  </TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    % Ejecutado
                  </TableHead>
                  <TableHead className="font-semibold" style={{ backgroundColor: TABLE_HEADER_BG, color: TABLE_HEADER_TEXT }}>
                    % Total
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
                    <TableCell className="text-center tabular-nums">
                      $
                      {row.monto.toLocaleString('es-CL')}
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctSolicitado} />
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctEnPedido} />
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctEjecutado} />
                    </TableCell>
                    <TableCell>
                      <DataBar pct={row.pctTotal} />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-200 font-semibold">
                  <TableCell className="text-center">TOTALES</TableCell>
                  <TableCell className="text-center tabular-nums">
                    {Math.round(totalPesoPct)}%
                  </TableCell>
                  <TableCell className="text-center tabular-nums">
                    $
                    {resumenPorCuenta.totalMonto.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell>
                    <DataBar
                      pct={
                        techo > 0
                          ? (resumenPorCuenta.totalSolicitado / techo) * 100
                          : 0
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <DataBar
                      pct={
                        techo > 0
                          ? (resumenPorCuenta.totalEnPedido / techo) * 100
                          : 0
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <DataBar
                      pct={
                        techo > 0
                          ? (resumenPorCuenta.totalEjecutado / techo) * 100
                          : 0
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <DataBar pct={resumenPorCuenta.pctGlobalAvance} />
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
                          {CUENTA_LABEL[row.cuenta]}
                        </TableCell>
                        <TableCell>{row.item}</TableCell>
                        <TableCell className="text-gray-600 max-w-[200px] truncate">
                          {row.detalle ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium">
                          $
                          {row.monto.toLocaleString('es-CL')}
                        </TableCell>
                        <TableCell className="text-center text-sm">
                          {mesEjecucionTexto}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {row.idSolicitud ?? '—'}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {row.idPedido ?? '—'}
                        </TableCell>
                        <TableCell className="tabular-nums text-sm">
                          {row.idRecepcion ?? '—'}
                        </TableCell>
                        <TableCell>
                          <EstadoBadge estado={row.estado} />
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
