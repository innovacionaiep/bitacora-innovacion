'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  updateCompromiso,
  toggleCompromiso,
  deleteCompromiso,
} from '@/lib/actions/seguimiento';
import {
  ClipboardCheck,
  CircleAlert,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import { getPermissionsForRole } from '@/lib/permissions/check';
import type { RolePermissionMap } from '@/lib/permissions/catalog';

export type CompromisoItem = Awaited<
  ReturnType<typeof import('@/lib/actions/seguimiento').getCompromisosProyecto>
>['data'][number];

export const POST_IT_ROJO = 'bg-red-100 border-red-300 shadow-red-200/50';
export const POST_IT_VERDE =
  'bg-emerald-100 border-emerald-400 shadow-emerald-300/50';

export function getPostItClass(compromiso: {
  completado: boolean;
}): string {
  return compromiso.completado ? POST_IT_VERDE : POST_IT_ROJO;
}

export function EstadoIcon({
  compromiso,
  className = 'h-5 w-5',
}: {
  compromiso: { completado: boolean };
  className?: string;
}) {
  if (compromiso.completado) {
    return (
      <span className="flex-shrink-0 text-emerald-600" aria-label="Realizada">
        <CheckCircle className={className} />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 text-red-600" aria-label="Pendiente">
      <CircleAlert className={className} />
    </span>
  );
}

export function tituloDeDescripcion(
  descripcion: string,
  maxLength = 60
): string {
  const firstLine = descripcion.split(/\n/)[0].trim();
  if (!firstLine) return 'Sin título';
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.slice(0, maxLength).trim() + '…';
}

export function formatFechaCreacion(createdAt: Date | string): string {
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatFechaReunion(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface CompromisoDetalleModalProps {
  compromiso: CompromisoItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rolEnProyecto?: string | null;
  onSuccess: () => void | Promise<void>;
  onOptimisticCompromisoUpdate?: (
    id: string,
    patch: {
      completado?: boolean;
      titulo?: string | null;
      descripcion?: string;
    }
  ) => void;
  onOptimisticCompromisoRemove?: (id: string) => void;
  /** Sync ligero tras toggle (sin refetch completo). */
  onBackgroundSync?: () => void;
}

export function CompromisoDetalleModal({
  compromiso,
  open,
  onOpenChange,
  rolEnProyecto,
  onSuccess,
  onOptimisticCompromisoUpdate,
  onOptimisticCompromisoRemove,
  onBackgroundSync,
}: CompromisoDetalleModalProps) {
  const [selected, setSelected] = useState<CompromisoItem | null>(compromiso);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data: session } = useSession();
  const availableRoles = session?.user?.availableRoles ?? [];
  const isAdmin = userHasAdminEnabled(availableRoles);
  const [partPerms, setPartPerms] = useState<RolePermissionMap | null>(null);

  useEffect(() => {
    if (!rolEnProyecto) {
      setPartPerms(null);
      return;
    }
    let cancelled = false;
    getPermissionsForRole(rolEnProyecto).then((map) => {
      if (!cancelled) setPartPerms(map);
    });
    return () => {
      cancelled = true;
    };
  }, [rolEnProyecto]);

  useEffect(() => {
    if (compromiso && open) {
      setSelected(compromiso);
      setIsEditing(false);
      setEditTitulo(compromiso.titulo ?? '');
      setEditDescripcion(compromiso.descripcion);
      setDeleting(false);
    }
  }, [compromiso, open]);

  const isCoordinadorOrAdmin =
    isAdmin || partPerms?.['compromisos.create_edit'] === true;
  const canMarkRealizado =
    isAdmin || partPerms?.['compromisos.mark_done'] === true;

  if (!selected || !open) return null;

  const handleToggleRealizado = async (id: string) => {
    if (!canMarkRealizado || toggling || !selected) return;
    const prevCompletado = selected.completado;
    const nextCompletado = !prevCompletado;

    onOptimisticCompromisoUpdate?.(id, { completado: nextCompletado });
    setSelected((prev) =>
      prev?.id === id ? { ...prev, completado: nextCompletado } : prev
    );
    setToggling(true);
    const result = await toggleCompromiso(id);
    setToggling(false);

    if (result.success) {
      onBackgroundSync?.();
    } else {
      onOptimisticCompromisoUpdate?.(id, { completado: prevCompletado });
      setSelected((prev) =>
        prev?.id === id ? { ...prev, completado: prevCompletado } : prev
      );
      alert(result.error ?? 'Error al actualizar el compromiso');
    }
  };

  const handleSaveEdit = async () => {
    const previous = selected;
    const nextTitulo = editTitulo.trim() || null;
    const nextDescripcion = editDescripcion.trim();

    onOptimisticCompromisoUpdate?.(selected.id, {
      titulo: nextTitulo,
      descripcion: nextDescripcion,
    });
    setSelected({
      ...selected,
      titulo: nextTitulo,
      descripcion: nextDescripcion,
    });
    setIsEditing(false);

    setSavingEdit(true);
    const result = await updateCompromiso(selected.id, {
      titulo: nextTitulo,
      descripcion: nextDescripcion,
    });
    setSavingEdit(false);
    if (result.success) {
      void onSuccess();
    } else {
      onOptimisticCompromisoUpdate?.(previous.id, {
        titulo: previous.titulo,
        descripcion: previous.descripcion,
      });
      setSelected(previous);
      setIsEditing(true);
      alert(result.error ?? 'Error al guardar compromiso');
    }
  };

  const handleDelete = async () => {
    if (
      !isCoordinadorOrAdmin ||
      deleting ||
      !confirm('¿Eliminar este compromiso? Esta acción no se puede deshacer.')
    ) {
      return;
    }

    const id = selected.id;
    onOptimisticCompromisoRemove?.(id);
    onOpenChange(false);
    setDeleting(true);
    const result = await deleteCompromiso(id);
    setDeleting(false);
    if (result.success) {
      void onSuccess();
    } else {
      void onSuccess();
      alert(result.error ?? 'Error al eliminar compromiso');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg [&>button]:hidden">
        <DialogHeader className="space-y-0 border-b border-gray-100 bg-gray-50/90 px-5 py-3 text-left">
          <DialogTitle className="m-0 flex items-center justify-between gap-3 text-[13px] font-medium leading-none tracking-wide text-gray-800">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <ClipboardCheck
                className={`size-3.5 shrink-0 ${
                  selected.completado ? 'text-emerald-600' : 'text-red-600'
                }`}
              />
              {isEditing ? (
                <Input
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  placeholder="Título del compromiso"
                  className="flex-1 h-8 border-gray-200 bg-white text-[13px] font-medium shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                />
              ) : (
                <>
                  <span className="truncate min-w-0 leading-none">
                    {selected.titulo?.trim() ||
                      tituloDeDescripcion(selected.descripcion || '', 50)}
                  </span>
                  <span
                    aria-hidden
                    className="h-3 w-px shrink-0 bg-gray-300 self-center"
                  />
                  <span className="shrink-0 text-[11px] font-normal leading-none text-gray-400 whitespace-nowrap">
                    {formatFechaCreacion(selected.createdAt)}
                  </span>
                </>
              )}
            </div>
            <EstadoIcon compromiso={selected} />
          </DialogTitle>
        </DialogHeader>
        <div className={`space-y-4 px-5 py-5 ${getPostItClass(selected)}`}>
          <div className="space-y-2">
            <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
              Descripción
            </Label>
            {isEditing ? (
              <Textarea
                value={editDescripcion}
                onChange={(e) => setEditDescripcion(e.target.value)}
                placeholder="Escriba el compromiso..."
                rows={4}
                className="resize-none border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            ) : (
              <p
                className={`text-sm whitespace-pre-wrap break-words break-all ${
                  selected.completado
                    ? 'line-through text-gray-600'
                    : 'text-gray-900'
                }`}
              >
                {selected.descripcion}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 pt-2 border-t border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer text-[13px] text-gray-600">
              <Checkbox
                checked={selected.completado}
                onCheckedChange={() =>
                  canMarkRealizado && handleToggleRealizado(selected.id)
                }
                disabled={!canMarkRealizado || deleting || toggling}
                className="border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:border-emerald-600 focus-visible:ring-emerald-500/40"
              />
              {selected.completado ? 'Realizada' : 'Marcar como realizada'}
            </label>
          </div>
        </div>
        <DialogFooter className="border-t border-gray-100 px-5 py-3 gap-3">
          {isEditing ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setIsEditing(false);
                  setEditTitulo(selected.titulo ?? '');
                  setEditDescripcion(selected.descripcion ?? '');
                }}
                disabled={savingEdit}
                className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
              >
                Cancelar edición
              </Button>
              <Button
                variant="ghost"
                onClick={handleSaveEdit}
                disabled={
                  !editDescripcion.trim() ||
                  savingEdit ||
                  (editDescripcion.trim() === selected.descripcion &&
                    (editTitulo.trim() || null) === (selected.titulo ?? null))
                }
                className="h-7 px-2 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent"
              >
                {savingEdit ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Guardar'
                )}
              </Button>
            </>
          ) : (
            <>
              {isCoordinadorOrAdmin && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="h-7 px-2 text-[13px] font-normal text-red-600 hover:text-red-700 hover:bg-transparent mr-auto"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Eliminar'
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsEditing(true)}
                    disabled={deleting}
                    className="h-7 px-2 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent"
                  >
                    Editar
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={deleting}
                className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
              >
                Cerrar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
