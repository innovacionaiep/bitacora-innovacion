export type CuentaPresupuesto = 'RRHH' | 'OPERACION' | 'INVERSION';

export type EstadoGastoPresupuesto =
  | 'PENDIENTE'
  | 'SOLICITADO'
  | 'EN_PEDIDO'
  | 'EJECUTADO_OK';

export interface ProyeccionPresupuestoItem {
  id: string;
  mes: number;
  anio: number;
  monto: number;
}

export interface ItemPresupuestoItem {
  id: string;
  proyectoId: string;
  cuenta: CuentaPresupuesto;
  item: string;
  detalle: string | null;
  monto: number;
  estado: EstadoGastoPresupuesto;
  idSolicitud: string | null;
  idPedido: string | null;
  idRecepcion: string | null;
  orden: number;
  proyecciones: ProyeccionPresupuestoItem[];
  comentariosCount: number;
}

export interface ResumenCuenta {
  cuenta: CuentaPresupuesto;
  monto: number;
  porcentajePeso: number;
  montoSolicitado: number;
  montoEnPedido: number;
  montoEjecutado: number;
  pctSolicitado: number;
  pctEnPedido: number;
  pctEjecutado: number;
  saldo: number;
}

export interface ResumenPresupuesto {
  totalMonto: number;
  totalSolicitado: number;
  totalEnPedido: number;
  totalEjecutado: number;
  totalSaldo: number;
  pctTotalSolicitado: number;
  pctTotalEnPedido: number;
  pctTotalEjecutado: number;
  pctGlobalAvance: number;
  porCuenta: ResumenCuenta[];
}
