'use client';

import { useMemo } from 'react';
import {
  FolderKanban,
  Users,
  LineChart,
  Target,
  DollarSign,
  Building2,
  GraduationCap,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { MetricChip } from '@/components/dashboard/MetricChip';
import { SectionPanel } from '@/components/dashboard/SectionPanel';
import { DistributionList } from '@/components/dashboard/DistributionList';
import { SimpleDonutChart } from '@/components/dashboard/SimpleDonutChart';
import {
  type Project,
  computePortfolioMetrics,
  countByFondo,
  countBySede,
  countByEscuela,
  countByFocalizacion,
  formatPresupuesto,
} from '@/app/dashboard/dashboard-metrics';

type MiradaGeneralTabProps = {
  proyectos: Project[];
};

const distributionPanelClass = 'min-h-0 flex flex-col';
const distributionBodyClass = 'max-h-[16rem] overflow-y-auto custom-scrollbar';

export function MiradaGeneralTab({ proyectos }: MiradaGeneralTabProps) {
  const metrics = useMemo(
    () => computePortfolioMetrics(proyectos),
    [proyectos]
  );

  const porFondo = useMemo(() => countByFondo(proyectos), [proyectos]);
  const porSede = useMemo(() => countBySede(proyectos), [proyectos]);
  const porEscuela = useMemo(() => countByEscuela(proyectos), [proyectos]);
  const porFocalizacion = useMemo(
    () => countByFocalizacion(proyectos),
    [proyectos]
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto overscroll-contain custom-scrollbar">
      {/* KPI strip — fixed */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5">
        <MetricChip
          label="Total proyectos"
          value={metrics.totalProyectos}
          icon={FolderKanban}
        />
        <MetricChip
          label="Terminados"
          value={metrics.terminados}
          icon={CheckCircle2}
        />
        <MetricChip
          label="En ejecución"
          value={metrics.enEjecucion}
          icon={Clock}
        />
        <MetricChip
          label="Atrasados"
          value={metrics.atrasados}
          icon={AlertTriangle}
        />
        <MetricChip
          label="Participantes"
          value={metrics.totalParticipantes}
          icon={Users}
        />
      </div>

      {/* Roles breakdown — fixed */}
      <SectionPanel
        className="shrink-0"
        title="Participantes por rol"
        icon={Users}
      >
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {metrics.desgloseRoles.map(({ rol, cantidad }) => (
            <div key={rol} className="min-w-[5.5rem]">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
                {rol}
              </p>
              <p className="text-[18px] font-semibold tabular-nums text-gray-800">
                {cantidad}
              </p>
            </div>
          ))}
        </div>
      </SectionPanel>

      {/* Progress macro — fixed */}
      <div className="shrink-0 grid gap-4 md:grid-cols-3">
        <SectionPanel title="Avance Gantt promedio" icon={LineChart}>
          <p className="text-[28px] font-semibold tabular-nums text-gray-800 leading-none mb-3">
            {metrics.avanceGanttProm}%
          </p>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${metrics.avanceGanttProm}%` }}
            />
          </div>
        </SectionPanel>

        <SectionPanel title="Avance de indicadores" icon={Target}>
          <p className="text-[28px] font-semibold tabular-nums text-gray-800 leading-none mb-3">
            {metrics.indicadoresProm}%
          </p>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${metrics.indicadoresProm}%` }}
            />
          </div>
        </SectionPanel>

        <SectionPanel title="Presupuesto usado" icon={DollarSign}>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-[28px] font-semibold tabular-nums text-gray-800 leading-none">
              {formatPresupuesto(metrics.presupuestoUsado)}
            </span>
            <span className="text-[13px] text-gray-400">
              de {formatPresupuesto(metrics.presupuestoTotal)}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{
                width: `${Math.min(100, metrics.presupuestoPercent)}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            {metrics.presupuestoPercent}% avance (promedio)
          </p>
        </SectionPanel>
      </div>

      {/* Portfolio distribution */}
      <div className="shrink-0 flex flex-col gap-3">
        <p className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-gray-400">
          Distribución del portafolio
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SectionPanel
            title="Por fondo"
            icon={DollarSign}
            className={distributionPanelClass}
            bodyClassName={distributionBodyClass}
          >
            <DistributionList data={porFondo} barMode="ofMax" />
          </SectionPanel>
          <SectionPanel
            title="Por sede"
            icon={Building2}
            className={distributionPanelClass}
            bodyClassName={distributionBodyClass}
          >
            <DistributionList data={porSede} barMode="ofMax" />
          </SectionPanel>
          <SectionPanel
            title="Por escuela"
            icon={GraduationCap}
            className={distributionPanelClass}
            bodyClassName={distributionBodyClass}
          >
            <DistributionList data={porEscuela} barMode="ofMax" />
          </SectionPanel>
          <SectionPanel
            title="Por focalización"
            icon={BarChart3}
            className={distributionPanelClass}
            bodyClassName={distributionBodyClass}
          >
            <SimpleDonutChart data={porFocalizacion} size={130} />
          </SectionPanel>
        </div>
        <p className="shrink-0 text-[11px] text-gray-400">
          Un proyecto puede figurar en más de una categoría (sede u escuela). El
          porcentaje es sobre el total de proyectos.
        </p>
      </div>
    </div>
  );
}
