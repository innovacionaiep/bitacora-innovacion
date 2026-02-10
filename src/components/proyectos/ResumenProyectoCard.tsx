'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Crosshair,
  MapPin,
  GraduationCap,
  Crown,
  Users,
  FileText,
  BarChart3,
  ListChecks,
  Target,
  DollarSign,
  Calendar,
  Lightbulb,
  ListTodo,
  History,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useGantt } from '@/hooks/useGantt';
import { useIndicadores } from '@/hooks/useIndicadores';
import { usePresupuesto } from '@/hooks/usePresupuesto';
import {
  getReunionesProyecto,
  getOportunidadesAmenazasProyecto,
  getCompromisosProyecto,
} from '@/lib/actions/seguimiento';
import { getHistorialProyecto } from '@/lib/actions/historial';
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart';
import { ReunionModal } from '@/components/seguimiento/ReunionModal';
import type { ProyectoWithRelations } from '@/types/proyecto';
import type { CuentaPresupuesto } from '@/types/presupuesto';
import { ActivityStatus } from '@prisma/client';

const CUENTA_LABEL: Record<CuentaPresupuesto, string> = {
  RRHH: 'RRHH',
  OPERACION: 'Operación',
  INVERSION: 'Inversión',
};

const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  TODO: 'Por hacer',
  WAITING: 'En espera',
  IN_PROGRESS: 'En proceso',
  DONE: 'Finalizada',
};

interface ResumenProyectoCardProps {
  projectId: string;
  project: ProyectoWithRelations;
  presupuestoTotal?: number;
  onReunionUpdated?: () => void | Promise<void>;
}

export function ResumenProyectoCard({
  projectId,
  project,
  presupuestoTotal = 0,
  onReunionUpdated,
}: ResumenProyectoCardProps) {
  const { activities, loading: loadingGantt } = useGantt(projectId);
  const { data: dataIndicadores, calculateOverallProgress } =
    useIndicadores(projectId);
  const { resumenPorCuenta, loading: loadingPresupuesto } = usePresupuesto(
    projectId,
    presupuestoTotal
  );

  const [reuniones, setReuniones] = useState<
    Awaited<ReturnType<typeof getReunionesProyecto>>['data']
  >([]);
  const [oportunidadesAmenazas, setOportunidadesAmenazas] = useState<
    Awaited<ReturnType<typeof getOportunidadesAmenazasProyecto>>['data']
  >([]);
  const [compromisos, setCompromisos] = useState<
    Awaited<ReturnType<typeof getCompromisosProyecto>>['data']
  >([]);
  const [historial, setHistorial] = useState<
    Awaited<ReturnType<typeof getHistorialProyecto>>['data']
  >([]);
  const [loadingSeguimiento, setLoadingSeguimiento] = useState(true);
  const [selectedReunionId, setSelectedReunionId] = useState<string | null>(
    null
  );
  const [reunionModalOpen, setReunionModalOpen] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoadingSeguimiento(true);
    void Promise.all([
      getReunionesProyecto(projectId),
      getOportunidadesAmenazasProyecto(projectId),
      getCompromisosProyecto(projectId),
      getHistorialProyecto(projectId, undefined, 10),
    ])
      .then(([rRes, oaRes, cRes, hRes]) => {
        if (cancelled) return;
        if (rRes.success && rRes.data) setReuniones(rRes.data);
        if (oaRes.success && oaRes.data) setOportunidadesAmenazas(oaRes.data);
        if (cRes.success && cRes.data) setCompromisos(cRes.data);
        if (hRes.success && hRes.data) setHistorial(hRes.data);
      })
      .finally(() => {
        if (!cancelled) setLoadingSeguimiento(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const loadingAvances = loadingGantt || loadingPresupuesto;
  const pctActividades = useMemo(() => {
    if (!activities.length) return 0;
    const sum = activities.reduce((s, a) => s + a.progress, 0);
    return Math.round(sum / activities.length);
  }, [activities]);
  const pctIndicadores = useMemo(
    () => calculateOverallProgress(),
    [dataIndicadores, calculateOverallProgress]
  );
  const pctPresupuesto = resumenPorCuenta.pctGlobalAvance ?? 0;
  const barChartData = useMemo(
    () => [
      { label: 'Actividades', value: pctActividades, color: '#10b981' },
      { label: 'Indicadores', value: pctIndicadores, color: '#3b82f6' },
      { label: 'Presupuesto', value: pctPresupuesto, color: '#f59e0b' },
    ],
    [pctActividades, pctIndicadores, pctPresupuesto]
  );

  const indicadoresFlat = useMemo(() => {
    if (!dataIndicadores?.objetivosGenerales) return [];
    return dataIndicadores.objetivosGenerales.flatMap((og) =>
      og.objetivosEspecificos.flatMap((oe) =>
        oe.indicadores.map((ind) => ({
          nombre: ind.nombre,
          resultadoAlcanzado: ind.resultadoAlcanzado ?? '',
        }))
      )
    );
  }, [dataIndicadores]);

  const isActivityFueraDePlazo = (activity: {
    status: string;
    tasks: { endDate: string }[];
  }) => {
    if (activity.status === 'DONE') return false;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const maxEnd = activity.tasks.reduce<Date | null>((acc, t) => {
      try {
        const d = new Date(t.endDate);
        return !acc ? d : d > acc ? d : acc;
      } catch {
        return acc;
      }
    }, null);
    return maxEnd != null && maxEnd < today;
  };

  const objetivoGeneral = project.objetivos_rel?.find(
    (obj) => obj.tipo === 'General'
  );
  const encargados =
    project.participantes_rel?.filter((p) => p.rol === 'Encargado') ?? [];
  const coordinadores =
    project.participantes_rel?.filter((p) => p.rol === 'Coordinador') ?? [];

  const formatFechaCorta = (fecha: Date | string) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatHistorialEntry = (entry: {
    fecha: Date | string;
    accion: string;
    tabProyecto: string;
    cambioGenerado: string;
    elementoEspecifico: string;
  }) => {
    const f = formatFechaCorta(entry.fecha);
    const desc =
      entry.cambioGenerado?.trim() || entry.elementoEspecifico || entry.accion;
    return `${f}: ${entry.accion} (${entry.tabProyecto}) — ${desc}`;
  };

  const handleReunionDetails = (reunionId: string) => {
    setSelectedReunionId(reunionId);
    setReunionModalOpen(true);
  };

  const handleReunionModalClose = (open: boolean) => {
    setReunionModalOpen(open);
    if (!open) setSelectedReunionId(null);
    onReunionUpdated?.();
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pt-4">
        <div className="flex flex-col items-center pb-6">
          <div className="w-full max-w-[800px] space-y-6">
            {/* 1. Información General */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden w-full">
              <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-1.5 flex items-center space-x-2.5 border-b border-gray-200">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Información General
                </h3>
              </div>
              <CardContent className="p-3">
                <div className="space-y-4">
                  {/* 1. Objetivo General */}
                  {objetivoGeneral && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Crosshair className="h-4 w-4 text-emerald-600" />
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Objetivo General
                        </h4>
                      </div>
                      <div className="border-l-4 border-emerald-600 bg-gradient-to-r from-emerald-50 via-white to-gray-50 rounded-r-lg py-2 px-3">
                        <p className="text-gray-800 text-sm leading-relaxed">
                          {objetivoGeneral.descripcion}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* 2. Sedes */}
                  <div className="py-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Sedes
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {project.sede ? (
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
                        >
                          {project.sede}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-500">Sin sede</span>
                      )}
                    </div>
                  </div>

                  {/* 3. Escuelas */}
                  <div className="py-1.5">
                    <div className="flex items-center gap-2 mb-1">
                      <GraduationCap className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Escuelas
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {project.escuelas?.length ? (
                        project.escuelas.map((rel, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs font-normal bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            {rel.escuela.nombre}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">
                          Sin escuelas asignadas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 4. Encargados y coordinadores */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Encargados y coordinadores
                      </h4>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {encargados.map((p) => {
                        const nombre = p.user?.name ?? p.nombre ?? 'Sin nombre';
                        const cargo = p.cargo ?? '';
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                          >
                            <Crown className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="text-gray-900 font-medium truncate min-w-0 flex-1">
                              {nombre}
                              {cargo ? (
                                <span className="text-gray-600 font-normal text-xs">
                                  {' · '}
                                  {cargo}
                                </span>
                              ) : null}
                            </span>
                            <Badge className="bg-orange-100 text-orange-800 text-xs w-24 justify-center flex-shrink-0">
                              Encargado
                            </Badge>
                          </div>
                        );
                      })}
                      {coordinadores.map((p) => {
                        const nombre = p.user?.name ?? p.nombre ?? 'Sin nombre';
                        const cargo = p.cargo ?? '';
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                          >
                            <Users className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                            <span className="text-gray-900 font-medium truncate min-w-0 flex-1">
                              {nombre}
                              {cargo ? (
                                <span className="text-gray-600 font-normal text-xs">
                                  {' · '}
                                  {cargo}
                                </span>
                              ) : null}
                            </span>
                            <Badge className="bg-blue-100 text-blue-800 text-xs w-24 justify-center flex-shrink-0">
                              Coordinador
                            </Badge>
                          </div>
                        );
                      })}
                      {encargados.length === 0 &&
                        coordinadores.length === 0 && (
                          <span className="text-xs text-gray-500 py-1.5 block">
                            No hay encargados ni coordinadores
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Avances */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden w-full">
              <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-1.5 flex items-center space-x-2.5 border-b border-gray-200">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Avances
                </h3>
              </div>
              <CardContent className="p-3">
                {loadingAvances ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <SimpleBarChart data={barChartData} height={100} />
                )}
              </CardContent>
            </Card>

            {/* 3. Presupuesto */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden w-full">
              <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 flex items-center space-x-2.5 border-b border-gray-200">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Presupuesto
                </h3>
              </div>
              <CardContent className="p-4 overflow-x-auto">
                {loadingAvances ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-semibold">
                            Cuenta
                          </TableHead>
                          <TableHead className="font-semibold text-right">
                            Monto
                          </TableHead>
                          <TableHead className="font-semibold text-right">
                            Solicitado
                          </TableHead>
                          <TableHead className="font-semibold text-right">
                            En pedido
                          </TableHead>
                          <TableHead className="font-semibold text-right">
                            Ejecutado
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resumenPorCuenta.porCuenta?.map((row) => (
                          <TableRow
                            key={row.cuenta}
                            className="odd:bg-gray-50/50"
                          >
                            <TableCell className="font-medium text-sm">
                              {CUENTA_LABEL[row.cuenta]}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              ${row.monto.toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              ${row.montoSolicitado.toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              ${row.montoEnPedido.toLocaleString('es-CL')}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              ${row.montoEjecutado.toLocaleString('es-CL')}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-100 font-semibold">
                          <TableCell className="text-sm">TOTALES</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            $
                            {(resumenPorCuenta.totalMonto ?? 0).toLocaleString(
                              'es-CL'
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            $
                            {(
                              resumenPorCuenta.totalSolicitado ?? 0
                            ).toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            $
                            {(
                              resumenPorCuenta.totalEnPedido ?? 0
                            ).toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            $
                            {(
                              resumenPorCuenta.totalEjecutado ?? 0
                            ).toLocaleString('es-CL')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 4. Indicadores */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden w-full">
              <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 flex items-center space-x-2.5 border-b border-gray-200">
                <Target className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Indicadores
                </h3>
              </div>
              <CardContent className="p-4">
                {loadingAvances ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : indicadoresFlat.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    No hay indicadores
                  </p>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="font-semibold">
                            Nombre indicador
                          </TableHead>
                          <TableHead className="font-semibold">
                            Resultado alcanzado
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {indicadoresFlat.map((ind, idx) => (
                          <TableRow key={idx} className="odd:bg-gray-50/50">
                            <TableCell className="text-sm">
                              {ind.nombre}
                            </TableCell>
                            <TableCell className="text-sm text-gray-700">
                              {ind.resultadoAlcanzado.trim()
                                ? ind.resultadoAlcanzado
                                : 'Sin registrar'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 5. Actividades */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden w-full">
              <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 flex items-center space-x-2.5 border-b border-gray-200">
                <ListChecks className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Actividades
                </h3>
              </div>
              <CardContent className="p-4">
                {loadingAvances ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    No hay actividades
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {activities.map((act) => {
                      const fueraDePlazo = isActivityFueraDePlazo(act);
                      const statusLabel =
                        ACTIVITY_STATUS_LABEL[act.status as ActivityStatus] ??
                        act.status;
                      return (
                        <li
                          key={act.id}
                          className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                        >
                          <span className="text-sm text-gray-900 truncate flex-1 min-w-0">
                            {act.name}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge
                              variant="secondary"
                              className="text-xs font-normal"
                            >
                              {statusLabel}
                            </Badge>
                            {fueraDePlazo && (
                              <Badge
                                variant="destructive"
                                className="text-xs bg-red-100 text-red-800 border-red-200"
                              >
                                Fuera de plazo
                              </Badge>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 6. Seguimiento (Reuniones, Oportunidades y amenazas, Compromisos) */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden w-full">
              <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 flex items-center space-x-2.5 border-b border-gray-200">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Seguimiento
                </h3>
              </div>
              <CardContent className="p-4 space-y-4">
                {loadingSeguimiento ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        Reuniones
                      </h4>
                      {reuniones.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">
                          No hay reuniones registradas
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {reuniones.map((r) => (
                            <li
                              key={r.id}
                              className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                            >
                              <span className="text-sm text-gray-900">
                                {formatFechaCorta(r.fecha)}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => handleReunionDetails(r.id)}
                              >
                                Detalles
                              </Button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-emerald-600" />
                        Oportunidades y amenazas
                      </h4>
                      {oportunidadesAmenazas.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">
                          No hay oportunidades ni amenazas
                        </p>
                      ) : (
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-100">
                                <TableHead className="font-semibold">
                                  Tipo - Nombre
                                </TableHead>
                                <TableHead className="font-semibold">
                                  Plan de acción
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {oportunidadesAmenazas.map((oa) => {
                                const abordado = Boolean(
                                  oa.planDeAccion?.trim()
                                );
                                return (
                                  <TableRow
                                    key={oa.id}
                                    className="odd:bg-gray-50/50"
                                  >
                                    <TableCell className="text-sm">
                                      {oa.tipo} - {oa.nombre}
                                    </TableCell>
                                    <TableCell>
                                      <span
                                        className={`text-sm font-medium ${abordado ? 'text-green-600 bg-green-100 px-2 py-0.5 rounded' : 'text-red-600 bg-red-100 px-2 py-0.5 rounded'}`}
                                      >
                                        {abordado ? 'Abordado' : 'Pendiente'}
                                      </span>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-emerald-600" />
                        Compromisos asignados
                      </h4>
                      {compromisos.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">
                          No hay compromisos
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {compromisos.map((c) => {
                            const titulo =
                              c.titulo ??
                              c.descripcion?.substring(0, 60) ??
                              'Sin título';
                            return (
                              <li
                                key={c.id}
                                className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                              >
                                <span className="text-sm text-gray-900 truncate flex-1 min-w-0">
                                  {titulo}
                                  {titulo.length >= 60 ? '…' : ''}
                                </span>
                                <Badge
                                  variant={
                                    c.completado ? 'default' : 'secondary'
                                  }
                                  className={
                                    c.completado
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                      : 'bg-gray-200 text-gray-700'
                                  }
                                >
                                  {c.completado ? 'Realizado' : 'Pendiente'}
                                </Badge>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* 7. Últimas 10 actualizaciones */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden w-full">
              <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 flex items-center space-x-2.5 border-b border-gray-200">
                <History className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Últimas 10 actualizaciones
                </h3>
              </div>
              <CardContent className="p-4">
                {historial.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">
                    No hay registros en el historial
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {historial.map((entry) => (
                      <li
                        key={entry.id}
                        className="text-sm text-gray-700 py-1.5 px-2 rounded bg-gray-50 border border-gray-100"
                      >
                        {formatHistorialEntry(entry)}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <ReunionModal
        reunionId={selectedReunionId}
        projectId={projectId}
        open={reunionModalOpen}
        onOpenChange={handleReunionModalClose}
        onUpdated={onReunionUpdated ?? (() => {})}
      />
    </div>
  );
}
