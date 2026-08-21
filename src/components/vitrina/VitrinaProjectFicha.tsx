'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Check, GitBranch, GraduationCap, Handshake, Landmark, MapPin, Pencil, Tag, Trash2, X } from 'lucide-react';
import { parseVideoUrl } from '@/lib/video-url';
import {
  deleteVitrinaProyecto,
  getVitrinaProjectCatalogs,
  upsertVitrinaProyecto,
  type VitrinaProjectCatalogs,
} from '@/lib/actions/vitrina-proyectos';
import {
  createEmptyVitrinaProyecto,
  clampDescripcionFontSize,
  namesToCatalogSelection,
  VITRINA_COVER_ZOOM_MAX,
  VITRINA_COVER_ZOOM_MIN,
  VITRINA_DESCRIPCION_FONT_MAX,
  VITRINA_DESCRIPCION_FONT_MIN,
  type VitrinaProyecto,
} from '@/lib/vitrina-proyectos';
import { VitrinaCoverCrop } from '@/components/vitrina/VitrinaCoverCrop';
import { VitrinaFichaVideo } from '@/components/vitrina/VitrinaFichaVideo';
import { VitrinaProjectPhotos } from '@/components/vitrina/VitrinaProjectPhotos';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  MULTI_VALUE_SEP,
  MultiSelectNombres,
} from '@/components/ui/multi-select-nombres';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const selectTrigger = 'min-h-9 h-auto w-full py-1 text-sm border-slate-200';

type FieldKey =
  | 'nombre'
  | 'descripcion'
  | 'fondos'
  | 'lineas'
  | 'sedes'
  | 'escuelas'
  | 'socios'
  | 'etiquetas'
  | 'encargado'
  | 'video'
  | 'fotos';

function namesValue(names: string[]): string {
  return names.join(MULTI_VALUE_SEP);
}

function parseNames(value: string): string[] {
  return value
    .split(MULTI_VALUE_SEP)
    .map((s) => s.trim())
    .filter(Boolean);
}

type CatalogFieldKey = Extract<
  FieldKey,
  'fondos' | 'lineas' | 'sedes' | 'escuelas' | 'socios' | 'etiquetas'
>;

const CATALOG_ICONS = {
  fondos: Landmark,
  lineas: GitBranch,
  sedes: MapPin,
  escuelas: GraduationCap,
  socios: Handshake,
  etiquetas: Tag,
} as const;

const CATALOG_ICON_CLASS = {
  fondos: 'text-red-600',
  lineas: 'text-red-600',
  sedes: 'text-slate-500',
  escuelas: 'text-blue-600',
  socios: 'text-violet-600',
  etiquetas: 'text-emerald-600',
} as const;

const CATALOG_CHIP_CLASS = {
  fondos: 'bg-red-50 text-red-800',
  lineas: 'bg-red-50 text-red-800',
  sedes: 'bg-slate-100 text-slate-700',
  escuelas: 'bg-blue-50 text-blue-800',
  socios: 'bg-violet-50 text-violet-800',
  etiquetas: 'bg-emerald-50 text-emerald-800',
} as const;

function Chip({
  children,
  field,
  compact = false,
}: {
  children: string;
  field: CatalogFieldKey;
  compact?: boolean;
}) {
  const wrap = field === 'socios';
  return (
    <span
      className={cn(
        'max-w-full rounded-full font-medium',
        wrap
          ? 'inline-block whitespace-normal break-words text-left leading-snug'
          : 'inline-flex truncate',
        compact ? 'px-2 py-px text-[12px]' : 'px-2.5 py-0.5 text-[13px]',
        wrap && !compact && 'px-2.5 py-1',
        CATALOG_CHIP_CLASS[field],
      )}
    >
      {children}
    </span>
  );
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proyecto: VitrinaProyecto | null;
  isNew: boolean;
  canEdit: boolean;
  onCreated?: (id: string) => void;
};

export function VitrinaProjectFicha({
  open,
  onOpenChange,
  proyecto,
  isNew,
  canEdit,
  onCreated,
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<VitrinaProyecto>(() =>
    createEmptyVitrinaProyecto(),
  );
  const [snapshot, setSnapshot] = useState<VitrinaProyecto | null>(null);
  const [editing, setEditing] = useState<FieldKey | null>(null);
  const [catalogs, setCatalogs] = useState<VitrinaProjectCatalogs | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingCats, setLoadingCats] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setError('');
      setEditing(null);
      setSnapshot(null);
      return;
    }
    setError('');
    setConfirmDelete(false);
    if (proyecto) {
      setDraft(proyecto);
      setEditing(null);
      setSnapshot(null);
    } else if (isNew) {
      const next = createEmptyVitrinaProyecto();
      setDraft(next);
      setEditing('nombre');
      setSnapshot(next);
    }
    if (!canEdit) return;
    setLoadingCats(true);
    void getVitrinaProjectCatalogs()
      .then(setCatalogs)
      .catch(() => setError('No se pudieron cargar los catálogos'))
      .finally(() => setLoadingCats(false));
  }, [open, proyecto, canEdit, isNew]);

  const patch = (partial: Partial<VitrinaProyecto>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const applyNames = (
    field: 'fondos' | 'lineas' | 'sedes' | 'escuelas' | 'socios' | 'etiquetas',
    value: string,
  ) => {
    const options =
      field === 'fondos'
        ? catalogs?.fondos ?? []
        : field === 'lineas'
          ? catalogs?.lineas ?? []
          : field === 'sedes'
            ? catalogs?.sedes ?? []
            : field === 'escuelas'
              ? catalogs?.escuelas ?? []
              : field === 'socios'
                ? catalogs?.socios ?? []
                : catalogs?.etiquetas ?? [];
    const selected = namesToCatalogSelection(parseNames(value), options);

    setDraft((prev) => {
      if (field === 'fondos') {
        const nextLineas = namesToCatalogSelection(
          (catalogs?.lineas ?? [])
            .filter(
              (l) =>
                prev.lineaIds.includes(l.id) && selected.ids.includes(l.fondoId),
            )
            .map((l) => l.nombre),
          catalogs?.lineas ?? [],
        );
        return {
          ...prev,
          fondoIds: selected.ids,
          fondos: selected.names,
          lineaIds: nextLineas.ids,
          lineas: nextLineas.names,
        };
      }
      if (field === 'lineas') {
        return { ...prev, lineaIds: selected.ids, lineas: selected.names };
      }
      if (field === 'sedes') {
        return { ...prev, sedeIds: selected.ids, sedes: selected.names };
      }
      if (field === 'escuelas') {
        return { ...prev, escuelaIds: selected.ids, escuelas: selected.names };
      }
      if (field === 'etiquetas') {
        return { ...prev, etiquetaIds: selected.ids, etiquetas: selected.names };
      }
      return { ...prev, socioIds: selected.ids, socios: selected.names };
    });
  };

  function startEdit(key: FieldKey) {
    setSnapshot(draft);
    setEditing(key);
    setError('');
  }

  function cancelEdit() {
    if (snapshot) setDraft(snapshot);
    setEditing(isNew && !proyecto ? 'nombre' : null);
    setSnapshot(null);
    setError('');
  }

  async function saveEdit() {
    setError('');
    if (!draft.nombre.trim()) {
      setError('El nombre es obligatorio');
      setEditing('nombre');
      return;
    }
    setSaving(true);
    const result = await upsertVitrinaProyecto({ proyecto: draft });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar');
      return;
    }
    setEditing(null);
    setSnapshot(null);
    if (isNew) onCreated?.(draft.id);
    router.refresh();
  }

  async function handleDelete() {
    setError('');
    setDeleting(true);
    const result = await deleteVitrinaProyecto({ id: draft.id });
    setDeleting(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo eliminar');
      setConfirmDelete(false);
      return;
    }
    onOpenChange(false);
    router.refresh();
  }

  const busy = saving || deleting;
  const lineasOpciones =
    draft.fondoIds.length === 0
      ? catalogs?.lineas ?? []
      : (catalogs?.lineas ?? []).filter((l) =>
          draft.fondoIds.includes(l.fondoId),
        );
  const cover = draft.fotos[0];
  const video = parseVideoUrl(draft.videoUrl);
  const showVideoColumn = canEdit || video != null;
  const title = draft.nombre.trim() || (isNew ? 'Nuevo proyecto' : 'Proyecto');

  const videoField = (
    <HoverEdit
      canEdit={canEdit}
      active={editing === 'video'}
      label="vídeo del proyecto"
      onEdit={() => startEdit('video')}
      onCancel={cancelEdit}
      onSave={() => void saveEdit()}
      saving={busy}
      className="flex h-full min-h-0 w-full flex-col"
    >
      <section className="flex h-full min-h-0 w-full flex-col gap-2">
        <SectionLabel>Vídeo del proyecto</SectionLabel>
        <VitrinaFichaVideo
          video={video}
          coverUrl={cover?.url}
          emptyLabel={canEdit ? 'Añadir video' : 'Sin video'}
          className="min-h-0 flex-1"
        />
      </section>
      <div className="space-y-2">
        <SectionLabel>Vídeo del proyecto</SectionLabel>
        <Input
          type="url"
          value={draft.videoUrl}
          onChange={(e) => patch({ videoUrl: e.target.value })}
          placeholder="YouTube, Vimeo o SharePoint"
          disabled={busy}
        />
      </div>
    </HoverEdit>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(90%,58rem)] w-[min(99%,110rem)] max-w-none flex-col gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl sm:max-w-none sm:rounded-2xl">
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogHeader className="shrink-0 space-y-0 border-b border-zinc-800 bg-[linear-gradient(to_right,#3f3f46_0%,#000000_20%,#3f3f46_40%,#d4d4d8_60%,#3f3f46_80%,#d4d4d8_100%)] px-6 py-3 pr-16 text-left text-white">
          <div className="flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <HoverEdit
                canEdit={canEdit}
                active={editing === 'nombre'}
                label="nombre"
                onEdit={() => startEdit('nombre')}
                onCancel={cancelEdit}
                onSave={() => void saveEdit()}
                saving={busy}
              >
                <h2
                  aria-hidden="true"
                  className="truncate text-3xl font-semibold tracking-tight text-white"
                >
                  {title}
                </h2>
                <Input
                  value={draft.nombre}
                  onChange={(e) => patch({ nombre: e.target.value })}
                  placeholder="Nombre del proyecto"
                  disabled={busy}
                  autoFocus={editing === 'nombre'}
                  className="mt-1 h-12 text-2xl font-semibold"
                />
              </HoverEdit>
            </div>
            {canEdit && !isNew ? (
              <div className="shrink-0 pt-1">
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => void handleDelete()}
                      disabled={busy}
                    >
                      Confirmar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                      className="text-white hover:bg-white/10 hover:text-white"
                    >
                      No
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-red-300"
                    aria-label="Eliminar proyecto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Eliminar
                  </button>
                )}
              </div>
            ) : null}
          </div>
          {error ? <p className="mt-1 text-sm text-red-400">{error}</p> : null}
        </DialogHeader>

        <div
          className={cn(
            'grid min-h-0 flex-1 overflow-y-auto lg:overflow-hidden',
            showVideoColumn
              ? 'lg:grid-cols-[minmax(23rem,1fr)_minmax(0,1.05fr)_minmax(32rem,0.75fr)]'
              : 'lg:grid-cols-[minmax(23rem,1fr)_minmax(0,1.05fr)]',
          )}
        >
          <aside className="order-1 flex min-h-0 flex-col gap-4 overflow-y-auto border-slate-100 bg-white px-5 py-4 lg:col-start-1 lg:row-start-1 lg:border-r">
            <HoverEdit
              canEdit={canEdit}
              active={editing === 'fotos'}
              label="fotos"
              onEdit={() => startEdit('fotos')}
              onCancel={cancelEdit}
              onSave={() => void saveEdit()}
              saving={busy}
            >
              <div className="overflow-hidden rounded-xl bg-slate-100">
                {cover ? (
                  <VitrinaCoverCrop
                    url={cover.url}
                    offsetX={draft.coverOffsetX}
                    offsetY={draft.coverOffsetY}
                    zoom={draft.coverZoom}
                    className="aspect-[16/9] w-full"
                  />
                ) : (
                  <div className="flex aspect-[16/9] items-center justify-center px-8 text-center text-sm text-slate-400">
                    Sin imagen de portada
                  </div>
                )}
                {draft.fotos.length > 1 ? (
                  <div className="flex gap-2 px-3 py-2">
                    {draft.fotos.slice(1).map((foto) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={foto.publicId}
                        src={foto.url}
                        alt=""
                        className="h-12 w-[4.25rem] rounded-md object-cover"
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="space-y-3">
                {cover ? (
                  <div className="space-y-2">
                    <VitrinaCoverCrop
                      url={cover.url}
                      offsetX={draft.coverOffsetX}
                      offsetY={draft.coverOffsetY}
                      zoom={draft.coverZoom}
                      interactive
                      disabled={busy}
                      onChange={(next) => patch(next)}
                      className="aspect-[16/9] w-full rounded-xl ring-1 ring-slate-200"
                    />
                    <p className="text-xs text-slate-500">
                      Arrastra la imagen para moverla. Rueda del mouse o el
                      control para zoom.
                    </p>
                    <div className="flex items-center gap-3">
                      <Label htmlFor="vitrina-ficha-zoom" className="shrink-0">
                        Zoom
                      </Label>
                      <input
                        id="vitrina-ficha-zoom"
                        type="range"
                        min={VITRINA_COVER_ZOOM_MIN}
                        max={VITRINA_COVER_ZOOM_MAX}
                        step={0.05}
                        value={draft.coverZoom}
                        disabled={busy}
                        onChange={(e) =>
                          patch({ coverZoom: Number(e.target.value) })
                        }
                        className="w-full accent-slate-800"
                        aria-label="Zoom de la portada"
                      />
                      <span className="w-10 shrink-0 text-right text-xs text-slate-500">
                        {Math.round(draft.coverZoom * 100)}%
                      </span>
                    </div>
                  </div>
                ) : null}
                <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">
                  Galería
                </p>
                <VitrinaProjectPhotos
                  fotos={draft.fotos}
                  onChange={(fotos) => patch({ fotos })}
                  disabled={busy}
                  size="lg"
                />
              </div>
            </HoverEdit>

            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <CatalogField
                label="Fondo"
                items={draft.fondos}
                field="fondos"
                canEdit={canEdit}
                editing={editing}
                busy={busy}
                loadingCats={loadingCats}
                options={catalogs?.fondos ?? []}
                value={namesValue(draft.fondos)}
                onStart={startEdit}
                onCancel={cancelEdit}
                onSave={saveEdit}
                onChange={(v) => applyNames('fondos', v)}
              />
              <CatalogField
                label="Línea"
                items={draft.lineas}
                field="lineas"
                canEdit={canEdit}
                editing={editing}
                busy={busy}
                loadingCats={loadingCats}
                options={lineasOpciones}
                value={namesValue(draft.lineas)}
                onStart={startEdit}
                onCancel={cancelEdit}
                onSave={saveEdit}
                onChange={(v) => applyNames('lineas', v)}
              />
              <CatalogField
                label="Sedes"
                items={draft.sedes}
                field="sedes"
                canEdit={canEdit}
                editing={editing}
                busy={busy}
                loadingCats={loadingCats}
                options={catalogs?.sedes ?? []}
                value={namesValue(draft.sedes)}
                onStart={startEdit}
                onCancel={cancelEdit}
                onSave={saveEdit}
                onChange={(v) => applyNames('sedes', v)}
              />
              <CatalogField
                label="Escuelas"
                items={draft.escuelas}
                field="escuelas"
                canEdit={canEdit}
                editing={editing}
                busy={busy}
                loadingCats={loadingCats}
                options={catalogs?.escuelas ?? []}
                value={namesValue(draft.escuelas)}
                onStart={startEdit}
                onCancel={cancelEdit}
                onSave={saveEdit}
                onChange={(v) => applyNames('escuelas', v)}
              />
              <CatalogField
                label="Etiquetas"
                items={draft.etiquetas}
                field="etiquetas"
                canEdit={canEdit}
                editing={editing}
                busy={busy}
                loadingCats={loadingCats}
                options={catalogs?.etiquetas ?? []}
                value={namesValue(draft.etiquetas)}
                onStart={startEdit}
                onCancel={cancelEdit}
                onSave={saveEdit}
                onChange={(v) => applyNames('etiquetas', v)}
              />
              <CatalogField
                label="Socios comunitarios"
                items={draft.socios}
                field="socios"
                canEdit={canEdit}
                editing={editing}
                busy={busy}
                loadingCats={loadingCats}
                options={catalogs?.socios ?? []}
                value={namesValue(draft.socios)}
                onStart={startEdit}
                onCancel={cancelEdit}
                onSave={saveEdit}
                onChange={(v) => applyNames('socios', v)}
              />
            </div>

            <HoverEdit
              canEdit={canEdit}
              active={editing === 'encargado'}
              label="encargado"
              onEdit={() => startEdit('encargado')}
              onCancel={cancelEdit}
              onSave={() => void saveEdit()}
              saving={busy}
              className="mt-auto mb-8 w-full"
              editButtonClassName="left-0 right-auto"
            >
              <section className="text-right">
                <SectionLabel className="justify-end normal-case">
                  Encargado/a
                </SectionLabel>
                <div className="mt-1.5">
                  <p className="text-sm font-medium text-slate-900">
                    {draft.encargadoNombre.trim() || (
                      <span className="font-normal text-slate-400">
                        Sin encargado
                      </span>
                    )}
                  </p>
                  {draft.encargadoCargo ? (
                    <p className="text-sm text-slate-600">
                      {draft.encargadoCargo}
                    </p>
                  ) : null}
                  {draft.encargadoCorreo ? (
                    <p className="text-sm text-slate-500">
                      {draft.encargadoCorreo}
                    </p>
                  ) : null}
                </div>
              </section>
              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label>Nombre</Label>
                  <Input
                    value={draft.encargadoNombre}
                    onChange={(e) =>
                      patch({ encargadoNombre: e.target.value })
                    }
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Correo</Label>
                  <Input
                    type="email"
                    value={draft.encargadoCorreo}
                    onChange={(e) =>
                      patch({ encargadoCorreo: e.target.value })
                    }
                    disabled={busy}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Input
                    value={draft.encargadoCargo}
                    onChange={(e) =>
                      patch({ encargadoCargo: e.target.value })
                    }
                    disabled={busy}
                  />
                </div>
              </div>
            </HoverEdit>
          </aside>

          <div className="order-3 flex min-h-0 flex-col overflow-hidden px-6 py-4 lg:order-2 lg:col-start-2 lg:row-start-1">
            <HoverEdit
              canEdit={canEdit}
              active={editing === 'descripcion'}
              label="descripción"
              onEdit={() => startEdit('descripcion')}
              onCancel={cancelEdit}
              onSave={() => void saveEdit()}
              saving={busy}
              className="min-h-0"
            >
              <section className="flex min-h-0 flex-col overflow-hidden">
                <SectionLabel>Descripción</SectionLabel>
                <p
                  className="mt-5 min-h-0 overflow-y-auto whitespace-pre-wrap leading-relaxed text-slate-700"
                  style={{ fontSize: `${draft.descripcionFontSize}px` }}
                >
                  {draft.descripcion.trim() || (
                    <span className="text-slate-400">Sin descripción</span>
                  )}
                </p>
              </section>
              <div className="space-y-3">
                <SectionLabel>Descripción</SectionLabel>
                <Textarea
                  value={draft.descripcion}
                  onChange={(e) => patch({ descripcion: e.target.value })}
                  placeholder="Síntesis del proyecto"
                  disabled={busy}
                  className="min-h-[7rem] resize-none leading-relaxed"
                  style={{ fontSize: `${draft.descripcionFontSize}px` }}
                />
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor="vitrina-descripcion-font"
                    className="shrink-0 text-slate-600"
                  >
                    Tamaño de letra
                  </Label>
                  <input
                    id="vitrina-descripcion-font"
                    type="range"
                    min={VITRINA_DESCRIPCION_FONT_MIN}
                    max={VITRINA_DESCRIPCION_FONT_MAX}
                    step={1}
                    value={draft.descripcionFontSize}
                    disabled={busy}
                    onChange={(e) =>
                      patch({
                        descripcionFontSize: clampDescripcionFontSize(
                          Number(e.target.value),
                        ),
                      })
                    }
                    className="w-full accent-slate-800"
                    aria-label="Tamaño de letra de la descripción"
                  />
                  <span className="w-10 shrink-0 text-right text-xs text-slate-500">
                    {draft.descripcionFontSize}px
                  </span>
                </div>
              </div>
            </HoverEdit>
          </div>

          {showVideoColumn ? (
            <aside className="order-2 flex min-h-0 w-full items-center justify-center border-slate-100 px-6 py-4 lg:order-3 lg:col-start-3 lg:row-start-1 lg:border-l">
              {videoField}
            </aside>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function HoverEdit({
  canEdit,
  active,
  label,
  onEdit,
  onCancel,
  onSave,
  saving,
  children,
  className,
  editButtonClassName,
}: {
  canEdit: boolean;
  active: boolean;
  label: string;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  children: [ReactNode, ReactNode];
  className?: string;
  editButtonClassName?: string;
}) {
  const [view, editor] = children;
  return (
    <div className={cn('group/edit relative', className)}>
      {active ? (
        <div className="rounded-lg bg-white p-2 ring-1 ring-slate-200">
          {editor}
          <div className="mt-2 flex justify-end gap-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              aria-label="Cancelar edición"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700"
              aria-label={`Guardar ${label}`}
            >
              <Check className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {view}
          {canEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                'absolute right-0 top-0 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 opacity-0 shadow-sm transition-opacity group-hover/edit:opacity-100 focus-visible:opacity-100',
                editButtonClassName,
              )}
              aria-label={`Editar ${label}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

function CatalogField({
  label,
  items,
  field,
  canEdit,
  editing,
  busy,
  loadingCats,
  options,
  value,
  onStart,
  onCancel,
  onSave,
  onChange,
}: {
  label: string;
  items: string[];
  field: CatalogFieldKey;
  canEdit: boolean;
  editing: FieldKey | null;
  busy: boolean;
  loadingCats: boolean;
  options: { id: string; nombre: string }[];
  value: string;
  onStart: (key: FieldKey) => void;
  onCancel: () => void;
  onSave: () => Promise<void>;
  onChange: (value: string) => void;
}) {
  return (
    <HoverEdit
      canEdit={canEdit}
      active={editing === field}
      label={label}
      onEdit={() => onStart(field)}
      onCancel={onCancel}
      onSave={() => void onSave()}
      saving={busy}
    >
      <section>
        <SectionLabel field={field}>{label}</SectionLabel>
        <div
          className={cn(
            'mt-1 flex flex-wrap',
            field === 'etiquetas' && items.length > 8 ? 'gap-1' : 'gap-1.5',
          )}
        >
          {items.length > 0 ? (
            items.map((item, i) => (
              <Chip
                key={`${field}-${i}-${item}`}
                field={field}
                compact={field === 'etiquetas' && items.length > 8}
              >
                {item}
              </Chip>
            ))
          ) : (
            <span className="text-sm text-slate-400">—</span>
          )}
        </div>
      </section>
      <div className="space-y-1">
        <SectionLabel field={field}>{label}</SectionLabel>
        <MultiSelectNombres
          options={options}
          value={value}
          onChange={onChange}
          placeholder={label}
          triggerClassName={selectTrigger}
          loading={loadingCats}
        />
      </div>
    </HoverEdit>
  );
}

function SectionLabel({
  children,
  field,
  className,
}: {
  children: ReactNode;
  field?: CatalogFieldKey;
  className?: string;
}) {
  const Icon = field ? CATALOG_ICONS[field] : null;
  const iconClass = field ? CATALOG_ICON_CLASS[field] : '';
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase',
        className
      )}
    >
      {Icon ? (
        <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} aria-hidden />
      ) : null}
      {children}
    </p>
  );
}
