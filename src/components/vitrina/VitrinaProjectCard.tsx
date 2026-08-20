'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, GraduationCap, MapPin, SlidersHorizontal, Tag, X } from 'lucide-react';
import { saveVitrinaProyectoCoverOffset } from '@/lib/actions/vitrina-proyectos';
import {
  VITRINA_COVER_ZOOM_MAX,
  VITRINA_COVER_ZOOM_MIN,
  type VitrinaProyecto,
} from '@/lib/vitrina-proyectos';
import { VitrinaCoverCrop } from '@/components/vitrina/VitrinaCoverCrop';
import { Label } from '@/components/ui/label';

const FONDO_STRIPES = [
  'bg-red-600',
  'bg-emerald-600',
  'bg-blue-600',
  'bg-orange-500',
  'bg-violet-600',
  'bg-cyan-500',
] as const;

function normalizeFondoNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function fondoStripeClass(nombre: string): string {
  const key = normalizeFondoNombre(nombre);
  if (key.includes('impulsa')) return 'bg-emerald-600';
  if (key.includes('innovacion docente')) return 'bg-[#DC143C]';
  if (key.includes('incuba')) return 'bg-violet-600';

  let sum = 0;
  for (let i = 0; i < nombre.length; i++) {
    sum += nombre.charCodeAt(i);
  }
  return FONDO_STRIPES[sum % FONDO_STRIPES.length] ?? 'bg-slate-800';
}

const SECTION_ICONS = {
  sede: MapPin,
  escuela: GraduationCap,
  tag: Tag,
} as const;

function Chip({
  children,
  tone,
}: {
  children: string;
  tone: 'sede' | 'escuela' | 'tag';
}) {
  const className =
    tone === 'sede'
      ? 'bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700'
      : tone === 'escuela'
        ? 'bg-blue-50 px-2.5 py-0.5 text-xs text-blue-800'
        : 'bg-emerald-50 px-2 py-px text-[10px] text-emerald-800';
  return (
    <span
      className={`inline-flex max-w-full truncate rounded-full font-medium ${className}`}
    >
      {children}
    </span>
  );
}

function ChipSection({
  tone,
  label,
  items,
}: {
  tone: 'sede' | 'escuela' | 'tag';
  label: string;
  items: string[];
}) {
  const Icon = SECTION_ICONS[tone];
  const iconClass =
    tone === 'sede'
      ? 'text-slate-500'
      : tone === 'escuela'
        ? 'text-blue-600'
        : 'text-emerald-600';

  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <Icon className={`h-4 w-4 ${iconClass}`} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5" aria-label={label}>
        {items.map((item, i) => (
          <Chip key={`${tone}-${i}-${item}`} tone={tone}>
            {item}
          </Chip>
        ))}
      </div>
    </div>
  );
}

type Props = {
  proyecto: VitrinaProyecto;
  canEdit: boolean;
  onOpen: () => void;
};

export function VitrinaProjectCard({ proyecto, canEdit, onOpen }: Props) {
  const router = useRouter();
  const [framing, setFraming] = useState(false);
  const [frame, setFrame] = useState({
    x: proyecto.coverOffsetX,
    y: proyecto.coverOffsetY,
    zoom: proyecto.coverZoom,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setFrame({
      x: proyecto.coverOffsetX,
      y: proyecto.coverOffsetY,
      zoom: proyecto.coverZoom,
    });
  }, [proyecto.coverOffsetX, proyecto.coverOffsetY, proyecto.coverZoom]);

  const cover = proyecto.fotos[0];
  const fondoLabel = proyecto.fondos.join(' · ');

  function startFraming(event: React.SyntheticEvent) {
    event.stopPropagation();
    setError('');
    setFrame({
      x: proyecto.coverOffsetX,
      y: proyecto.coverOffsetY,
      zoom: proyecto.coverZoom,
    });
    setFraming(true);
  }

  function cancelFraming(event?: React.SyntheticEvent) {
    event?.stopPropagation();
    setFraming(false);
    setError('');
    setFrame({
      x: proyecto.coverOffsetX,
      y: proyecto.coverOffsetY,
      zoom: proyecto.coverZoom,
    });
  }

  async function persistFraming(event?: React.SyntheticEvent) {
    event?.stopPropagation();
    setError('');
    setSaving(true);
    const result = await saveVitrinaProyectoCoverOffset({
      id: proyecto.id,
      coverOffsetX: frame.x,
      coverOffsetY: frame.y,
      coverZoom: frame.zoom,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar');
      return;
    }
    setFraming(false);
    router.refresh();
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => {
        if (framing) return;
        onOpen();
      }}
      onKeyDown={(e) => {
        if (framing) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white text-left shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-emerald-500 hover:shadow-lg"
    >
      {fondoLabel ? (
        <div
          className={`flex min-h-6 shrink-0 items-center justify-center px-3 py-0.5 ${fondoStripeClass(fondoLabel)}`}
        >
          <p className="truncate text-center text-xs font-semibold tracking-wide text-white">
            {fondoLabel}
          </p>
        </div>
      ) : null}
      <div className="relative aspect-[2/1] w-full shrink-0 overflow-hidden bg-white">
        {cover ? (
          <VitrinaCoverCrop
            url={cover.url}
            offsetX={frame.x}
            offsetY={frame.y}
            zoom={frame.zoom}
            interactive={framing}
            disabled={saving}
            onChange={(next) =>
              setFrame({
                x: next.coverOffsetX,
                y: next.coverOffsetY,
                zoom: next.coverZoom,
              })
            }
            className="absolute inset-0 h-full w-full"
            maskClassName="[mask-image:linear-gradient(to_top,transparent_0%,black_28%)] [-webkit-mask-image:linear-gradient(to_top,transparent_0%,black_28%)]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-transparent to-slate-200" />
        )}
        {cover && canEdit && !framing ? (
          <button
            type="button"
            onClick={startFraming}
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/90 text-slate-700 opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100 focus-visible:opacity-100"
            aria-label="Ajustar posición de la imagen"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
        {cover && canEdit && framing ? (
          <div
            className="absolute inset-x-0 bottom-0 z-10 space-y-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <Label htmlFor={`vitrina-card-zoom-${proyecto.id}`} className="sr-only">
                Zoom
              </Label>
              <input
                id={`vitrina-card-zoom-${proyecto.id}`}
                type="range"
                min={VITRINA_COVER_ZOOM_MIN}
                max={VITRINA_COVER_ZOOM_MAX}
                step={0.05}
                value={frame.zoom}
                disabled={saving}
                onChange={(e) =>
                  setFrame((prev) => ({ ...prev, zoom: Number(e.target.value) }))
                }
                className="w-full accent-white"
                aria-label="Zoom de la portada"
              />
              <span className="w-9 shrink-0 text-right text-[10px] font-medium text-white">
                {Math.round(frame.zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={cancelFraming}
                disabled={saving}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-600 hover:bg-white"
                aria-label="Cancelar recorte"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => void persistFraming()}
                disabled={saving}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
                aria-label="Guardar recorte"
              >
                <Check className="h-4 w-4" />
              </button>
            </div>
            {error ? <p className="text-[11px] text-red-100">{error}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-2.5 bg-white px-4 pb-4 pt-[7px]">
        <h2 className="line-clamp-2 min-h-[2.75rem] text-base font-semibold leading-snug tracking-tight text-slate-900">
          {proyecto.nombre}
        </h2>
        {proyecto.sedes.length > 0 ? (
          <ChipSection tone="sede" label="Sedes" items={proyecto.sedes} />
        ) : null}
        {proyecto.escuelas.length > 0 ? (
          <ChipSection
            tone="escuela"
            label="Escuelas"
            items={proyecto.escuelas}
          />
        ) : null}
        {proyecto.etiquetas.length > 0 ? (
          <ChipSection
            tone="tag"
            label="Etiquetas"
            items={proyecto.etiquetas}
          />
        ) : null}
      </div>
    </article>
  );
}
