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
  toggleCompromiso,
  updateCompromiso,
  deleteCompromiso,
} from '@/lib/actions/seguimiento';
import {
  ClipboardCheck,
  CircleAlert,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useActiveRolePermissions } from '@/components/permissions/ActiveRolePermissionsProvider';
import { getPostItClass } from '@/components/seguimiento/compromiso-ui';

type CompromisoPortal = Awaited<
  ReturnType<typeof import('@/lib/actions/seguimiento').getCompromisosPendientesParaUsuario>
>['data'][number];

const PANEL_SHELL =
  'h-full flex flex-col rounded-lg border border-gray-200 bg-white shadow-none overflow-hidden';
const PANEL_HEADER =
  'flex-shrink-0 px-5 py-3 border-b border-gray-100 bg-gray-50/90';
const PANEL_TITLE =
  'text-[13px] font-medium tracking-wide text-gray-800 flex items-center gap-2';

function EstadoIcon({ compromiso }: { compromiso: CompromisoPortal }) {
  if (compromiso.completado)
    return (
      <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" strokeWidth={1.75} />
    );
  return (
    <CircleAlert className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.75} />
  );
}

function tituloDeDescripcion(desc: string, max = 50): string {
  const first = desc.split(/\n/)[0].trim();
  if (!first) return 'Sin título';
  return first.length <= max ? first : first.slice(0, max).trim() + '…';
}

function formatFecha(createdAt: Date | string): string {
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function PanelTitle() {
  return (
    <h3 className={PANEL_TITLE}>
      <ClipboardCheck className="h-3.5 w-3.5 text-gray-500" strokeWidth={1.75} />
      Compromisos pendientes
    </h3>
  );
}

export interface PortalCompromisosPendientesProps {
  compromisos: CompromisoPortal[];
  activeRole: string | null;
  onSuccess: () => void | Promise<void>;
  loading?: boolean;
  /** `column`: solo título + lista, sin tarjeta contenedora (layout del portal). */
  variant?: 'panel' | 'column';
}

export function PortalCompromisosPendientes({
  compromisos: compromisosProp,
  activeRole: _activeRole,
  onSuccess,
  loading = false,
  variant = 'panel',
}: PortalCompromisosPendientesProps) {
  const isColumn = variant === 'column';
  const [compromisos, setCompromisos] = useState(compromisosProp);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedCompromiso, setSelectedCompromiso] =
    useState<CompromisoPortal | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isEditingCompromiso, setIsEditingCompromiso] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setCompromisos(compromisosProp);
  }, [compromisosProp]);

  const { can } = useActiveRolePermissions();
  const isCoordinadorOrAdmin = can('compromisos.create_edit');
  const canMarkRealizado = can('compromisos.mark_done');

  const handleToggleRealizado = async (id: string) => {
    if (!canMarkRealizado || togglingId === id) return;
    const current = compromisos.find((c) => c.id === id);
    if (!current) return;

    const nextCompletado = !current.completado;

    setCompromisos((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, completado: nextCompletado } : c
      )
    );
    setSelectedCompromiso((prev) =>
      prev?.id === id ? { ...prev, completado: nextCompletado } : prev
    );

    // En el listado de pendientes: al marcar realizado, sacar de inmediato.
    if (nextCompletado) {
      setCompromisos((prev) => prev.filter((c) => c.id !== id));
      if (selectedCompromiso?.id === id) {
        setSelectedCompromiso(null);
        setDetailModalOpen(false);
        setIsEditingCompromiso(false);
      }
    }

    setTogglingId(id);
    const result = await toggleCompromiso(id);
    setTogglingId(null);

    if (result.success) {
      void onSuccess();
    } else {
      // Revertir
      if (nextCompletado) {
        setCompromisos((prev) => [current, ...prev]);
      } else {
        setCompromisos((prev) =>
          prev.map((c) =>
            c.id === id ? { ...c, completado: current.completado } : c
          )
        );
      }
      setSelectedCompromiso((prev) =>
        prev?.id === id
          ? { ...prev, completado: current.completado }
          : prev
      );
      alert(result.error ?? 'Error al actualizar el compromiso');
    }
  };

  const handleOpenDetail = (compromiso: CompromisoPortal) => {
    setSelectedCompromiso(compromiso);
    setDetailModalOpen(true);
    setIsEditingCompromiso(false);
    setEditTitulo(compromiso.titulo ?? '');
    setEditDescripcion(compromiso.descripcion);
  };

  const handleSaveEdit = async () => {
    if (!selectedCompromiso) return;
    const previous = selectedCompromiso;
    const nextTitulo = editTitulo.trim() || null;
    const nextDescripcion = editDescripcion.trim();

    setCompromisos((prev) =>
      prev.map((c) =>
        c.id === previous.id
          ? { ...c, titulo: nextTitulo, descripcion: nextDescripcion }
          : c
      )
    );
    setSelectedCompromiso({
      ...previous,
      titulo: nextTitulo,
      descripcion: nextDescripcion,
    });
    setIsEditingCompromiso(false);

    setSavingEdit(true);
    const result = await updateCompromiso(previous.id, {
      titulo: nextTitulo,
      descripcion: nextDescripcion,
    });
    setSavingEdit(false);
    if (result.success) {
      void onSuccess();
    } else {
      setCompromisos((prev) =>
        prev.map((c) => (c.id === previous.id ? previous : c))
      );
      setSelectedCompromiso(previous);
      setIsEditingCompromiso(true);
      alert(result.error ?? 'Error al guardar compromiso');
    }
  };

  const handleCloseDetail = () => {
    setSelectedCompromiso(null);
    setIsEditingCompromiso(false);
    setDetailModalOpen(false);
  };

  const handleDelete = async () => {
    if (
      !selectedCompromiso ||
      !isCoordinadorOrAdmin ||
      deleting ||
      !confirm('¿Eliminar este compromiso? Esta acción no se puede deshacer.')
    ) {
      return;
    }

    const id = selectedCompromiso.id;
    setCompromisos((prev) => prev.filter((c) => c.id !== id));
    handleCloseDetail();
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

  if (loading) {
    if (isColumn) {
      return (
        <section className="min-w-0 min-h-0 h-full flex flex-col gap-2">
          <PanelTitle />
          <div className="min-h-[48px]" />
        </section>
      );
    }
    return (
      <div className={PANEL_SHELL}>
        <div className={PANEL_HEADER}>
          <PanelTitle />
        </div>
        <div className="flex-1 min-h-[80px]" />
      </div>
    );
  }

  const list = compromisos.filter(
    (c) => c.descripcion && c.descripcion.trim()
  );

  const listContent =
    list.length === 0 ? (
      <p className="text-[13px] text-gray-400">
        No hay compromisos pendientes.
      </p>
    ) : (
      <div
        className={
          isColumn
            ? 'flex flex-col gap-2'
            : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
        }
      >
        {list.map((c) => {
          const titulo =
            c.titulo?.trim() || tituloDeDescripcion(c.descripcion);
          const proyectoNombre =
            (c as CompromisoPortal & { proyecto?: { proyecto?: string } })
              .proyecto?.proyecto ?? '';

          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenDetail(c)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenDetail(c);
                }
              }}
              className={
                isColumn
                  ? `rounded-lg border-2 shadow-sm p-2.5 flex flex-col text-left cursor-pointer hover:shadow-md transition-shadow ${getPostItClass(c)}`
                  : `rounded-lg border-2 shadow-sm p-3 min-h-[120px] flex flex-col text-left cursor-pointer hover:shadow-md transition-shadow ${getPostItClass(c)}`
              }
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p
                  className={`text-[13px] font-medium flex-1 min-w-0 line-clamp-2 break-words [overflow-wrap:anywhere] ${
                    c.completado
                      ? 'line-through text-gray-500'
                      : 'text-gray-900'
                  }`}
                  title={c.descripcion}
                >
                  {titulo}
                </p>
                <EstadoIcon compromiso={c} />
              </div>
              {proyectoNombre && (
                <p className="text-[11px] text-gray-500 tracking-wide mb-1 break-words [overflow-wrap:anywhere]">
                  Proyecto: &quot;{proyectoNombre}&quot;
                </p>
              )}
              <p className="text-[11px] text-gray-400 mb-2">
                Creado: {formatFecha(c.createdAt)}
              </p>
              <div
                className="flex flex-wrap gap-3 mt-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="flex items-center gap-2 cursor-pointer text-[13px] text-gray-600">
                  <Checkbox
                    checked={c.completado}
                    onCheckedChange={() => handleToggleRealizado(c.id)}
                    disabled={!canMarkRealizado || togglingId === c.id}
                    className="border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:border-emerald-600 focus-visible:ring-emerald-500/40"
                  />
                  {c.completado ? 'Realizada' : 'Marcar como realizada'}
                </label>
              </div>
            </div>
          );
        })}
      </div>
    );

  return (
    <>
      {isColumn ? (
        <section className="min-w-0 min-h-0 h-full flex flex-col gap-2">
          <PanelTitle />
          <div className="min-h-0 flex-1 overflow-auto pr-1">{listContent}</div>
        </section>
      ) : (
        <div className={PANEL_SHELL}>
          <div className={PANEL_HEADER}>
            <PanelTitle />
          </div>
          <div className="flex-1 min-h-0 overflow-auto px-5 py-3">
            {listContent}
          </div>
        </div>
      )}

      {selectedCompromiso && detailModalOpen && (
        <Dialog
          open={true}
          onOpenChange={(open) => !open && handleCloseDetail()}
        >
          <DialogContent className="sm:max-w-lg gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg [&>button]:hidden">
            <DialogHeader className="space-y-0 border-b border-gray-100 bg-gray-50/90 px-5 py-3 text-left">
              <DialogTitle className="m-0 flex items-center justify-between gap-3 text-[13px] font-medium leading-none tracking-wide text-gray-800">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <ClipboardCheck
                    className={
                      selectedCompromiso.completado
                        ? 'size-3.5 shrink-0 text-emerald-600'
                        : 'size-3.5 shrink-0 text-red-600'
                    }
                  />
                  {isEditingCompromiso ? (
                    <Input
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      placeholder="Título del compromiso"
                      className="flex-1 h-8 border-gray-200 bg-white text-[13px] font-medium shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                    />
                  ) : (
                    <>
                      <span className="truncate min-w-0 leading-none">
                        {selectedCompromiso.titulo?.trim() ||
                          tituloDeDescripcion(
                            selectedCompromiso.descripcion,
                            50
                          )}
                      </span>
                      <span
                        aria-hidden
                        className="h-3 w-px shrink-0 bg-gray-300 self-center"
                      />
                      <span className="shrink-0 text-[11px] font-normal leading-none text-gray-400 whitespace-nowrap">
                        {formatFecha(selectedCompromiso.createdAt)}
                      </span>
                    </>
                  )}
                </div>
                <EstadoIcon compromiso={selectedCompromiso} />
              </DialogTitle>
            </DialogHeader>
            <div
              className={`space-y-4 px-5 py-5 ${getPostItClass(selectedCompromiso)}`}
            >
              <div className="space-y-2">
                <Label className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                  Descripción
                </Label>
                {isEditingCompromiso ? (
                  <Textarea
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    placeholder="Escriba el compromiso..."
                    rows={4}
                    className="resize-none border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                  />
                ) : (
                  <p
                    className={`text-[15px] leading-[1.75] whitespace-pre-wrap break-words break-all ${
                      selectedCompromiso.completado
                        ? 'line-through text-gray-500'
                        : 'text-gray-800'
                    }`}
                  >
                    {selectedCompromiso.descripcion}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedCompromiso.completado}
                    onCheckedChange={() =>
                      canMarkRealizado &&
                      handleToggleRealizado(selectedCompromiso.id)
                    }
                    disabled={
                      !canMarkRealizado || togglingId === selectedCompromiso.id
                    }
                    className="border-gray-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:border-emerald-600 focus-visible:ring-emerald-500/40"
                  />
                  <span className="text-[13px] font-medium text-gray-700">
                    {selectedCompromiso.completado
                      ? 'Realizada'
                      : 'Marcar como realizada'}
                  </span>
                </label>
              </div>
            </div>
            <DialogFooter className="border-t border-gray-100 px-5 py-3 gap-3 sm:justify-between sm:space-x-0">
              {(
                selectedCompromiso as CompromisoPortal & {
                  proyecto?: { proyecto?: string };
                }
              ).proyecto?.proyecto ? (
                <p className="min-w-0 flex-1 text-left text-[11px] text-gray-500 break-words [overflow-wrap:anywhere] self-center mr-auto">
                  Proyecto: &quot;
                  {
                    (
                      selectedCompromiso as CompromisoPortal & {
                        proyecto?: { proyecto?: string };
                      }
                    ).proyecto?.proyecto
                  }
                  &quot;
                </p>
              ) : (
                <span className="flex-1 mr-auto" aria-hidden />
              )}
              <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
              {isEditingCompromiso ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setIsEditingCompromiso(false);
                      setEditTitulo(selectedCompromiso.titulo ?? '');
                      setEditDescripcion(selectedCompromiso.descripcion ?? '');
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
                      (editDescripcion.trim() ===
                        selectedCompromiso.descripcion &&
                        (editTitulo.trim() || null) ===
                          (selectedCompromiso.titulo ?? null))
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
                        className="h-7 px-2 text-[13px] font-normal text-red-600 hover:text-red-700 hover:bg-transparent"
                      >
                        {deleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Eliminar'
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setIsEditingCompromiso(true)}
                        disabled={deleting}
                        className="h-7 px-2 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent"
                      >
                        Editar
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    onClick={handleCloseDetail}
                    disabled={deleting}
                    className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
                  >
                    Cerrar
                  </Button>
                </>
              )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
