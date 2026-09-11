'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HandCoins, GitBranch, MapPin, GraduationCap, Users, Target } from 'lucide-react';
import {
  GanttTab,
  IndicadoresTab,
  PresupuestoTab,
  HistorialTab,
  SeguimientoTab,
} from '@/app/proyectos/tabs/ProyectoTabs';
import { GeneralTab, GeneralTabHeader } from '@/app/proyectos/tabs/GeneralTab';
import { ParticipantesTab } from '@/app/proyectos/tabs/ParticipantesTab';
import { EscalamientoTab } from '@/app/proyectos/tabs/EscalamientoTab';
import { IgipTrlTab } from '@/app/proyectos/tabs/IgipTrlTab';
import { useGeneralTab } from '@/app/proyectos/tabs/useGeneralTab';
import {
  mergeDesarrolloTecnicoIntoProject,
  proyectoNeedsDesarrolloTecnicoFetch,
  setProyectoBaseCache,
  useFetchProyectoDesarrolloTecnico,
  useFetchProyectoParticipantes,
} from '@/hooks/useProyectoQuery';
import { useQueryClient } from '@tanstack/react-query';
import {
  visiblePublicProjectNavTabs,
  type LineaModuloCatalogItem,
} from '@/lib/linea-modulos';
import { cn } from '@/lib/utils';
import type { ProyectoWithRelations } from '@/types/proyecto';
import { PublicProjectViewProvider } from '@/components/proyectos/PublicProjectViewContext';

type ProyectoTab =
  | 'Convenio'
  | 'Resumen'
  | 'General'
  | 'Participantes'
  | 'Gantt'
  | 'Indicadores'
  | 'IgipTrl'
  | 'Presupuesto'
  | 'Historial'
  | 'Seguimiento'
  | 'Escalamiento';

const PROJECT_NAV_TABS: { id: ProyectoTab; label: string }[] = [
  { id: 'Convenio', label: 'Convenio' },
  { id: 'General', label: 'General' },
  { id: 'Participantes', label: 'Participantes' },
  { id: 'Gantt', label: 'Actividades' },
  { id: 'Indicadores', label: 'Indicadores' },
  { id: 'IgipTrl', label: 'IGIP-TRL' },
  { id: 'Presupuesto', label: 'Presupuesto' },
  { id: 'Seguimiento', label: 'Seguimiento' },
  { id: 'Historial', label: 'Historial' },
  { id: 'Escalamiento', label: 'Escalamiento' },
];

export function ProyectoPublicoFicha({
  initialProyecto,
  catalog,
}: {
  initialProyecto: ProyectoWithRelations;
  catalog: LineaModuloCatalogItem[];
}) {
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] =
    useState<ProyectoWithRelations | null>(initialProyecto);
  const [selectedTab, setSelectedTab] = useState<ProyectoTab>('General');
  const [mountedTabs, setMountedTabs] = useState<Set<ProyectoTab>>(
    () => new Set(['General'])
  );
  const [projectVideos, setProjectVideos] = useState<Record<string, string>>(
    {}
  );
  const fetchDt = useFetchProyectoDesarrolloTecnico();
  const fetchParticipantes = useFetchProyectoParticipantes();

  const setProject = useCallback(
    (update: React.SetStateAction<ProyectoWithRelations | null>) => {
      setSelectedProject((prev) => {
        const next = typeof update === 'function' ? update(prev) : update;
        if (next) setProyectoBaseCache(queryClient, next);
        return next;
      });
    },
    [queryClient]
  );

  const general = useGeneralTab({
    project: selectedProject,
    setProject,
    selectedTab,
    projectVideos,
    setProjectVideos,
    onSaveSuccess: () => undefined,
  });

  useEffect(() => {
    const id = selectedProject?.id;
    if (!id || !proyectoNeedsDesarrolloTecnicoFetch(selectedProject)) return;
    void fetchDt(id).then((dt) => {
      setProject((prev) =>
        prev ? mergeDesarrolloTecnicoIntoProject(prev, dt) : prev
      );
    });
  }, [fetchDt, selectedProject, setProject]);

  useEffect(() => {
    const id = selectedProject?.id;
    if (!id || selectedProject?.participantes_rel) return;
    void fetchParticipantes(id).then((rows) => {
      setProject((prev) =>
        prev
          ? {
              ...prev,
              participantes_rel: rows,
              participantes: rows.length,
            }
          : prev
      );
    });
  }, [fetchParticipantes, selectedProject, setProject]);

  useEffect(() => {
    setMountedTabs((prev) => {
      if (prev.has(selectedTab)) return prev;
      const next = new Set(prev);
      next.add(selectedTab);
      return next;
    });
  }, [selectedTab]);

  const visibleProjectTabs = useMemo(
    () =>
      visiblePublicProjectNavTabs(
        PROJECT_NAV_TABS,
        selectedProject?.fondo,
        selectedProject?.linea,
        catalog
      ),
    [catalog, selectedProject?.fondo, selectedProject?.linea]
  );
  const visibleTabIds = useMemo(
    () => new Set(visibleProjectTabs.map((tab) => tab.id)),
    [visibleProjectTabs]
  );

  useEffect(() => {
    if (!visibleTabIds.has(selectedTab)) setSelectedTab('General');
  }, [selectedTab, visibleTabIds]);

  if (!selectedProject) return null;

  const sedeNames = (selectedProject.sede ?? '')
    .split(/\s*\|\s*|\s*,\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
  const escuelaNames =
    selectedProject.escuelas?.map((e) => e.escuela.nombre) ?? [];

  return (
    <PublicProjectViewProvider>
      <div
        data-public-readonly="true"
        className="flex h-full min-h-0 flex-col overflow-hidden px-6 py-4 sm:px-8"
      >
        <nav
          aria-label="Secciones del proyecto"
          className="mb-2 flex-shrink-0 overflow-x-auto"
        >
          <div className="mx-auto flex min-w-max items-stretch justify-center gap-1 px-2 sm:gap-2">
            {visibleProjectTabs.map((tab) => {
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTab(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative whitespace-nowrap px-3 text-[13px] tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm py-2 transition-colors',
                    isActive
                      ? 'font-medium text-gray-900'
                      : 'font-normal text-gray-500 hover:text-gray-800'
                  )}
                >
                  {tab.label}
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-x-2.5 bottom-0 h-0.5 rounded-full transition-colors',
                      isActive
                        ? 'bg-emerald-600'
                        : 'bg-transparent group-hover:bg-gray-300'
                    )}
                  />
                </button>
              );
            })}
          </div>
        </nav>

        <div className="flex-shrink-0">
          <div className="flex min-w-0 flex-col gap-[5px]">
            <div className="relative flex items-center justify-center overflow-visible">
              <GeneralTabHeader
                project={selectedProject}
                selectedTab={selectedTab}
                editingField={general.editingField}
                generalDraft={general.generalDraft}
                setGeneralDraft={general.setGeneralDraft}
                isGeneralSaving={general.isGeneralSaving}
                handleStartEditField={general.handleStartEditField}
                handleSaveGeneralTab={general.handleSaveGeneralTab}
                handleCancelGeneralEdit={general.handleCancelGeneralEdit}
              />
            </div>
            {selectedTab !== 'Presupuesto' && (
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-[13px] font-normal tracking-wide text-gray-500">
                  <HandCoins className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {selectedProject.fondo || '—'}
                </span>
                {selectedProject.linea ? (
                  <>
                    <span aria-hidden className="select-none text-gray-300">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-normal tracking-wide text-gray-500">
                      <GitBranch className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {selectedProject.linea}
                    </span>
                  </>
                ) : null}
                {sedeNames.length > 0 && (
                  <>
                    <span aria-hidden className="select-none text-gray-300">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-normal tracking-wide text-gray-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {sedeNames.join(' · ')}
                    </span>
                  </>
                )}
                {escuelaNames.length > 0 && (
                  <>
                    <span aria-hidden className="select-none text-gray-300">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-normal tracking-wide text-gray-500">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      {escuelaNames.join(' · ')}
                    </span>
                  </>
                )}
                <span aria-hidden className="select-none text-gray-300">
                  ·
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13px] font-normal tracking-wide text-gray-500">
                  <Users className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {selectedProject.participantes_rel?.length ??
                    selectedProject.participantes ??
                    0}{' '}
                  participantes
                </span>
                {selectedProject.focalizacion ? (
                  <>
                    <span aria-hidden className="select-none text-gray-300">
                      ·
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[13px] font-normal tracking-wide text-gray-500">
                      <Target className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                      Foco {selectedProject.focalizacion}
                    </span>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex-1 overflow-hidden">
          {mountedTabs.has('General') && (
            <div className={selectedTab === 'General' ? 'h-full' : 'hidden'}>
              <GeneralTab
                project={selectedProject}
                setProject={setProject}
                onSaveSuccess={() => undefined}
                projectVideos={projectVideos}
                editingField={general.editingField}
                generalDraft={general.generalDraft}
                setGeneralDraft={general.setGeneralDraft}
                catalogosGeneral={general.catalogosGeneral}
                catalogosLoading={general.catalogosLoading}
                tempVideoUrl={general.tempVideoUrl}
                setTempVideoUrl={general.setTempVideoUrl}
                isGeneralSaving={general.isGeneralSaving}
                handleStartEditField={general.handleStartEditField}
                handleSaveGeneralTab={general.handleSaveGeneralTab}
                handleCancelGeneralEdit={general.handleCancelGeneralEdit}
              />
            </div>
          )}
          {visibleTabIds.has('Participantes') &&
            mountedTabs.has('Participantes') && (
              <div
                className={
                  selectedTab === 'Participantes' ? 'h-full' : 'hidden'
                }
              >
                <ParticipantesTab
                  project={selectedProject}
                  setProject={setProject}
                  selectedTab={selectedTab}
                  onSaveSuccess={() => undefined}
                />
              </div>
            )}
          {visibleTabIds.has('Gantt') && mountedTabs.has('Gantt') && (
            <div
              className={
                selectedTab === 'Gantt'
                  ? 'h-full min-h-0 overflow-hidden'
                  : 'hidden'
              }
            >
              <GanttTab
                project={selectedProject}
                onProjectChange={() => undefined}
                topLoaderEnabled={selectedTab === 'Gantt'}
              />
            </div>
          )}
          {visibleTabIds.has('Indicadores') &&
            mountedTabs.has('Indicadores') && (
              <div
                className={
                  selectedTab === 'Indicadores'
                    ? 'h-full min-h-0 overflow-hidden'
                    : 'hidden'
                }
              >
                <IndicadoresTab
                  project={selectedProject}
                  topLoaderEnabled={selectedTab === 'Indicadores'}
                />
              </div>
            )}
          {visibleTabIds.has('IgipTrl') && mountedTabs.has('IgipTrl') && (
            <div
              className={
                selectedTab === 'IgipTrl'
                  ? 'h-full min-h-0 overflow-hidden'
                  : 'hidden'
              }
            >
              <IgipTrlTab
                projectId={selectedProject.id}
                topLoaderEnabled={selectedTab === 'IgipTrl'}
              />
            </div>
          )}
          {visibleTabIds.has('Presupuesto') &&
            mountedTabs.has('Presupuesto') && (
              <div
                className={selectedTab === 'Presupuesto' ? 'h-full' : 'hidden'}
              >
                <PresupuestoTab
                  project={selectedProject}
                  setProject={setProject}
                  topLoaderEnabled={selectedTab === 'Presupuesto'}
                />
              </div>
            )}
          {mountedTabs.has('Historial') && (
            <div className={selectedTab === 'Historial' ? 'h-full' : 'hidden'}>
              <HistorialTab
                projectId={selectedProject.id}
                topLoaderEnabled={selectedTab === 'Historial'}
              />
            </div>
          )}
          {visibleTabIds.has('Seguimiento') &&
            mountedTabs.has('Seguimiento') && (
              <div
                className={selectedTab === 'Seguimiento' ? 'h-full' : 'hidden'}
              >
                <SeguimientoTab
                  project={selectedProject}
                  rolEnProyecto={null}
                  activeRole={null}
                  topLoaderEnabled={selectedTab === 'Seguimiento'}
                />
              </div>
            )}
          {visibleTabIds.has('Escalamiento') &&
            mountedTabs.has('Escalamiento') && (
              <div
                className={
                  selectedTab === 'Escalamiento' ? 'h-full' : 'hidden'
                }
              >
                <EscalamientoTab projectId={selectedProject.id} />
              </div>
            )}
        </div>
      </div>
    </PublicProjectViewProvider>
  );
}
