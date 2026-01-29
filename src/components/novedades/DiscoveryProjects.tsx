'use client';

import { useState } from 'react';
import { RefreshCw, FolderKanban, MapPin, GraduationCap, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getRandomProjects, RandomProject } from '@/lib/actions/discovery';
import { cn } from '@/lib/utils';

interface DiscoveryProjectsProps {
  initialProjects?: RandomProject[];
}

export function DiscoveryProjects({ initialProjects = [] }: DiscoveryProjectsProps) {
  // Usar datos iniciales directamente - sin carga en useEffect
  const [projects, setProjects] = useState<RandomProject[]>(initialProjects);
  const [loading, setLoading] = useState(false); // No loading si hay datos iniciales
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = async () => {
    // forceRefresh: true para obtener datos frescos sin caché
    const result = await getRandomProjects(3, true);
    if (result.success && result.data) {
      setProjects(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  // NO useEffect para carga inicial - los datos vienen del servidor

  const handleRefresh = () => {
    setRefreshing(true);
    loadProjects();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="p-3 rounded-lg border border-gray-100 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
            <div className="h-2 bg-gray-100 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-4">
        <FolderKanban className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-xs text-muted-foreground">
          No hay proyectos para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5 mr-1', refreshing && 'animate-spin')}
          />
          Actualizar
        </Button>
      </div>

      <div className="space-y-2">
        {projects.map((project) => (
          <div
            key={project.id}
            className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer bg-white"
          >
            <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5">
              {project.nombre}
            </h4>
            
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {project.sede}
              </span>
              {project.escuela && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="h-3 w-3" />
                  {project.escuela}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {project.participantesCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Progress value={project.avanceGantt} className="h-1.5 flex-1" />
              <span className="text-xs font-medium text-gray-600">
                {project.avanceGantt}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
