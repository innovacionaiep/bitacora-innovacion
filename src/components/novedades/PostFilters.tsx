'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { getProyectosParaPost } from '@/lib/actions/posts';

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

const SORT_LABELS: Record<SortType, string> = {
  recent: 'Recientes',
  relevant: 'Más relevantes',
};

const FILTER_LABELS: Record<FilterType, string> = {
  all: 'Todos',
  'my-posts': 'Mis posts',
  'by-project': 'Proyecto',
};

export function PostFilters({
  filterType,
  sortType,
  selectedProyectoIds,
  onFilterChange,
  onSortChange,
  onProyectoIdsChange,
}: PostFiltersProps) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loadingProyectos, setLoadingProyectos] = useState(true);

  useEffect(() => {
    async function loadProyectos() {
      setLoadingProyectos(true);
      const result = await getProyectosParaPost();
      if (result.success && result.data) setProyectos(result.data);
      setLoadingProyectos(false);
    }
    loadProyectos();
  }, []);

  const toggleProyecto = (proyectoId: string) => {
    if (selectedProyectoIds.includes(proyectoId)) {
      const newIds = selectedProyectoIds.filter((id) => id !== proyectoId);
      onProyectoIdsChange(newIds);
      if (newIds.length === 0) onFilterChange('all');
    } else {
      onProyectoIdsChange([...selectedProyectoIds, proyectoId]);
      onFilterChange('by-project');
    }
  };

  const handleFilterSelect = (filter: FilterType) => {
    onFilterChange(filter);
    if (filter !== 'by-project') onProyectoIdsChange([]);
  };

  const filterLabel =
    filterType === 'by-project' && selectedProyectoIds.length > 0
      ? `Proyecto (${selectedProyectoIds.length})`
      : FILTER_LABELS[filterType];

  return (
    <div className="flex items-center pt-0 pb-3 mb-4">
      {/* Segmento de línea izquierdo */}
      <div className="flex-1 border-t border-border"></div>
      
      {/* Controles alineados a la derecha */}
      <div className="flex items-center gap-4 pl-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ordenar por:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 text-muted-foreground hover:text-foreground">
                {SORT_LABELS[sortType]}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSortChange('recent')}>
                {sortType === 'recent' && <Check className="h-4 w-4 mr-2" />}
                {sortType !== 'recent' && <span className="w-4 mr-2" />}
                Recientes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange('relevant')}>
                {sortType === 'relevant' && <Check className="h-4 w-4 mr-2" />}
                {sortType !== 'relevant' && <span className="w-4 mr-2" />}
                Más relevantes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filtrar:</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 text-muted-foreground hover:text-foreground">
                {filterLabel}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleFilterSelect('all')}>
                {filterType === 'all' && <Check className="h-4 w-4 mr-2" />}
                {filterType !== 'all' && <span className="w-4 mr-2" />}
                Todos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleFilterSelect('my-posts')}>
                {filterType === 'my-posts' && <Check className="h-4 w-4 mr-2" />}
                {filterType !== 'my-posts' && <span className="w-4 mr-2" />}
                Mis posts
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={loadingProyectos} className="flex items-center">
                  <span className="w-4 mr-2"></span>
                  Proyecto
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {loadingProyectos ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Cargando...
                    </div>
                  ) : proyectos.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No hay proyectos
                    </div>
                  ) : (
                    proyectos.map((proyecto) => (
                      <DropdownMenuCheckboxItem
                        key={proyecto.id}
                        checked={selectedProyectoIds.includes(proyecto.id)}
                        onSelect={(e) => {
                          e.preventDefault();
                          toggleProyecto(proyecto.id);
                        }}
                      >
                        <span className="truncate">{proyecto.proyecto}</span>
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
