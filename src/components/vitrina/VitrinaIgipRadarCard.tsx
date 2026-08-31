'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { IGIP_SUBDIMENSIONS } from '@/lib/igip-trl';
import {
  IgipRadarChart,
  IgipRadarVertexSlot,
} from '@/components/igip/IgipRadarChart';
import {
  buildVitrinaIgipRadar,
  formatIgipRadarScore,
  type VitrinaIgipRadarTarget,
} from '@/lib/vitrina-igip-radar';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function VitrinaIgipRadarCard({
  proyectos,
  target,
}: {
  proyectos: VitrinaProyecto[];
  target: VitrinaIgipRadarTarget;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showPromedio, setShowPromedio] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const built = useMemo(
    () =>
      buildVitrinaIgipRadar({
        proyectos,
        selectedIds,
        target,
        showPromedio,
      }),
    [proyectos, selectedIds, target, showPromedio],
  );

  const destinoLabel = target === 'final' ? 'Final' : 'Proyección';
  const filtered = search.trim()
    ? proyectos.filter((p) =>
        p.nombre.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : proyectos;
  const selectedSet = new Set(selectedIds);
  const triggerLabel =
    selectedIds.length === 0
      ? 'Todos los proyectos'
      : selectedIds.length === 1
        ? (proyectos.find((p) => p.id === selectedIds[0])?.nombre ??
          '1 proyecto')
        : `${selectedIds.length} proyectos`;

  function toggleId(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setSearch('');
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-[12rem] justify-between text-sm font-medium"
              aria-label="Selector de proyectos"
            >
              <span className="truncate">{triggerLabel}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="start">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proyecto"
                className="h-9 pl-8 text-sm"
              />
            </div>
            <button
              type="button"
              className="mb-1 w-full rounded-md px-2 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => setSelectedIds([])}
            >
              Todos los proyectos
            </button>
            <div className="max-h-56 overflow-auto">
              {filtered.map((proyecto) => (
                <label
                  key={proyecto.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
                >
                  <Checkbox
                    checked={selectedSet.has(proyecto.id)}
                    onCheckedChange={() => toggleId(proyecto.id)}
                  />
                  <span className="truncate">{proyecto.nombre}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        <button
          type="button"
          aria-pressed={showPromedio}
          onClick={() => setShowPromedio((v) => !v)}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm font-semibold',
            showPromedio
              ? 'border-blue-700 bg-blue-700 text-white'
              : 'border-slate-200 bg-white text-slate-600',
          )}
        >
          Promedio
        </button>
        <div className="ml-auto flex flex-wrap items-center gap-3 text-[13px] font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#059669]" />
            Inicial
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#dc2626]" />
            {destinoLabel}
          </span>
          {showPromedio ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-[#2563eb]" />
              Promedio
            </span>
          ) : null}
        </div>
      </div>
      <IgipRadarChart
        layers={built.layers}
        ariaLabel={`Gráfico radial IGIP desde Inicial hacia IGIP ${destinoLabel}`}
        className="max-w-[45.4rem] min-h-[30.2rem]"
      >
        {IGIP_SUBDIMENSIONS.map((dim, index) => (
          <IgipRadarVertexSlot
            key={dim.key}
            index={index}
            className="w-[13.2rem] max-w-[50%]"
          >
            <span className="text-[14px] font-medium leading-snug text-gray-800">
              {dim.label}
            </span>
            <div className="-translate-y-[3px] flex flex-col items-center leading-tight">
              {built.layers
                .filter((layer) => layer.id === 'inicial')
                .concat(built.layers.filter((layer) => layer.id === 'destino'))
                .concat(built.layers.filter((layer) => layer.id === 'promedio'))
                .map((layer) => (
                  <span
                    key={layer.id}
                    className="text-[15px] font-semibold tabular-nums"
                    style={{ color: layer.stroke }}
                    data-testid={`radar-score-${dim.key}-${layer.id}`}
                  >
                    {formatIgipRadarScore(
                      layer.scores[index] ?? 0,
                      built.asAverage || layer.id === 'promedio',
                    )}
                  </span>
                ))}
            </div>
          </IgipRadarVertexSlot>
        ))}
      </IgipRadarChart>
    </section>
  );
}
