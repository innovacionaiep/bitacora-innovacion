'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useProyectos } from '@/hooks/useProyectos';
import { ProyectoConVariaciones } from '@/types/proyecto';
import { cn } from '@/lib/utils';
import { MiradaGeneralTab } from './tabs/MiradaGeneralTab';
import { ListaProyectosTab } from './tabs/ListaProyectosTab';
import { EscuelasSedesTab } from './tabs/EscuelasSedesTab';
import { ParticipantesDashboardTab } from './tabs/ParticipantesDashboardTab';
import { AvancesTab } from './tabs/AvancesTab';
import { ConveniosTab } from './tabs/ConveniosTab';

type DashboardPageProps = {
  initialProyectos?: ProyectoConVariaciones[];
};

const VIEWS = [
  { value: 'mirada-general', label: 'Mirada General' },
  { value: 'lista', label: 'Lista de Proyectos' },
  { value: 'analisis-escuela', label: 'Escuelas y Sedes' },
  { value: 'analisis-participantes', label: 'Participantes' },
  { value: 'analisis-avances', label: 'Avances' },
  { value: 'convenios', label: 'Convenios' },
] as const;

export default function DashboardPage({
  initialProyectos = [],
}: DashboardPageProps) {
  const { proyectos, loading, error } = useProyectos(
    initialProyectos.length > 0 ? initialProyectos : undefined
  );

  const [currentView, setCurrentView] =
    useState<(typeof VIEWS)[number]['value']>('mirada-general');

  if (loading) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center pt-6 pb-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 mx-auto mb-4" />
          <p className="text-[13px] text-gray-500">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center pt-6 pb-6">
        <div className="text-center">
          <p className="text-[13px] text-red-600 mb-4">
            Error al cargar los proyectos: {error}
          </p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            className="text-[13px] border-gray-200 shadow-none"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col overflow-hidden pt-6 pb-4 gap-5">
      <nav className="flex flex-wrap items-center gap-1 border-b border-gray-100 shrink-0">
        {VIEWS.map((view) => {
          const active = currentView === view.value;
          return (
            <button
              key={view.value}
              type="button"
              onClick={() => setCurrentView(view.value)}
              className={cn(
                'relative px-3 py-2.5 text-[13px] tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm',
                active
                  ? 'font-medium text-gray-900'
                  : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {view.label}
              {active ? (
                <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-emerald-600 rounded-full" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <div
        className={cn(
          'min-h-0 flex-1',
          currentView === 'analisis-participantes'
            ? 'flex flex-col overflow-hidden'
            : 'overflow-y-auto custom-scrollbar'
        )}
      >
        {currentView === 'mirada-general' && (
          <MiradaGeneralTab proyectos={proyectos} />
        )}
        {currentView === 'lista' && (
          <ListaProyectosTab proyectos={proyectos} />
        )}
        {currentView === 'analisis-escuela' && (
          <EscuelasSedesTab proyectos={proyectos} />
        )}
        {currentView === 'analisis-participantes' && (
          <ParticipantesDashboardTab proyectos={proyectos} />
        )}
        {currentView === 'analisis-avances' && (
          <AvancesTab proyectos={proyectos} />
        )}
        {currentView === 'convenios' && <ConveniosTab />}
      </div>
    </div>
  );
}
