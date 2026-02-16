'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FolderKanban, ExternalLink, Loader2 } from 'lucide-react';

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

export function PortalMisProyectos({
  proyectos,
  loading = false,
}: PortalMisProyectosProps) {
  if (loading) {
    return (
      <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Mis proyectos
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (proyectos.length === 0) {
    return (
      <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Mis proyectos
          </h3>
        </div>
        <div className="flex-1 flex items-center p-4">
          <p className="text-muted-foreground text-sm">
            No hay proyectos con el rol seleccionado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Mis proyectos
        </h3>
      </div>
      <div className="flex-1 min-h-0 overflow-auto w-full">
        <div className="flex items-center gap-3 w-full px-4 py-2 border-b bg-muted/40 text-xs font-medium text-muted-foreground shrink-0">
          <span className="w-12 shrink-0" aria-hidden />
          <span className="flex-1 min-w-0">Proyecto</span>
          <span className="w-16 shrink-0">Fondo</span>
          <span className="w-24 shrink-0">Gantt</span>
          <span className="w-24 shrink-0">Ind.</span>
          <span className="w-24 shrink-0">Presup.</span>
        </div>
        {proyectos.map((p, index) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 w-full px-4 py-2.5 border-border ${
              index > 0 ? 'border-t' : ''
            }`}
          >
            <Link href={`/proyectos?id=${p.id}`} className="shrink-0">
              <Button variant="outline" size="sm" className="gap-1 h-7 text-xs">
                <ExternalLink className="h-3 w-3" />
                Ir
              </Button>
            </Link>
            <span className="font-medium text-foreground truncate min-w-0 flex-1" title={p.proyecto}>
              {p.proyecto}
            </span>
            <span className="text-xs text-muted-foreground shrink-0 w-16">{p.fondo}</span>
            <div className="flex items-center gap-2 shrink-0 w-24">
              <Progress value={p.avanceGantt} className="h-2.5 flex-1" />
              <span className="text-sm text-muted-foreground w-8 tabular-nums">{p.avanceGantt}%</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-24">
              <Progress value={p.avanceIndicadores ?? 0} className="h-2.5 flex-1" />
              <span className="text-sm text-muted-foreground w-8 tabular-nums">{p.avanceIndicadores ?? 0}%</span>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-24">
              <Progress value={p.avancePresupuesto ?? 0} className="h-2.5 flex-1" />
              <span className="text-sm text-muted-foreground w-8 tabular-nums">{p.avancePresupuesto ?? 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
