'use client';

import dynamic from 'next/dynamic';
import { ResumenProyectoCard } from '@/components/proyectos/ResumenProyectoCard';
import type { ProyectoWithRelations } from '@/types/proyecto';

const GanttChart = dynamic(() => import('@/components/proyectos/GanttChart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      Cargando Gantt...
    </div>
  ),
});

const PresupuestoCard = dynamic(
  () =>
    import('@/components/proyectos/PresupuestoCard').then((m) => ({
      default: m.PresupuestoCard,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Cargando presupuesto...
      </div>
    ),
  }
);

const IndicadoresCard = dynamic(
  () =>
    import('@/components/proyectos/IndicadoresCard').then((m) => ({
      default: m.IndicadoresCard,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Cargando indicadores...
      </div>
    ),
  }
);

const HistorialCard = dynamic(
  () =>
    import('@/components/proyectos/HistorialCard').then((m) => ({
      default: m.HistorialCard,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Cargando historial...
      </div>
    ),
  }
);

const SeguimientoCard = dynamic(
  () =>
    import('@/components/seguimiento/SeguimientoCard').then((m) => ({
      default: m.SeguimientoCard,
    })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Cargando seguimiento...
      </div>
    ),
  }
);

export function ResumenTab({
  project,
}: {
  project: ProyectoWithRelations;
}) {
  return (
    <div className="h-full overflow-hidden pt-4">
      <ResumenProyectoCard
        projectId={project.id}
        project={project}
        presupuestoTotal={project.presupuestoTotal ?? 0}
        presupuestoAdjudicado={project.presupuestoAdjudicado ?? 0}
        initialActivities={project.activities}
      />
    </div>
  );
}

export function GanttTab({
  project,
  onProjectChange,
}: {
  project: ProyectoWithRelations;
  onProjectChange: () => void;
}) {
  return (
    <div className="h-full pt-2">
      <GanttChart
        projectId={project.id}
        projectName={project.proyecto}
        onProjectChange={onProjectChange}
        initialActivities={project.activities}
      />
    </div>
  );
}

export function IndicadoresTab({
  projectId,
}: {
  projectId: string;
}) {
  return (
    <div className="h-full pt-2 overflow-x-hidden">
      <IndicadoresCard projectId={projectId} />
    </div>
  );
}

export function PresupuestoTab({
  project,
}: {
  project: ProyectoWithRelations;
}) {
  return (
    <div className="h-full pt-2">
      <PresupuestoCard
        projectId={project.id}
        presupuestoTotal={project.presupuestoTotal ?? 0}
        presupuestoAdjudicado={project.presupuestoAdjudicado ?? 0}
        projectName={project.proyecto}
      />
    </div>
  );
}

export function HistorialTab({ projectId }: { projectId: string }) {
  return (
    <div className="h-full pt-4">
      <HistorialCard projectId={projectId} />
    </div>
  );
}

export function SeguimientoTab({
  project,
  rolEnProyecto,
  activeRole,
}: {
  project: ProyectoWithRelations;
  rolEnProyecto: string | null;
  activeRole: string | null;
}) {
  return (
    <div className="h-full pt-4">
      <SeguimientoCard
        projectId={project.id}
        projectName={project.proyecto}
        rolEnProyecto={rolEnProyecto}
        activeRole={activeRole}
      />
    </div>
  );
}

export { GeneralTab, GeneralTabHeader } from './GeneralTab';
export { ParticipantesTab } from './ParticipantesTab';
