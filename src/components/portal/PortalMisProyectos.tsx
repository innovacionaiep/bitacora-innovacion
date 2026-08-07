'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getRoleColors, ROLE_BADGE_CLASS } from '@/lib/role-colors';
import { FolderKanban, ExternalLink } from 'lucide-react';

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
/** Franja fina del título del panel (no confundir con la fila de columnas). */
const PANEL_HEADER =
  'flex-shrink-0 h-7 px-5 border-b border-gray-100 bg-gray-50/90 flex items-center';
const PANEL_TITLE =
  'text-[11px] font-medium tracking-wide text-gray-800 flex items-center gap-1.5 leading-none';

/** Misma plantilla para encabezado de columnas y filas de datos. */
const TABLE_ROW =
  'grid grid-cols-[3rem_minmax(0,1fr)_5rem_6rem_9rem_9rem_9rem] gap-3 items-center w-full px-5';

function PanelHeader() {
  return (
    <div className={PANEL_HEADER}>
      <h3 className={PANEL_TITLE}>
        <FolderKanban className="h-3 w-3 text-gray-500" strokeWidth={1.75} />
        Mis proyectos
      </h3>
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
        <div
          className={`${TABLE_ROW} py-1.5 border-b border-gray-100 bg-gray-50/50 text-[11px] font-medium tracking-wide text-gray-600 shrink-0 sticky top-0 z-[1]`}
        >
          <span className="justify-self-center" aria-hidden />
          <span className="text-center truncate">Proyecto</span>
          <span className="text-center truncate">Mi rol</span>
          <span className="text-center truncate">Fondo</span>
          <span className="text-center truncate">Gantt</span>
          <span className="text-center truncate">Indicadores</span>
          <span className="text-center truncate">Presupuesto</span>
        </div>
        {proyectos.map((p) => (
          <div
            key={`${p.id}-${p.rol}`}
            className={`${TABLE_ROW} py-1.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/80 transition-colors`}
          >
            <div className="justify-self-center">
              <Link href={`/proyectos?id=${p.id}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 h-6 px-1.5 text-[10px] font-medium tracking-wide border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-emerald-700 shadow-none"
                >
                  <ExternalLink className="h-3 w-3" strokeWidth={1.75} />
                  Ir
                </Button>
              </Link>
            </div>
            <span
              className="text-[11px] font-normal leading-none text-gray-800 truncate min-w-0"
              title={p.proyecto}
            >
              {p.proyecto}
            </span>
            <span className="flex justify-center min-w-0">
              <span
                className={`${ROLE_BADGE_CLASS} ${getRoleColors(p.rol)} truncate max-w-full`}
                title={p.rol}
              >
                {p.rol}
              </span>
            </span>
            <span className="text-[11px] text-gray-500 text-center truncate" title={p.fondo}>
              {p.fondo}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <Progress value={p.avanceGantt} className="h-1.5 flex-1 bg-gray-100" />
              <span className="text-[11px] text-gray-500 w-8 tabular-nums shrink-0">
                {Math.round(p.avanceGantt)}%
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <Progress
                value={p.avanceIndicadores ?? 0}
                className="h-1.5 flex-1 bg-gray-100"
              />
              <span className="text-[11px] text-gray-500 w-8 tabular-nums shrink-0">
                {Math.round(p.avanceIndicadores ?? 0)}%
              </span>
            </div>
            <div className="flex items-center gap-2 min-w-0">
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
