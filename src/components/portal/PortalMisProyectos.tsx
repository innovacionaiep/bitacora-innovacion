'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { FolderKanban, ExternalLink, Calendar, BarChart3 } from 'lucide-react';

export interface ProyectoConRol {
  id: string;
  proyecto: string;
  avanceGantt: number;
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Mis proyectos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (proyectos.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Mis proyectos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No hay proyectos con el rol seleccionado.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5" />
          Mis proyectos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {proyectos.map((p) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href="/proyectos"
                  className="font-medium text-foreground hover:underline truncate block"
                >
                  {p.proyecto}
                </Link>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {p.rol}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {p.avanceGantt}% avance
                  </span>
                </div>
                <Progress
                  value={p.avanceGantt}
                  className="h-1.5 mt-2 max-w-xs"
                />
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Link href="/proyectos">
                  <Button variant="outline" size="sm" className="gap-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Proyecto
                  </Button>
                </Link>
                <Link href={`/seguimiento?proyectoId=${p.id}`}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Seguimiento
                  </Button>
                </Link>
                <Link href="/proyectos">
                  <Button variant="ghost" size="sm" className="gap-1">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Gantt
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
