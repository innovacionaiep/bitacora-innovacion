'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  ListTodo,
  History,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { SimpleBarChart } from '@/components/dashboard/SimpleBarChart';
import type { ProyectoWithRelations } from '@/types/proyecto';
import type { CuentaPresupuesto } from '@/types/presupuesto';
import { ActivityStatus } from '@prisma/client';
import {
  getResumenTabData,
  type ResumenTabData,
} from '@/lib/actions/resumen-tab';
import {
  compromisosKey,
  historialKey,
  indicadoresKey,
  presupuestoKey,
  proyectoActivitiesKey,
  proyectoParticipantesKey,
  resumenTabKey,
} from '@/lib/query-keys';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';
import { historialASegmentos } from '@/lib/historial-mensaje';

const CUENTA_LABEL: Record<CuentaPresupuesto, string> = {
  RRHH: 'RRHH',
  OPERACION: 'Operación',
  INVERSION: 'Inversión',
};

const ACTIVITY_STATUS_LABEL: Record<ActivityStatus, string> = {
  TODO: 'Por hacer',
  WAITING: 'En espera',
  IN_PROGRESS: 'En progreso',
  DONE: 'Finalizada',
};

const ACTIVITY_STATUS_BADGE: Record<
  ActivityStatus,
  { className: string }
> = {
  DONE: {
    className: 'text-xs bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  TODO: {
    className: 'text-xs bg-gray-100 text-gray-700 border-gray-200',
  },
  IN_PROGRESS: {
    className: 'text-xs bg-blue-100 text-blue-800 border-blue-200',
  },
  WAITING: {
    className: 'text-xs bg-amber-100 text-amber-800 border-amber-200',
  },
};

function seedResumenCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
  data: ResumenTabData
) {
  queryClient.setQueryData(proyectoActivitiesKey(projectId), data.activities);
  queryClient.setQueryData(indicadoresKey(projectId), data.indicadores);
  queryClient.setQueryData(presupuestoKey(projectId), data.presupuestoItems);
  queryClient.setQueryData(compromisosKey(projectId), data.compromisos);
  queryClient.setQueryData(
    historialKey(projectId, { limit: '10' }),
    data.historial
  );
  queryClient.setQueryData(
    proyectoParticipantesKey(projectId),
    data.participantes
  );
}

function calcIndicadoresProgress(data: ResumenTabData['indicadores']): number {
  if (!data || data.objetivosGenerales.length === 0) return 0;
  const allIndicators = data.objetivosGenerales.flatMap((og) =>
    og.objetivosEspecificos.flatMap((oe) => oe.indicadores)
  );
  if (allIndicators.length === 0) return 0;
  const totalProgress = allIndicators.reduce(
    (sum, indicator) => sum + indicator.porcentajeAvance,
    0
  );
  return Math.round(totalProgress / allIndicators.length);
}

interface ResumenProyectoCardProps {
  projectId: string;
  project: ProyectoWithRelations;
  presupuestoTotal?: number;
  presupuestoAdjudicado?: number;
  initialActivities?: ProyectoWithRelations['activities'];
  topLoaderEnabled?: boolean;
  onParticipantesLoaded?: (
    participantes: NonNullable<ProyectoWithRelations['participantes_rel']>
  ) => void;
}

export function ResumenProyectoCard({
  projectId,
  project,
  topLoaderEnabled = true,
  onParticipantesLoaded,
}: ResumenProyectoCardProps) {
  const queryClient = useQueryClient();

  const resumenQuery = useQuery({
    queryKey: resumenTabKey(projectId),
    queryFn: async () => {
      const result = await getResumenTabData(projectId);
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'Error al cargar resumen');
      }
      seedResumenCaches(queryClient, projectId, result.data);
      return result.data;
    },
    enabled: !!projectId,
    staleTime: 60_000,
  });

  const data = resumenQuery.data;
  const activities = data?.activities ?? [];
  const dataIndicadores = data?.indicadores ?? null;
  const resumenPresupuesto = data?.resumenPresupuesto;
  const compromisos = data?.compromisos ?? [];
  const historial = data?.historial ?? [];
  const participantes =
    data?.participantes ?? project.participantes_rel ?? [];

  useEffect(() => {
    if (!data?.participantes || !onParticipantesLoaded) return;
    onParticipantesLoaded(data.participantes);
  }, [data?.participantes, onParticipantesLoaded]);

  const loading = resumenQuery.isLoading && !resumenQuery.data;
  usePageTopLoader(loading, {
    completeOnReady: true,
    enabled: topLoaderEnabled,
  });

  const pctActividades = useMemo(() => {
    if (!activities.length) return 0;
    const sum = activities.reduce((s, a) => s + a.progress, 0);
    return Math.round(sum / activities.length);
  }, [activities]);
  const pctIndicadores = useMemo(
    () => (dataIndicadores ? calcIndicadoresProgress(dataIndicadores) : 0),
    [dataIndicadores]
  );
  const pctPresupuesto = resumenPresupuesto?.pctGlobalAvance ?? 0;
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
  const encargados = participantes.filter((p) => p.rol === 'Encargado');
  const coordinadores = participantes.filter((p) => p.rol === 'Coordinador');

  const formatFechaCorta = (fecha: Date | string) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFechaHistorial = (fecha: Date | string) => {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    return d.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                {loading ? (
                  <div className="py-6" />
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
                {loading ? (
                  <div className="py-8" />
                ) : (
                  <div className="space-y-3">
                    {(project.presupuestoAdjudicado ?? 0) > 0 && (
                      <div className="flex items-center justify-between gap-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <span className="text-sm font-medium text-emerald-800">
                          Presupuesto adjudicado
                        </span>
                        <span className="text-sm font-bold text-emerald-900 tabular-nums">
                          ${(project.presupuestoAdjudicado ?? 0).toLocaleString('es-CL')}
                        </span>
                      </div>
                    )}
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
                            Ejecutado
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(resumenPresupuesto?.porCuenta ?? []).map((row) => (
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
                              ${row.montoEjecutado.toLocaleString('es-CL')}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-gray-100 font-semibold">
                          <TableCell className="text-sm">TOTALES</TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            $
                            {(resumenPresupuesto?.totalMonto ?? 0).toLocaleString(
                              'es-CL'
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            $
                            {(
                              resumenPresupuesto?.totalSolicitado ?? 0
                            ).toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            $
                            {(
                              resumenPresupuesto?.totalEjecutado ?? 0
                            ).toLocaleString('es-CL')}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                    </div>
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
                {loading ? (
                  <div className="py-8" />
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
                {loading ? (
                  <div className="py-8" />
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
                      const statusBadge =
                        ACTIVITY_STATUS_BADGE[act.status as ActivityStatus] ??
                        ACTIVITY_STATUS_BADGE.TODO;
                      const numEvidencias = act._count?.evidencias ?? 0;
                      const tieneEvidencias = numEvidencias > 0;
                      return (
                        <li
                          key={act.id}
                          className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-100"
                        >
                          <span className="text-sm text-gray-900 truncate flex-1 min-w-0">
                            {act.name}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                            <Badge
                              variant="secondary"
                              className={`font-normal border ${statusBadge.className}`}
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
                            <Badge
                              variant="secondary"
                              className={
                                tieneEvidencias
                                  ? 'text-xs font-normal border bg-sky-100 text-sky-800 border-sky-200'
                                  : 'text-xs font-normal border bg-slate-100 text-slate-600 border-slate-200'
                              }
                            >
                              {tieneEvidencias
                                ? `Evidencias (${numEvidencias})`
                                : 'Sin evidencias'}
                            </Badge>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* 6. Seguimiento (Compromisos) */}
            <Card className="border border-gray-200 shadow-sm overflow-hidden w-full">
              <div className="bg-gradient-to-r from-gray-200 to-white px-3 py-2 flex items-center space-x-2.5 border-b border-gray-200">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <h3 className="font-semibold text-gray-600 text-base uppercase tracking-wide">
                  Seguimiento
                </h3>
              </div>
              <CardContent className="p-4 space-y-4">
                {loading ? (
                  <div className="py-6" />
                ) : (
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
                  <p className="text-sm text-muted-foreground">
                    No hay actualizaciones recientes.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {historial.map((entry) => {
                      const persona =
                        entry.user?.name || entry.user?.email || 'Usuario';
                      const segmentos = historialASegmentos({
                        persona,
                        accion: entry.accion,
                        tabProyecto: entry.tabProyecto,
                        elementoEspecifico: entry.elementoEspecifico,
                        cambioGenerado: entry.cambioGenerado,
                      });
                      return (
                        <li
                          key={entry.id}
                          className="flex items-start gap-3 text-sm border-b border-border/50 pb-3 last:border-0 last:pb-0"
                        >
                          <img
                            src={DEFAULT_AVATAR}
                            alt={persona}
                            className="h-8 w-8 rounded-full flex-shrink-0 ring-2 ring-gray-200 object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-muted-foreground text-xs mb-0.5">
                              {formatFechaHistorial(entry.fecha)}
                            </p>
                            <p>
                              {segmentos.map((seg, i) => {
                                if (seg.role === 'persona' || seg.role === 'objeto') {
                                  return <strong key={i}>{seg.text}</strong>;
                                }
                                if (seg.role === 'verbo') {
                                  return (
                                    <span
                                      key={i}
                                      className="text-primary font-medium"
                                    >
                                      {seg.text}
                                    </span>
                                  );
                                }
                                if (seg.role === 'detalle') {
                                  return (
                                    <span
                                      key={i}
                                      className="text-muted-foreground"
                                    >
                                      {seg.text}
                                    </span>
                                  );
                                }
                                return <span key={i}>{seg.text}</span>;
                              })}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

    </div>
  );
}
