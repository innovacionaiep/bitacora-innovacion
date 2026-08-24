'use client';

import { useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import { upsertVitrinaProyecto } from '@/lib/actions/vitrina-proyectos';
import type { VitrinaProjectCatalogs } from '@/lib/actions/vitrina-proyectos';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import { asOptionalDecimal, asOptionalInt } from '@/lib/vitrina-proyectos';
import {
  applyVitrinaTableCatalog,
  formatVitrinaTableNames,
  type VitrinaTableCatalogField,
} from '@/lib/vitrina-table-edit';
import { MultiSelectNombres } from '@/components/ui/multi-select-nombres';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const selectTrigger =
  'min-h-8 h-auto min-w-0 w-full py-1 text-[11px] border-slate-200';

/** Ancho estrecho (Fondo / Línea). */
const COL_A = 'w-[7.5rem] min-w-[7.5rem] max-w-[7.5rem]';
/** Ancho amplio (Nombre). */
const COL_B = 'w-[12rem] min-w-[12rem] max-w-[12rem]';

type ColSize = 'A' | 'B';

const COL_WIDTH: Record<ColSize, string> = {
  A: COL_A,
  B: COL_B,
};

type DataTableView = 'general' | 'desc-video' | 'indicadores';

const GENERAL_COLUMNS = [
  { key: 'nombre', label: 'Nombre', size: 'B' },
  { key: 'fondos', label: 'Fondo', size: 'A' },
  { key: 'lineas', label: 'Línea', size: 'A' },
  { key: 'sedes', label: 'Sedes', size: 'A' },
  { key: 'escuelas', label: 'Escuelas', size: 'B' },
  { key: 'etiquetas', label: 'Etiquetas', size: 'B' },
  { key: 'socios', label: 'Socios', size: 'A' },
  { key: 'encargadoNombre', label: 'Encargado', size: 'A' },
  { key: 'encargadoCorreo', label: 'Correo', size: 'A' },
  { key: 'encargadoCargo', label: 'Cargo', size: 'A' },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  size: ColSize;
}>;

const DESC_VIDEO_COLUMNS = [
  { key: 'nombre', label: 'Nombre', size: 'B' },
  { key: 'descripcion', label: 'Descripción', size: 'B' },
  { key: 'videoUrl', label: 'Vídeo', size: 'B' },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  size: ColSize;
}>;

const INDICADORES_COLUMNS = [
  { key: 'nombre', label: 'Nombre', size: 'B' },
  { key: 'igipInicial', label: 'IGIP Inicial', size: 'A' },
  { key: 'igipInicialComentario', label: 'IGIP Inicial - Comentario', size: 'B' },
  { key: 'igipProyeccion', label: 'IGIP Proyección', size: 'A' },
  { key: 'igipFinal', label: 'IGIP Final', size: 'A' },
  { key: 'igipFinalComentario', label: 'IGIP Final - Comentario', size: 'B' },
  { key: 'trlInicial', label: 'TRL Inicial', size: 'A' },
  { key: 'trlInicialComentario', label: 'TRL Inicial - Comentario', size: 'B' },
  { key: 'trlProyeccion', label: 'TRL Proyección', size: 'A' },
  { key: 'trlFinal', label: 'TRL Final', size: 'A' },
  { key: 'trlFinalComentario', label: 'TRL Final - Comentario', size: 'B' },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  size: ColSize;
}>;

const PREVIEW_CHARS = 100;

function columnsForView(view: DataTableView) {
  if (view === 'general') return GENERAL_COLUMNS;
  if (view === 'desc-video') return DESC_VIDEO_COLUMNS;
  return INDICADORES_COLUMNS;
}

function tableMinWidthForView(view: DataTableView) {
  if (view === 'general') return 'min-w-[64rem]';
  if (view === 'desc-video') return 'min-w-[36rem]';
  return 'min-w-[88rem]';
}

export function VitrinaProjectsTable({
  proyectos,
  catalogs,
  canEdit,
  emptyHint,
  onProyectoUpsert,
  onOptimisticMutationStart,
  onOptimisticMutationEnd,
}: {
  proyectos: VitrinaProyecto[];
  catalogs: VitrinaProjectCatalogs;
  canEdit: boolean;
  emptyHint?: string;
  onProyectoUpsert?: (proyecto: VitrinaProyecto) => void;
  onOptimisticMutationStart?: () => void;
  onOptimisticMutationEnd?: () => void;
}) {
  const [tableView, setTableView] = useState<DataTableView>('general');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VitrinaProyecto | null>(null);
  const [error, setError] = useState('');

  const changeView = (next: DataTableView) => {
    setTableView(next);
    setEditingId(null);
    setDraft(null);
    setError('');
  };

  const startEdit = (proyecto: VitrinaProyecto) => {
    setEditingId(proyecto.id);
    setDraft({ ...proyecto });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setError('');
  };

  const saveEdit = () => {
    if (!draft) return;
    if (!draft.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    const previous =
      proyectos.find((proyecto) => proyecto.id === draft.id) ?? null;
    const toSave = draft;
    cancelEdit();
    onOptimisticMutationStart?.();
    onProyectoUpsert?.(toSave);

    void upsertVitrinaProyecto({ proyecto: toSave })
      .then((result) => {
        if (!result.success) {
          if (previous) onProyectoUpsert?.(previous);
          setError(result.error ?? 'No se pudo guardar');
        }
      })
      .catch(() => {
        if (previous) onProyectoUpsert?.(previous);
        setError('No se pudo guardar');
      })
      .finally(() => {
        onOptimisticMutationEnd?.();
      });
  };

  const patchCatalog = (field: VitrinaTableCatalogField, value: string) => {
    setDraft((current) =>
      current ? applyVitrinaTableCatalog(current, field, value, catalogs) : current,
    );
  };

  const lineasOpciones =
    draft && draft.fondoIds.length > 0
      ? catalogs.lineas.filter((linea) => draft.fondoIds.includes(linea.fondoId))
      : catalogs.lineas;

  const saving = false;

  if (proyectos.length === 0) {
    return (
      <div className="flex h-full min-h-0 items-start px-8 py-10 lg:px-12">
        <p className="text-sm text-slate-500">
          {emptyHint ?? 'No hay proyectos en vitrina.'}
        </p>
      </div>
    );
  }

  const columns = columnsForView(tableView);
  const tableMinWidth = tableMinWidthForView(tableView);

  return (
    <div className="flex h-full min-h-0 flex-col px-6 py-6 lg:px-10">
      <div
        role="tablist"
        aria-label="Vista de datos de la tabla"
        className="mb-3 inline-flex shrink-0 self-start rounded-full border border-slate-200 bg-slate-100 p-0.5"
      >
        <ViewTab
          active={tableView === 'general'}
          onClick={() => changeView('general')}
        >
          Información General
        </ViewTab>
        <ViewTab
          active={tableView === 'desc-video'}
          onClick={() => changeView('desc-video')}
        >
          Desc. y Vídeo
        </ViewTab>
        <ViewTab
          active={tableView === 'indicadores'}
          onClick={() => changeView('indicadores')}
        >
          Indicadores Técnicos
        </ViewTab>
      </div>

      {error ? (
        <p className="mb-3 shrink-0 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain rounded-xl border border-slate-200 bg-white">
        <Table
          className={cn(
            'border-collapse text-[11px] [&_th]:border-r [&_th]:border-slate-200 [&_td]:border-r [&_td]:border-slate-200',
            tableMinWidth,
          )}
        >
          <TableHeader className="sticky top-0 z-30">
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'bg-slate-200',
                    COL_WIDTH[col.size],
                    col.key === 'nombre' &&
                      'sticky left-0 top-0 z-40 shadow-[1px_0_0_0_#e2e8f0]',
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
              {canEdit ? (
                <TableHead
                  aria-label="Acciones"
                  className="sticky right-0 top-0 z-40 w-24 border-l border-slate-200 bg-slate-200 text-right shadow-[-1px_0_0_0_#e2e8f0]"
                />
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {proyectos.map((proyecto) => {
              const isEditing = editingId === proyecto.id && draft !== null;
              const row = isEditing && draft ? draft : proyecto;
              return (
                <TableRow key={proyecto.id} className="align-top">
                  <NombreCell
                    value={row.nombre}
                    editing={isEditing && draft !== null}
                    draft={draft}
                    saving={saving}
                    onChange={(nombre) =>
                      draft && setDraft({ ...draft, nombre })
                    }
                  />
                  {tableView === 'general' ? (
                    <>
                      <CatalogCell
                        editing={isEditing}
                        items={row.fondos}
                        options={catalogs.fondos}
                        value={formatVitrinaTableNames(row.fondos)}
                        onChange={(v) => patchCatalog('fondos', v)}
                        className={COL_A}
                      />
                      <CatalogCell
                        editing={isEditing}
                        items={row.lineas}
                        options={lineasOpciones}
                        value={formatVitrinaTableNames(row.lineas)}
                        onChange={(v) => patchCatalog('lineas', v)}
                        className={COL_A}
                      />
                      <CatalogCell
                        editing={isEditing}
                        items={row.sedes}
                        options={catalogs.sedes}
                        value={formatVitrinaTableNames(row.sedes)}
                        onChange={(v) => patchCatalog('sedes', v)}
                        className={COL_A}
                      />
                      <CatalogCell
                        editing={isEditing}
                        items={row.escuelas}
                        options={catalogs.escuelas}
                        value={formatVitrinaTableNames(row.escuelas)}
                        onChange={(v) => patchCatalog('escuelas', v)}
                        className={COL_B}
                      />
                      <CatalogCell
                        editing={isEditing}
                        items={row.etiquetas}
                        options={catalogs.etiquetas}
                        value={formatVitrinaTableNames(row.etiquetas)}
                        onChange={(v) => patchCatalog('etiquetas', v)}
                        className={COL_B}
                      />
                      <CatalogCell
                        editing={isEditing}
                        items={row.socios}
                        options={catalogs.socios}
                        value={formatVitrinaTableNames(row.socios)}
                        onChange={(v) => patchCatalog('socios', v)}
                        className={COL_A}
                        wrapChips
                      />
                      <TableCell className={COL_A}>
                        {isEditing && draft ? (
                          <Input
                            value={draft.encargadoNombre}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                encargadoNombre: e.target.value,
                              })
                            }
                            disabled={saving}
                            className="h-8 text-[11px]"
                          />
                        ) : (
                          <PlainText value={row.encargadoNombre} />
                        )}
                      </TableCell>
                      <TableCell className={COL_A}>
                        {isEditing && draft ? (
                          <Input
                            type="email"
                            value={draft.encargadoCorreo}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                encargadoCorreo: e.target.value,
                              })
                            }
                            disabled={saving}
                            className="h-8 text-[11px]"
                          />
                        ) : (
                          <PlainText value={row.encargadoCorreo} />
                        )}
                      </TableCell>
                      <TableCell className={COL_A}>
                        {isEditing && draft ? (
                          <Input
                            value={draft.encargadoCargo}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                encargadoCargo: e.target.value,
                              })
                            }
                            disabled={saving}
                            className="h-8 text-[11px]"
                          />
                        ) : (
                          <PlainText value={row.encargadoCargo} />
                        )}
                      </TableCell>
                    </>
                  ) : null}
                  {tableView === 'desc-video' ? (
                    <>
                      <TableCell className={COL_B}>
                        {isEditing && draft ? (
                          <Input
                            value={draft.descripcion}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                descripcion: e.target.value,
                              })
                            }
                            disabled={saving}
                            className="h-8 text-[11px]"
                          />
                        ) : (
                          <TruncatedText
                            value={row.descripcion}
                            maxChars={PREVIEW_CHARS}
                          />
                        )}
                      </TableCell>
                      <TableCell className={COL_B}>
                        {isEditing && draft ? (
                          <Input
                            type="url"
                            value={draft.videoUrl}
                            onChange={(e) =>
                              setDraft({ ...draft, videoUrl: e.target.value })
                            }
                            disabled={saving}
                            className="h-8 text-[11px]"
                          />
                        ) : (
                          <TruncatedText
                            value={row.videoUrl}
                            maxChars={PREVIEW_CHARS}
                          />
                        )}
                      </TableCell>
                    </>
                  ) : null}
                  {tableView === 'indicadores' ? (
                    <IndicadoresCells
                      row={row}
                      draft={draft}
                      editing={isEditing && draft !== null}
                      saving={saving}
                      onPatch={(patch) =>
                        draft && setDraft({ ...draft, ...patch })
                      }
                    />
                  ) : null}
                  {canEdit ? (
                    <ActionsCell
                      proyectoNombre={proyecto.nombre}
                      isEditing={isEditing && draft !== null}
                      editingBusy={editingId !== null}
                      saving={saving}
                      onCancel={cancelEdit}
                      onSave={() => void saveEdit()}
                      onStart={() => startEdit(proyecto)}
                    />
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-1.5 text-[11px] font-semibold transition-colors',
        active
          ? 'bg-white text-slate-900 shadow-sm'
          : 'text-slate-600 hover:text-slate-900',
      )}
    >
      {children}
    </button>
  );
}

function NombreCell({
  value,
  editing,
  draft,
  saving,
  onChange,
}: {
  value: string;
  editing: boolean;
  draft: VitrinaProyecto | null;
  saving: boolean;
  onChange: (nombre: string) => void;
}) {
  return (
    <TableCell
      className={cn(
        COL_B,
        'sticky left-0 z-10 bg-white font-medium text-slate-700 shadow-[1px_0_0_0_#e2e8f0]',
      )}
    >
      {editing && draft ? (
        <Input
          value={draft.nombre}
          onChange={(e) => onChange(e.target.value)}
          disabled={saving}
          className="h-8 text-[11px]"
        />
      ) : (
        value
      )}
    </TableCell>
  );
}

function ActionsCell({
  proyectoNombre,
  isEditing,
  editingBusy,
  saving,
  onCancel,
  onSave,
  onStart,
}: {
  proyectoNombre: string;
  isEditing: boolean;
  editingBusy: boolean;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  onStart: () => void;
}) {
  return (
    <TableCell className="sticky right-0 z-10 border-l border-slate-200 bg-white text-right shadow-[-1px_0_0_0_#e2e8f0]">
      {isEditing ? (
        <div className="inline-flex gap-1">
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
            aria-label="Guardar fila"
          >
            <Check className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStart}
          disabled={editingBusy}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          aria-label={`Editar ${proyectoNombre}`}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </TableCell>
  );
}

function CatalogCell({
  editing,
  items,
  options,
  value,
  onChange,
  className,
  wrapChips = false,
}: {
  editing: boolean;
  items: string[];
  options: { id: string; nombre: string }[];
  value: string;
  onChange: (value: string) => void;
  className: string;
  wrapChips?: boolean;
}) {
  return (
    <TableCell className={className}>
      {editing ? (
        <MultiSelectNombres
          options={options}
          value={value}
          onChange={onChange}
          triggerClassName={selectTrigger}
        />
      ) : (
        <ChipList items={items} wrap={wrapChips} />
      )}
    </TableCell>
  );
}

function ChipList({
  items,
  wrap = false,
}: {
  items: string[];
  wrap?: boolean;
}) {
  if (items.length === 0) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className={cn(
            'max-w-full rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700',
            wrap
              ? 'inline-block whitespace-normal break-words'
              : 'inline-flex truncate',
          )}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function PlainText({ value }: { value: string }) {
  if (!value.trim()) {
    return <span className="text-slate-400">—</span>;
  }
  return <span className="break-all text-slate-700">{value}</span>;
}

function TruncatedText({
  value,
  maxChars,
}: {
  value: string;
  maxChars: number;
}) {
  const trimmed = value.trim();
  if (!trimmed) {
    return <span className="text-slate-400">—</span>;
  }
  const preview =
    trimmed.length > maxChars ? trimmed.slice(0, maxChars) : trimmed;
  return (
    <span className="block truncate text-slate-700" title={trimmed}>
      {preview}
    </span>
  );
}

type IndicadoresPatch = Partial<
  Pick<
    VitrinaProyecto,
    | 'igipInicial'
    | 'igipInicialComentario'
    | 'igipProyeccion'
    | 'igipFinal'
    | 'igipFinalComentario'
    | 'trlInicial'
    | 'trlInicialComentario'
    | 'trlProyeccion'
    | 'trlFinal'
    | 'trlFinalComentario'
  >
>;

function IndicadoresCells({
  row,
  draft,
  editing,
  saving,
  onPatch,
}: {
  row: VitrinaProyecto;
  draft: VitrinaProyecto | null;
  editing: boolean;
  saving: boolean;
  onPatch: (patch: IndicadoresPatch) => void;
}) {
  const source = editing && draft ? draft : row;
  return (
    <>
      <NumberCell
        value={source.igipInicial}
        editing={editing}
        saving={saving}
        kind="decimal"
        className={COL_A}
        onChange={(igipInicial) => onPatch({ igipInicial })}
      />
      <CommentCell
        value={source.igipInicialComentario}
        editing={editing}
        saving={saving}
        className={COL_B}
        onChange={(igipInicialComentario) =>
          onPatch({ igipInicialComentario })
        }
      />
      <NumberCell
        value={source.igipProyeccion}
        editing={editing}
        saving={saving}
        kind="decimal"
        className={COL_A}
        onChange={(igipProyeccion) => onPatch({ igipProyeccion })}
      />
      <NumberCell
        value={source.igipFinal}
        editing={editing}
        saving={saving}
        kind="decimal"
        className={COL_A}
        onChange={(igipFinal) => onPatch({ igipFinal })}
      />
      <CommentCell
        value={source.igipFinalComentario}
        editing={editing}
        saving={saving}
        className={COL_B}
        onChange={(igipFinalComentario) => onPatch({ igipFinalComentario })}
      />
      <NumberCell
        value={source.trlInicial}
        editing={editing}
        saving={saving}
        kind="int"
        className={COL_A}
        onChange={(trlInicial) => onPatch({ trlInicial })}
      />
      <CommentCell
        value={source.trlInicialComentario}
        editing={editing}
        saving={saving}
        className={COL_B}
        onChange={(trlInicialComentario) => onPatch({ trlInicialComentario })}
      />
      <NumberCell
        value={source.trlProyeccion}
        editing={editing}
        saving={saving}
        kind="int"
        className={COL_A}
        onChange={(trlProyeccion) => onPatch({ trlProyeccion })}
      />
      <NumberCell
        value={source.trlFinal}
        editing={editing}
        saving={saving}
        kind="int"
        className={COL_A}
        onChange={(trlFinal) => onPatch({ trlFinal })}
      />
      <CommentCell
        value={source.trlFinalComentario}
        editing={editing}
        saving={saving}
        className={COL_B}
        onChange={(trlFinalComentario) => onPatch({ trlFinalComentario })}
      />
    </>
  );
}

function NumberCell({
  value,
  editing,
  saving,
  kind,
  className,
  onChange,
}: {
  value: number | null;
  editing: boolean;
  saving: boolean;
  kind: 'decimal' | 'int';
  className: string;
  onChange: (value: number | null) => void;
}) {
  return (
    <TableCell className={className}>
      {editing ? (
        <Input
          type="number"
          step={kind === 'decimal' ? 'any' : '1'}
          value={value ?? ''}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(
              kind === 'decimal'
                ? asOptionalDecimal(raw)
                : asOptionalInt(raw),
            );
          }}
          disabled={saving}
          className="h-8 text-[11px]"
        />
      ) : value === null ? (
        <span className="text-slate-400">—</span>
      ) : (
        <span className="tabular-nums text-slate-700">{value}</span>
      )}
    </TableCell>
  );
}

function CommentCell({
  value,
  editing,
  saving,
  className,
  onChange,
}: {
  value: string;
  editing: boolean;
  saving: boolean;
  className: string;
  onChange: (value: string) => void;
}) {
  return (
    <TableCell className={className}>
      {editing ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={saving}
          className="h-8 text-[11px]"
        />
      ) : (
        <PlainText value={value} />
      )}
    </TableCell>
  );
}
