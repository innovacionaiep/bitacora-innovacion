'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import dynamic from 'next/dynamic';
import { useQueryClient } from '@tanstack/react-query';
import { FileSpreadsheet } from 'lucide-react';
import { ImportExcelDialog } from '@/components/proyectos/ImportExcelDialog';
import { Button } from '@/components/ui/button';
import { useCanProjectImport } from '@/hooks/useCanProjectImport';
import { proyectoActivitiesKey } from '@/lib/query-keys';
import type { ProyectoWithRelations } from '@/types/proyecto';

function DynamicTabFallback() {
  return <div className="h-full min-h-[120px]" />;
}

const ResumenProyectoCard = dynamic(
  () =>
    import('@/components/proyectos/ResumenProyectoCard').then((m) => ({
      default: m.ResumenProyectoCard,
    })),
  {
    loading: () => <DynamicTabFallback />,
  }
);

const GanttChart = dynamic(() => import('@/components/proyectos/GanttChart'), {
  ssr: false,
  loading: () => <DynamicTabFallback />,
});

const PresupuestoCard = dynamic(
  () =>
    import('@/components/proyectos/PresupuestoCard').then((m) => ({
      default: m.PresupuestoCard,
    })),
  {
    loading: () => <DynamicTabFallback />,
  }
);

const IndicadoresCard = dynamic(
  () =>
    import('@/components/proyectos/IndicadoresCard').then((m) => ({
      default: m.IndicadoresCard,
    })),
  {
    loading: () => <DynamicTabFallback />,
  }
);

const HistorialCard = dynamic(
  () =>
    import('@/components/proyectos/HistorialCard').then((m) => ({
      default: m.HistorialCard,
    })),
  {
    loading: () => <DynamicTabFallback />,
  }
);

const SeguimientoCard = dynamic(
  () =>
    import('@/components/seguimiento/SeguimientoCard').then((m) => ({
      default: m.SeguimientoCard,
    })),
  {
    loading: () => <DynamicTabFallback />,
  }
);

function ImportToolbarButton({
  onClick,
  label = 'Carga masiva',
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="h-9 rounded-md border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-blue-700 gap-1.5 px-3"
    >
      <FileSpreadsheet className="h-3.5 w-3.5" />
      <span className="text-[13px] font-medium tracking-wide">{label}</span>
    </Button>
  );
}

export function ResumenTab({
  project,
  topLoaderEnabled = true,
  onParticipantesLoaded,
}: {
  project: ProyectoWithRelations;
  topLoaderEnabled?: boolean;
  onParticipantesLoaded?: (
    participantes: NonNullable<ProyectoWithRelations['participantes_rel']>
  ) => void;
}) {
  return (
    <div className="h-full overflow-hidden pt-4">
      <ResumenProyectoCard
        projectId={project.id}
        project={project}
        presupuestoTotal={project.presupuestoTotal ?? 0}
        presupuestoAdjudicado={project.presupuestoAdjudicado ?? 0}
        initialActivities={project.activities}
        topLoaderEnabled={topLoaderEnabled}
        onParticipantesLoaded={onParticipantesLoaded}
      />
    </div>
  );
}

export function GanttTab({
  project,
  onProjectChange,
  topLoaderEnabled = true,
}: {
  project: ProyectoWithRelations;
  onProjectChange: () => void;
  topLoaderEnabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canImport = useCanProjectImport(
    'projects.import_actividades',
    project
  );

  return (
    <div className="h-full pt-2 flex flex-col min-h-0">
      <div className="flex-1 min-h-0">
        <GanttChart
          key={refreshKey}
          projectId={project.id}
          projectName={project.proyecto}
          onProjectChange={onProjectChange}
          initialActivities={
            refreshKey === 0 ? project.activities : undefined
          }
          topLoaderEnabled={topLoaderEnabled}
          footerLeft={
            canImport ? (
              <ImportToolbarButton onClick={() => setImportOpen(true)} />
            ) : undefined
          }
        />
      </div>
      <ImportExcelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tipo="actividades"
        proyectoId={project.id}
        onSuccess={() => {
          void queryClient.invalidateQueries({
            queryKey: proyectoActivitiesKey(project.id),
          });
          queryClient.removeQueries({
            queryKey: proyectoActivitiesKey(project.id),
          });
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

export function IndicadoresTab({
  project,
  topLoaderEnabled = true,
}: {
  project: ProyectoWithRelations;
  topLoaderEnabled?: boolean;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canImport = useCanProjectImport(
    'projects.import_indicadores',
    project
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pt-2">
      <div className="min-h-0 flex-1 overflow-hidden">
        <IndicadoresCard
          key={refreshKey}
          projectId={project.id}
          topLoaderEnabled={topLoaderEnabled}
          canImport={canImport}
          onCargaMasiva={() => setImportOpen(true)}
        />
      </div>
      <ImportExcelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tipo="indicadores"
        proyectoId={project.id}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

export function PresupuestoTab({
  project,
  setProject,
  topLoaderEnabled = true,
}: {
  project: ProyectoWithRelations;
  setProject?: Dispatch<SetStateAction<ProyectoWithRelations | null>>;
  topLoaderEnabled?: boolean;
}) {
  const [importOpen, setImportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const canImport = useCanProjectImport(
    'projects.import_presupuesto',
    project
  );

  return (
    <div className="h-full pt-2 flex flex-col min-h-0">
      <div className="flex-1 min-h-0">
        <PresupuestoCard
          key={refreshKey}
          projectId={project.id}
          presupuestoTotal={project.presupuestoTotal ?? 0}
          presupuestoAdjudicado={project.presupuestoAdjudicado ?? 0}
          projectName={project.proyecto}
          topLoaderEnabled={topLoaderEnabled}
          canImport={canImport}
          onCargaMasiva={() => setImportOpen(true)}
          onPresupuestoAdjudicadoChange={(monto) => {
            setProject?.((prev) =>
              prev && prev.id === project.id
                ? { ...prev, presupuestoAdjudicado: monto }
                : prev
            );
          }}
        />
      </div>
      <ImportExcelDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        tipo="presupuesto"
        proyectoId={project.id}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

export function HistorialTab({
  projectId,
  topLoaderEnabled = true,
}: {
  projectId: string;
  topLoaderEnabled?: boolean;
}) {
  return (
    <div className="h-full pt-4">
      <HistorialCard
        projectId={projectId}
        topLoaderEnabled={topLoaderEnabled}
      />
    </div>
  );
}

export function SeguimientoTab({
  project,
  rolEnProyecto,
  activeRole,
  topLoaderEnabled = true,
}: {
  project: ProyectoWithRelations;
  rolEnProyecto: string | null;
  activeRole: string | null;
  topLoaderEnabled?: boolean;
}) {
  return (
    <div className="h-full pt-4">
      <SeguimientoCard
        projectId={project.id}
        projectName={project.proyecto}
        rolEnProyecto={rolEnProyecto}
        activeRole={activeRole}
        topLoaderEnabled={topLoaderEnabled}
      />
    </div>
  );
}

export { GeneralTab, GeneralTabHeader } from './GeneralTab';
export { ParticipantesTab } from './ParticipantesTab';
