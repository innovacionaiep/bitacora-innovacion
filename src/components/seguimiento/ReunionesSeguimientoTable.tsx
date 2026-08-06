'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  addCompromiso,
  addReunion,
  updateReunion,
} from '@/lib/actions/seguimiento';
import {
  ClipboardList,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import { getPermissionsForRole } from '@/lib/permissions/check';
import type { RolePermissionMap } from '@/lib/permissions/catalog';
import {
  CompromisoDetalleModal,
  EstadoIcon,
  formatFechaReunion,
  getPostItClass,
  tituloDeDescripcion,
  type CompromisoItem,
} from './compromiso-ui';

type ReunionItem = Awaited<
  ReturnType<typeof import('@/lib/actions/seguimiento').getReunionesProyecto>
>['data'][number];

interface ReunionesSeguimientoTableProps {
  projectId: string;
  reuniones: ReunionItem[];
  rolEnProyecto?: string | null;
  onSuccess: () => void | Promise<void>;
  onOptimisticCompromisoUpdate?: (
    id: string,
    patch: { completado?: boolean; titulo?: string | null; descripcion?: string }
  ) => void;
  onOptimisticCompromisoAdd?: (compromiso: CompromisoItem) => void;
  onOptimisticCompromisoRemove?: (id: string) => void;
  onOptimisticReunionAdd?: (reunion: ReunionItem) => void;
  onOptimisticReunionUpdate?: (
    id: string,
    patch: { fecha?: Date; resumen?: string }
  ) => void;
  onOptimisticReunionRemove?: (id: string) => void;
}

function toDateInputValue(fecha: Date | string): string {
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ReunionesSeguimientoTable({
  projectId,
  reuniones,
  rolEnProyecto,
  onSuccess,
  onOptimisticCompromisoUpdate,
  onOptimisticCompromisoAdd,
  onOptimisticCompromisoRemove,
  onOptimisticReunionAdd,
  onOptimisticReunionUpdate,
  onOptimisticReunionRemove,
}: ReunionesSeguimientoTableProps) {
  const [showAddReunion, setShowAddReunion] = useState(false);
  const [reunionFecha, setReunionFecha] = useState(() =>
    toDateInputValue(new Date())
  );
  const [reunionResumen, setReunionResumen] = useState('');
  const [submittingReunion, setSubmittingReunion] = useState(false);

  const [editingReunion, setEditingReunion] = useState<ReunionItem | null>(
    null
  );
  const [editFecha, setEditFecha] = useState('');
  const [editResumen, setEditResumen] = useState('');
  const [savingReunion, setSavingReunion] = useState(false);

  const [addCompromisoReunionId, setAddCompromisoReunionId] = useState<
    string | null
  >(null);
  const [addTitulo, setAddTitulo] = useState('');
  const [addDescripcion, setAddDescripcion] = useState('');
  const [submittingCompromiso, setSubmittingCompromiso] = useState(false);

  const [selectedCompromiso, setSelectedCompromiso] =
    useState<CompromisoItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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

  const canCreateEdit =
    isAdmin || partPerms?.['compromisos.create_edit'] === true;

  const handleAddReunion = async () => {
    if (!reunionResumen.trim() || !reunionFecha) return;
    const fecha = new Date(`${reunionFecha}T12:00:00`);
    const tempId = `temp-reunion-${Date.now()}`;
    const nextNumero =
      reuniones.reduce((max, r) => Math.max(max, r.numero), 0) + 1;
    const optimistic: ReunionItem = {
      id: tempId,
      proyectoId: projectId,
      numero: nextNumero,
      fecha,
      resumen: reunionResumen.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      compromisos: [],
    } as ReunionItem;

    onOptimisticReunionAdd?.(optimistic);
    setShowAddReunion(false);
    setReunionResumen('');
    setReunionFecha(toDateInputValue(new Date()));

    setSubmittingReunion(true);
    const result = await addReunion(projectId, {
      fecha,
      resumen: optimistic.resumen,
    });
    setSubmittingReunion(false);
    if (result.success) {
      void onSuccess();
    } else {
      onOptimisticReunionRemove?.(tempId);
      alert(result.error ?? 'Error al agregar reunión');
    }
  };

  const openEditReunion = (reunion: ReunionItem) => {
    setEditingReunion(reunion);
    setEditFecha(toDateInputValue(reunion.fecha));
    setEditResumen(reunion.resumen);
  };

  const handleSaveReunion = async () => {
    if (!editingReunion || !editResumen.trim() || !editFecha) return;
    const fecha = new Date(`${editFecha}T12:00:00`);
    const previous = {
      fecha: editingReunion.fecha,
      resumen: editingReunion.resumen,
    };
    onOptimisticReunionUpdate?.(editingReunion.id, {
      fecha,
      resumen: editResumen.trim(),
    });
    setEditingReunion(null);

    setSavingReunion(true);
    const result = await updateReunion(editingReunion.id, {
      fecha,
      resumen: editResumen.trim(),
    });
    setSavingReunion(false);
    if (result.success) {
      void onSuccess();
    } else {
      onOptimisticReunionUpdate?.(editingReunion.id, previous);
      alert(result.error ?? 'Error al actualizar reunión');
    }
  };

  const handleAddCompromiso = async () => {
    if (!addCompromisoReunionId || !addDescripcion.trim()) return;
    const reunionId = addCompromisoReunionId;
    const tempId = `temp-comp-${Date.now()}`;
    const optimistic: CompromisoItem = {
      id: tempId,
      proyectoId: projectId,
      reunionId,
      titulo: addTitulo.trim() || null,
      descripcion: addDescripcion.trim(),
      fechaLimite: null,
      asignadoA: null,
      completado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CompromisoItem;

    onOptimisticCompromisoAdd?.(optimistic);
    setAddCompromisoReunionId(null);
    setAddTitulo('');
    setAddDescripcion('');

    setSubmittingCompromiso(true);
    const result = await addCompromiso(projectId, optimistic.descripcion, {
      reunionId,
      titulo: optimistic.titulo,
    });
    setSubmittingCompromiso(false);
    if (result.success) {
      void onSuccess();
    } else {
      onOptimisticCompromisoRemove?.(tempId);
      alert(result.error ?? 'Error al agregar compromiso');
    }
  };

  return (
    <>
      <div
        id="tour-seguimiento-reuniones"
        className="rounded-xl border border-gray-200 bg-white shadow-lg flex flex-col min-h-0 overflow-hidden"
      >
        <header className="flex-shrink-0 flex items-center justify-between w-full px-3 py-2 bg-gray-100 border-b border-gray-200">
          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-emerald-600" />
            Reuniones
          </h4>
          {canCreateEdit && (
            <Button
              id="tour-seguimiento-agregar-reunion"
              size="icon"
              className="h-7 w-7 rounded-full bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
              onClick={() => setShowAddReunion(true)}
              aria-label="Agregar reunión"
            >
              <Plus className="h-3.5 w-3.5 text-white" />
            </Button>
          )}
        </header>

        <div className="overflow-auto">
          {reuniones.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-sm text-gray-500">No hay reuniones registradas</p>
              {canCreateEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAddReunion(true)}
                >
                  Agregar primera reunión
                </Button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-2.5 font-semibold w-[88px]">
                    N° de reunión
                  </th>
                  <th className="px-3 py-2.5 font-semibold w-[120px]">Fecha</th>
                  <th className="px-3 py-2.5 font-semibold min-w-[160px]">
                    Resumen
                  </th>
                  <th className="px-3 py-2.5 font-semibold">Compromisos</th>
                </tr>
              </thead>
              <tbody>
                {reuniones.map((reunion) => (
                  <tr
                    key={reunion.id}
                    className="border-b border-gray-100 align-top hover:bg-gray-50/50"
                  >
                    <td className="px-3 py-3">
                      <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-md bg-emerald-50 px-2 text-sm font-semibold text-emerald-700">
                        {reunion.numero}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">
                      {canCreateEdit ? (
                        <button
                          type="button"
                          className="text-left hover:text-emerald-700 hover:underline"
                          onClick={() => openEditReunion(reunion)}
                        >
                          {formatFechaReunion(reunion.fecha)}
                        </button>
                      ) : (
                        formatFechaReunion(reunion.fecha)
                      )}
                    </td>
                    <td className="px-3 py-3 text-gray-700">
                      {canCreateEdit ? (
                        <button
                          type="button"
                          className="text-left whitespace-pre-wrap break-words hover:text-emerald-700"
                          onClick={() => openEditReunion(reunion)}
                        >
                          {reunion.resumen}
                        </button>
                      ) : (
                        <p className="whitespace-pre-wrap break-words">
                          {reunion.resumen}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2 items-start">
                        {reunion.compromisos.map((compromiso) => (
                          <button
                            key={compromiso.id}
                            type="button"
                            onClick={() => {
                              setSelectedCompromiso(
                                compromiso as CompromisoItem
                              );
                              setDetailOpen(true);
                            }}
                            className={`rounded-md border shadow-sm px-2 py-1.5 max-w-[160px] text-left cursor-pointer hover:shadow transition-shadow ${getPostItClass(compromiso)}`}
                          >
                            <div className="flex items-start gap-1">
                              <p
                                className={`text-xs font-medium line-clamp-2 flex-1 min-w-0 ${
                                  compromiso.completado
                                    ? 'line-through text-gray-600'
                                    : 'text-gray-900'
                                }`}
                              >
                                {compromiso.titulo?.trim() ||
                                  tituloDeDescripcion(
                                    compromiso.descripcion,
                                    40
                                  )}
                              </p>
                              <EstadoIcon
                                compromiso={compromiso}
                                className="h-3.5 w-3.5"
                              />
                            </div>
                          </button>
                        ))}
                        {canCreateEdit && (
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 flex-shrink-0 border-dashed border-gray-300 text-gray-500 hover:text-emerald-700 hover:border-emerald-400"
                            onClick={() =>
                              setAddCompromisoReunionId(reunion.id)
                            }
                            aria-label={`Agregar compromiso a reunión ${reunion.numero}`}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Nueva reunión */}
      <Dialog open={showAddReunion} onOpenChange={setShowAddReunion}>
        <DialogContent className="sm:max-w-lg gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg">
          <DialogHeader className="space-y-0 border-b border-gray-100 bg-gray-50/90 px-5 py-3 text-left">
            <DialogTitle className="m-0 flex items-center gap-2 text-[13px] font-medium leading-none tracking-wide text-gray-800">
              <ClipboardList className="size-3.5 shrink-0 text-emerald-600" />
              Nueva reunión
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Fecha
              </Label>
              <Input
                type="date"
                value={reunionFecha}
                onChange={(e) => setReunionFecha(e.target.value)}
                className="w-full border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Resumen
              </Label>
              <Textarea
                value={reunionResumen}
                onChange={(e) => setReunionResumen(e.target.value)}
                placeholder="Resumen de lo conversado en la reunión..."
                rows={4}
                className="resize-none border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 px-5 py-3 gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowAddReunion(false)}
              disabled={submittingReunion}
              className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={handleAddReunion}
              disabled={
                !reunionResumen.trim() || !reunionFecha || submittingReunion
              }
              className="h-7 px-2 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent"
            >
              {submittingReunion ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Crear reunión'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar reunión */}
      <Dialog
        open={!!editingReunion}
        onOpenChange={(open) => !open && setEditingReunion(null)}
      >
        <DialogContent className="sm:max-w-lg gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg">
          <DialogHeader className="space-y-0 border-b border-gray-100 bg-gray-50/90 px-5 py-3 text-left">
            <DialogTitle className="m-0 flex items-center gap-2 text-[13px] font-medium leading-none tracking-wide text-gray-800">
              <ClipboardList className="size-3.5 shrink-0 text-emerald-600" />
              Editar reunión N° {editingReunion?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Fecha
              </Label>
              <Input
                type="date"
                value={editFecha}
                onChange={(e) => setEditFecha(e.target.value)}
                className="w-full border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Resumen
              </Label>
              <Textarea
                value={editResumen}
                onChange={(e) => setEditResumen(e.target.value)}
                rows={4}
                className="resize-none border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 px-5 py-3 gap-3">
            <Button
              variant="ghost"
              onClick={() => setEditingReunion(null)}
              disabled={savingReunion}
              className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={handleSaveReunion}
              disabled={!editResumen.trim() || !editFecha || savingReunion}
              className="h-7 px-2 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent"
            >
              {savingReunion ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nuevo compromiso desde reunión */}
      <Dialog
        open={!!addCompromisoReunionId}
        onOpenChange={(open) => {
          if (!open) {
            setAddCompromisoReunionId(null);
            setAddTitulo('');
            setAddDescripcion('');
          }
        }}
      >
        <DialogContent className="sm:max-w-lg gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg">
          <DialogHeader className="space-y-0 border-b border-gray-100 bg-gray-50/90 px-5 py-3 text-left">
            <DialogTitle className="m-0 flex items-center gap-2 text-[13px] font-medium leading-none tracking-wide text-gray-800">
              <ClipboardList className="size-3.5 shrink-0 text-emerald-600" />
              Nuevo compromiso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Título
              </Label>
              <Input
                value={addTitulo}
                onChange={(e) => setAddTitulo(e.target.value)}
                placeholder="Título breve (se muestra en la tarjeta)"
                className="w-full border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Descripción
              </Label>
              <Textarea
                value={addDescripcion}
                onChange={(e) => setAddDescripcion(e.target.value)}
                placeholder="Escriba el compromiso..."
                rows={4}
                className="resize-none border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>
          </div>
          <DialogFooter className="border-t border-gray-100 px-5 py-3 gap-3">
            <Button
              variant="ghost"
              onClick={() => setAddCompromisoReunionId(null)}
              disabled={submittingCompromiso}
              className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              variant="ghost"
              onClick={handleAddCompromiso}
              disabled={!addDescripcion.trim() || submittingCompromiso}
              className="h-7 px-2 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent"
            >
              {submittingCompromiso ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Crear compromiso'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CompromisoDetalleModal
        compromiso={selectedCompromiso}
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setSelectedCompromiso(null);
        }}
        rolEnProyecto={rolEnProyecto}
        onSuccess={onSuccess}
        onOptimisticCompromisoUpdate={onOptimisticCompromisoUpdate}
      />
    </>
  );
}
