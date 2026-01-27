'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProyectosParaPost } from '@/lib/actions/posts';
import { useEffect } from 'react';

interface Proyecto {
  id: string;
  proyecto: string;
}

export type FilterType = 'all' | 'my-posts' | 'by-project';
export type SortType = 'recent' | 'relevant';

interface PostFiltersProps {
  filterType: FilterType;
  sortType: SortType;
  selectedProyectoIds: string[];
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  onProyectoIdsChange: (ids: string[]) => void;
}

export function PostFilters({
  filterType,
  sortType,
  selectedProyectoIds,
  onFilterChange,
  onSortChange,
  onProyectoIdsChange,
}: PostFiltersProps) {
  const [proyectosOpen, setProyectosOpen] = useState(false);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loadingProyectos, setLoadingProyectos] = useState(true);

  useEffect(() => {
    async function loadProyectos() {
      setLoadingProyectos(true);
      const result = await getProyectosParaPost();
      if (result.success && result.data) {
        setProyectos(result.data);
      }
      setLoadingProyectos(false);
    }
    loadProyectos();
  }, []);

  const toggleProyecto = (proyectoId: string) => {
    if (selectedProyectoIds.includes(proyectoId)) {
      const newIds = selectedProyectoIds.filter((id) => id !== proyectoId);
      onProyectoIdsChange(newIds);
      // Si no quedan proyectos seleccionados, cambiar a "all"
      if (newIds.length === 0) {
        onFilterChange('all');
      }
    } else {
      const newIds = [...selectedProyectoIds, proyectoId];
      onProyectoIdsChange(newIds);
      // Activar el filtro "by-project" cuando se selecciona un proyecto
      onFilterChange('by-project');
    }
  };

  const handleFilterClick = (filter: FilterType) => {
    onFilterChange(filter);
    // Si se cambia a "all" o "my-posts", limpiar selección de proyectos
    if (filter !== 'by-project') {
      onProyectoIdsChange([]);
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-white -mx-8 -mt-6 px-8 pt-4 pb-4 mb-6 border-b border-gray-200 flex items-center gap-2 shadow-sm">
      {/* Botones de Ordenamiento */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Ordenar:</span>
        <Button
          variant={sortType === 'recent' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSortChange('recent')}
        >
          Más reciente
        </Button>
        <Button
          variant={sortType === 'relevant' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSortChange('relevant')}
        >
          Más relevante
        </Button>
      </div>

      {/* Botones de Filtrado */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm font-medium text-gray-700">Filtrar:</span>
        <Button
          variant={filterType === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterClick('all')}
        >
          Todos
        </Button>
        <Button
          variant={filterType === 'my-posts' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleFilterClick('my-posts')}
        >
          Mis posts
        </Button>
        <Popover open={proyectosOpen} onOpenChange={setProyectosOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={filterType === 'by-project' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
            >
              Del Proyecto...
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2">
              {loadingProyectos ? (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  Cargando proyectos...
                </div>
              ) : proyectos.length === 0 ? (
                <div className="text-sm text-muted-foreground p-4 text-center">
                  No hay proyectos disponibles
                </div>
              ) : (
                <div className="max-h-60 overflow-auto">
                  {proyectos.map((proyecto) => (
                    <div
                      key={proyecto.id}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 cursor-pointer rounded hover:bg-accent',
                        selectedProyectoIds.includes(proyecto.id) && 'bg-accent'
                      )}
                      onClick={() => toggleProyecto(proyecto.id)}
                    >
                      <div
                        className={cn(
                          'h-4 w-4 border rounded flex items-center justify-center',
                          selectedProyectoIds.includes(proyecto.id)
                            ? 'bg-primary border-primary'
                            : 'border-input'
                        )}
                      >
                        {selectedProyectoIds.includes(proyecto.id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm truncate">{proyecto.proyecto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
