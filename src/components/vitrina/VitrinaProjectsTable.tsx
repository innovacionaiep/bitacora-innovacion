'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, X } from 'lucide-react';
import { upsertVitrinaProyecto } from '@/lib/actions/vitrina-proyectos';
import type { VitrinaProjectCatalogs } from '@/lib/actions/vitrina-proyectos';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
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
  'min-h-8 h-auto min-w-[9rem] py-1 text-xs border-slate-200';

const COLUMNS = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'fondos', label: 'Fondo' },
  { key: 'lineas', label: 'Línea' },
  { key: 'sedes', label: 'Sedes' },
  { key: 'escuelas', label: 'Escuelas' },
  { key: 'etiquetas', label: 'Etiquetas' },
  { key: 'socios', label: 'Socios' },
  { key: 'encargadoNombre', label: 'Encargado' },
  { key: 'encargadoCorreo', label: 'Correo' },
  { key: 'encargadoCargo', label: 'Cargo' },
  { key: 'videoUrl', label: 'Vídeo' },
] as const;

export function VitrinaProjectsTable({
  proyectos,
  catalogs,
  canEdit,
}: {
  proyectos: VitrinaProyecto[];
  catalogs: VitrinaProjectCatalogs;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<VitrinaProyecto | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

  const saveEdit = async () => {
    if (!draft) return;
    if (!draft.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    const result = await upsertVitrinaProyecto({ proyecto: draft });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar');
      return;
    }
    cancelEdit();
    router.refresh();
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

  if (proyectos.length === 0) {
    return (
      <div className="px-8 py-10 lg:px-12">
        <p className="text-sm text-slate-500">No hay proyectos en vitrina.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 lg:px-10">
      {error ? (
        <p className="mb-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <Table className="min-w-[88rem] border-collapse [&_th]:border-r [&_th]:border-slate-200 [&_td]:border-r [&_td]:border-slate-200">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.key === 'nombre' &&
                      'sticky left-0 z-20 bg-white shadow-[1px_0_0_0_#e2e8f0]',
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
              {canEdit ? (
                <TableHead className="sticky right-0 z-20 w-24 bg-white text-right shadow-[-1px_0_0_0_#e2e8f0]">
                  Acciones
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {proyectos.map((proyecto) => {
              const isEditing = editingId === proyecto.id && draft !== null;
              const row = isEditing && draft ? draft : proyecto;
              return (
                <TableRow key={proyecto.id} className="align-top">
                  <TableCell
                    className={cn(
                      'sticky left-0 z-10 min-w-[12rem] bg-white font-medium shadow-[1px_0_0_0_#e2e8f0]',
                    )}
                  >
                    {isEditing && draft ? (
                      <Input
                        value={draft.nombre}
                        onChange={(e) =>
                          setDraft({ ...draft, nombre: e.target.value })
                        }
                        disabled={saving}
                        className="h-8 text-sm"
                      />
                    ) : (
                      row.nombre
                    )}
                  </TableCell>
                  <CatalogCell
                    editing={isEditing}
                    items={row.fondos}
                    options={catalogs.fondos}
                    value={formatVitrinaTableNames(row.fondos)}
                    onChange={(v) => patchCatalog('fondos', v)}
                  />
                  <CatalogCell
                    editing={isEditing}
                    items={row.lineas}
                    options={lineasOpciones}
                    value={formatVitrinaTableNames(row.lineas)}
                    onChange={(v) => patchCatalog('lineas', v)}
                  />
                  <CatalogCell
                    editing={isEditing}
                    items={row.sedes}
                    options={catalogs.sedes}
                    value={formatVitrinaTableNames(row.sedes)}
                    onChange={(v) => patchCatalog('sedes', v)}
                  />
                  <CatalogCell
                    editing={isEditing}
                    items={row.escuelas}
                    options={catalogs.escuelas}
                    value={formatVitrinaTableNames(row.escuelas)}
                    onChange={(v) => patchCatalog('escuelas', v)}
                  />
                  <CatalogCell
                    editing={isEditing}
                    items={row.etiquetas}
                    options={catalogs.etiquetas}
                    value={formatVitrinaTableNames(row.etiquetas)}
                    onChange={(v) => patchCatalog('etiquetas', v)}
                  />
                  <CatalogCell
                    editing={isEditing}
                    items={row.socios}
                    options={catalogs.socios}
                    value={formatVitrinaTableNames(row.socios)}
                    onChange={(v) => patchCatalog('socios', v)}
                  />
                  <TableCell className="min-w-[10rem]">
                    {isEditing && draft ? (
                      <Input
                        value={draft.encargadoNombre}
                        onChange={(e) =>
                          setDraft({ ...draft, encargadoNombre: e.target.value })
                        }
                        disabled={saving}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <PlainText value={row.encargadoNombre} />
                    )}
                  </TableCell>
                  <TableCell className="min-w-[12rem]">
                    {isEditing && draft ? (
                      <Input
                        type="email"
                        value={draft.encargadoCorreo}
                        onChange={(e) =>
                          setDraft({ ...draft, encargadoCorreo: e.target.value })
                        }
                        disabled={saving}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <PlainText value={row.encargadoCorreo} />
                    )}
                  </TableCell>
                  <TableCell className="min-w-[10rem]">
                    {isEditing && draft ? (
                      <Input
                        value={draft.encargadoCargo}
                        onChange={(e) =>
                          setDraft({ ...draft, encargadoCargo: e.target.value })
                        }
                        disabled={saving}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <PlainText value={row.encargadoCargo} />
                    )}
                  </TableCell>
                  <TableCell className="min-w-[12rem]">
                    {isEditing && draft ? (
                      <Input
                        type="url"
                        value={draft.videoUrl}
                        onChange={(e) =>
                          setDraft({ ...draft, videoUrl: e.target.value })
                        }
                        disabled={saving}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <PlainText value={row.videoUrl} />
                    )}
                  </TableCell>
                  {canEdit ? (
                    <TableCell className="sticky right-0 z-10 bg-white text-right shadow-[-1px_0_0_0_#e2e8f0]">
                      {isEditing && draft ? (
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            onClick={cancelEdit}
                            disabled={saving}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                            aria-label="Cancelar edición"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void saveEdit()}
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
                          onClick={() => startEdit(proyecto)}
                          disabled={editingId !== null}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                          aria-label={`Editar ${proyecto.nombre}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </TableCell>
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

function CatalogCell({
  editing,
  items,
  options,
  value,
  onChange,
}: {
  editing: boolean;
  items: string[];
  options: { id: string; nombre: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TableCell className="min-w-[11rem]">
      {editing ? (
        <MultiSelectNombres
          options={options}
          value={value}
          onChange={onChange}
          triggerClassName={selectTrigger}
        />
      ) : (
        <ChipList items={items} />
      )}
    </TableCell>
  );
}

function ChipList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex max-w-[12rem] truncate rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
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
