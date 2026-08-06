'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FolderKanban, ExternalLink, Plus } from 'lucide-react';

export interface ProyectoConRol {
  id: string;
  proyecto: string;
  fondo: string;
  avanceGantt: number;
  avanceIndicadores?: number;
  avancePresupuesto?: number;
  rol: string;
}

export interface PortalMisProyectosProps {
  proyectos: ProyectoConRol[];
  loading?: boolean;
}

const PANEL_SHELL =
  'h-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-none overflow-hidden';
const PANEL_HEADER =
  'flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-gray-50/90 flex items-center justify-between gap-3';
const PANEL_TITLE =
  'text-[13px] font-medium tracking-wide text-gray-800 flex items-center gap-2';
const CTA_BUTTON =
  'h-8 shrink-0 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-emerald-700 gap-1.5 px-3 shadow-none';

function PanelHeader() {
  return (
    <div className={PANEL_HEADER}>
      <h3 className={PANEL_TITLE}>
        <FolderKanban className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
        Mis proyectos
      </h3>
      <Button variant="outline" size="sm" asChild className={CTA_BUTTON}>
        <Link href="/proyectos/nuevo" className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-wide">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Crear proyecto</span>
        </Link>
      </Button>
    </div>
  );
}

export function PortalMisProyectos({
  proyectos,
  loading = false,
}: PortalMisProyectosProps) {
  if (loading) {
    return (
      <div className={PANEL_SHELL}>
        <PanelHeader />
        <div className="flex-1 min-h-[80px]" />
      </div>
    );
  }

  if (proyectos.length === 0) {
    return (
      <div className={PANEL_SHELL}>
        <PanelHeader />
        <div className="flex-1 flex items-center px-5 py-4">
          <p className="text-[13px] text-gray-400">
            No participas en ningún proyecto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={PANEL_SHELL}>
      <PanelHeader />
      <div className="flex-1 min-h-0 overflow-auto w-full">
        <div className="flex items-center gap-3 w-full px-5 py-2 border-b border-gray-100 bg-gray-50/50 text-[11px] font-medium tracking-wide text-gray-600 shrink-0 sticky top-0 z-[1]">
          <span className="w-12 shrink-0" aria-hidden />
          <span className="flex-1 min-w-0 text-center whitespace-nowrap overflow-visible">Proyecto</span>
          <span className="shrink-0 min-w-20 text-center whitespace-nowrap overflow-visible">Mi rol</span>
          <span className="shrink-0 min-w-24 text-center whitespace-nowrap overflow-visible">Fondo</span>
          <span className="shrink-0 w-36 text-center whitespace-nowrap overflow-visible">Gantt</span>
          <span className="shrink-0 w-36 text-center whitespace-nowrap overflow-visible">Indicadores</span>
          <span className="shrink-0 w-36 text-center whitespace-nowrap overflow-visible">Presupuesto</span>
        </div>
        {proyectos.map((p) => (
          <div
            key={`${p.id}-${p.rol}`}
            className="flex items-center gap-3 w-full px-5 py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors"
          >
            <Link href={`/proyectos?id=${p.id}`} className="shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 h-7 px-2 text-[11px] font-medium tracking-wide border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-emerald-700 shadow-none"
              >
                <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                Ir
              </Button>
            </Link>
            <span
              className="text-[11px] font-medium text-gray-800 truncate min-w-0 flex-1"
              title={p.proyecto}
            >
              {p.proyecto}
            </span>
            <span className="text-[11px] text-gray-600 shrink-0 min-w-20 text-center truncate" title={p.rol}>
              {p.rol}
            </span>
            <span className="text-[11px] text-gray-500 shrink-0 w-24 text-center">
              {p.fondo}
            </span>
            <div className="flex items-center gap-2 shrink-0 w-36">
              <Progress value={p.avanceGantt} className="h-1.5 flex-1 bg-gray-100" />
              <span className="text-[11px] text-gray-500 w-8 tabular-nums shrink-0">
                {Math.round(p.avanceGantt)}%
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-36">
              <Progress
                value={p.avanceIndicadores ?? 0}
                className="h-1.5 flex-1 bg-gray-100"
              />
              <span className="text-[11px] text-gray-500 w-8 tabular-nums shrink-0">
                {Math.round(p.avanceIndicadores ?? 0)}%
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-36">
              <Progress
                value={p.avancePresupuesto ?? 0}
                className="h-1.5 flex-1 bg-gray-100"
              />
              <span className="text-[11px] text-gray-500 w-8 tabular-nums shrink-0">
                {Math.round(p.avancePresupuesto ?? 0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
