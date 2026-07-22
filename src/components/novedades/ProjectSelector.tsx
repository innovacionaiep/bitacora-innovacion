'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { getProyectosParaPost } from '@/lib/actions/posts';

interface Proyecto {
  id: string;
  proyecto: string;
}

interface ProjectSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
}

const SEARCH_THRESHOLD = 7;

export function ProjectSelector({
  selectedIds,
  onSelectionChange,
  disabled = false,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProyectos() {
      setLoading(true);
      const result = await getProyectosParaPost();
      if (result.success && result.data) {
        setProyectos(result.data);
      } else {
        setError(result.error || 'Error al cargar proyectos');
      }
      setLoading(false);
    }
    loadProyectos();
  }, []);

  const showSearch = proyectos.length > SEARCH_THRESHOLD;

  const filteredProyectos = useMemo(() => {
    if (!showSearch || !search.trim()) return proyectos;
    const q = search.trim().toLowerCase();
    return proyectos.filter((p) => p.proyecto.toLowerCase().includes(q));
  }, [proyectos, search, showSearch]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setSearch('');
  };

  const toggleProyecto = (proyectoId: string) => {
    if (selectedIds.includes(proyectoId)) {
      onSelectionChange(selectedIds.filter((id) => id !== proyectoId));
    } else {
      onSelectionChange([...selectedIds, proyectoId]);
    }
  };

  const removeProyecto = (proyectoId: string) => {
    onSelectionChange(selectedIds.filter((id) => id !== proyectoId));
  };

  const selectedProyectos = proyectos.filter((p) => selectedIds.includes(p.id));

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground">Cargando proyectos...</div>
    );
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  if (proyectos.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No tienes proyectos asignados. Debes ser participante de al menos un
        proyecto para publicar.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled}
          >
            {selectedIds.length === 0
              ? 'Seleccionar proyectos...'
              : `${selectedIds.length} proyecto(s) seleccionado(s)`}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0 z-50 bg-popover border rounded-md shadow-md"
          align="start"
        >
          {showSearch && (
            <div className="border-b p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-8 pl-8 text-sm"
                  onKeyDown={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="max-h-60 overflow-auto p-1">
            {filteredProyectos.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 px-3">
                Sin resultados
              </p>
            ) : (
              filteredProyectos.map((proyecto) => (
                <div
                  key={proyecto.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 cursor-pointer rounded hover:bg-accent',
                    selectedIds.includes(proyecto.id) && 'bg-accent'
                  )}
                  onClick={() => toggleProyecto(proyecto.id)}
                >
                  <div
                    className={cn(
                      'h-4 w-4 border rounded flex items-center justify-center',
                      selectedIds.includes(proyecto.id)
                        ? 'bg-primary border-primary'
                        : 'border-input'
                    )}
                  >
                    {selectedIds.includes(proyecto.id) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span className="text-sm truncate">{proyecto.proyecto}</span>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Badges de proyectos seleccionados */}
      {selectedProyectos.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedProyectos.map((proyecto) => (
            <Badge key={proyecto.id} variant="secondary" className="gap-1 pr-1">
              <span className="truncate max-w-[150px]">
                {proyecto.proyecto}
              </span>
              <button
                type="button"
                onClick={() => removeProyecto(proyecto.id)}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
