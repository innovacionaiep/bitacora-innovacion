'use client';

import {
  FolderKanban,
  MapPin,
  DollarSign,
  Users,
  Briefcase,
  Leaf,
  LucideIcon,
} from 'lucide-react';
import { RandomProject } from '@/lib/actions/discovery';

interface DiscoveryProjectsProps {
  projects: RandomProject[];
}

function getFocoConfig(focalizacion: string | null): {
  Icon: LucideIcon;
  bgClass: string;
  iconClass: string;
} {
  const f = focalizacion?.trim();
  if (f === 'Social')
    return {
      Icon: Users,
      bgClass: 'bg-yellow-100',
      iconClass: 'text-yellow-700',
    };
  if (f === 'Productiva')
    return {
      Icon: Briefcase,
      bgClass: 'bg-blue-100',
      iconClass: 'text-blue-700',
    };
  if (f === 'Ambiental')
    return { Icon: Leaf, bgClass: 'bg-green-100', iconClass: 'text-green-700' };
  return {
    Icon: FolderKanban,
    bgClass: 'bg-gray-100',
    iconClass: 'text-gray-600',
  };
}

export function DiscoveryProjects({ projects }: DiscoveryProjectsProps) {
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
    <div className="grid grid-cols-1 gap-2">
      {projects.slice(0, 3).map((project) => {
        const { Icon, bgClass, iconClass } = getFocoConfig(
          project.focalizacion
        );
        return (
          <div
            key={project.id}
            className="group flex gap-3 p-3 rounded-lg border border-gray-100 hover:border-emerald-500 hover:shadow-sm transition-all cursor-pointer bg-white"
          >
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${bgClass} ${iconClass}`}
              title={project.focalizacion || 'Proyecto'}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4
                className="text-xs font-medium text-gray-900 group-hover:text-emerald-600 line-clamp-1 truncate mb-1.5 transition-colors"
                title={project.nombre}
              >
                {project.nombre}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground group-hover:text-emerald-600 transition-colors">
                {project.focalizacion && (
                  <span
                    className={`flex items-center gap-1 font-medium ${iconClass}`}
                  >
                    <Icon className="h-3 w-3" />
                    {project.focalizacion}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {project.sede}
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {project.fondo}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
