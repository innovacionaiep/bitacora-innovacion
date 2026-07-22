'use client';

import { useState } from 'react';
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
  addCompromiso,
  updateCompromiso,
  toggleCompromiso,
} from '@/lib/actions/seguimiento';
import {
  Plus,
  Loader2,
  ClipboardCheck,
  CircleAlert,
  CheckCircle,
} from 'lucide-react';

type CompromisoItem = Awaited<
  ReturnType<typeof import('@/lib/actions/seguimiento').getCompromisosProyecto>
>['data'][number];

const POST_IT_ROJO = 'bg-red-100 border-red-300 shadow-red-200/50';
const POST_IT_VERDE = 'bg-emerald-100 border-emerald-400 shadow-emerald-300/50';

/** Clase de la tarjeta según estado: realizado (verde) o pendiente (rojo). */
function getPostItClass(compromiso: CompromisoItem): string {
  return compromiso.completado ? POST_IT_VERDE : POST_IT_ROJO;
}

/** Icono y etiqueta de estado para la tarjeta (esquina superior derecha). */
function EstadoIcon({ compromiso }: { compromiso: CompromisoItem }) {
  if (compromiso.completado) {
    return (
      <span className="flex-shrink-0 text-emerald-600" aria-label="Realizada">
        <CheckCircle className="h-5 w-5" />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 text-red-600" aria-label="Pendiente">
      <CircleAlert className="h-5 w-5" />
    </span>
  );
}

/** Título para la tarjeta: primera línea de la descripción, truncada. */
function tituloDeDescripcion(descripcion: string, maxLength = 60): string {
  const firstLine = descripcion.split(/\n/)[0].trim();
  if (!firstLine) return 'Sin título';
  if (firstLine.length <= maxLength) return firstLine;
  return firstLine.slice(0, maxLength).trim() + '…';
}

/** Formatea la fecha de creación para mostrar en tarjeta y modal. */
function formatFechaCreacion(createdAt: Date | string): string {
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface CompromisosPostItWallProps {
  projectId: string;
  compromisos: CompromisoItem[];
  rolEnProyecto?: string | null;
  /** Rol activo del usuario (ej. Admin). Los Admin pueden crear compromisos. */
  activeRole?: string | null;
  onSuccess: () => void | Promise<void>;
  /** Actualización optimista del listado (toggle / edit). */
  onOptimisticCompromisoUpdate?: (
    id: string,
    patch: { completado?: boolean; titulo?: string | null; descripcion?: string }
  ) => void;
  /** Inserta un compromiso temporal al agregar. */
  onOptimisticCompromisoAdd?: (compromiso: CompromisoItem) => void;
  /** Quita un compromiso temporal si falla el add. */
  onOptimisticCompromisoRemove?: (id: string) => void;
}

export function CompromisosPostItWall({
  projectId,
  compromisos,
  rolEnProyecto,
  activeRole,
  onSuccess,
  onOptimisticCompromisoUpdate,
  onOptimisticCompromisoAdd,
  onOptimisticCompromisoRemove,
}: CompromisosPostItWallProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTitulo, setAddTitulo] = useState('');
  const [addDescripcion, setAddDescripcion] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedCompromiso, setSelectedCompromiso] =
    useState<CompromisoItem | null>(null);
  const [isEditingCompromiso, setIsEditingCompromiso] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const isCoordinadorOrAdmin =
    rolEnProyecto === 'Coordinador' || activeRole === 'Admin';
  const canMarkRealizado =
    rolEnProyecto === 'Encargado' || activeRole === 'Admin';

  const handleAdd = async () => {
    if (!addDescripcion.trim()) return;
    const tempId = `temp-comp-${Date.now()}`;
    const optimistic: CompromisoItem = {
      id: tempId,
      proyectoId: projectId,
      titulo: addTitulo.trim() || null,
      descripcion: addDescripcion.trim(),
      fechaLimite: null,
      asignadoA: null,
      completado: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as CompromisoItem;

    onOptimisticCompromisoAdd?.(optimistic);
    setShowAddModal(false);
    setAddTitulo('');
    setAddDescripcion('');

    setSubmitting(true);
    const result = await addCompromiso(projectId, optimistic.descripcion, {
      titulo: optimistic.titulo,
    });
    setSubmitting(false);
    if (result.success) {
      void onSuccess();
    } else {
      onOptimisticCompromisoRemove?.(tempId);
      alert(result.error ?? 'Error al agregar compromiso');
    }
  };

  const handleToggleRealizado = async (id: string) => {
    const compromiso = compromisos.find((c) => c.id === id);
    if (compromiso) {
      onOptimisticCompromisoUpdate?.(id, {
        completado: !compromiso.completado,
      });
      setSelectedCompromiso((prev) =>
        prev?.id === id ? { ...prev, completado: !prev.completado } : prev
      );
    }
    setTogglingId(id);
    const result = await toggleCompromiso(id);
    setTogglingId(null);
    if (result.success) {
      void onSuccess();
    } else if (compromiso) {
      onOptimisticCompromisoUpdate?.(id, {
        completado: compromiso.completado,
      });
      setSelectedCompromiso((prev) =>
        prev?.id === id
          ? { ...prev, completado: compromiso.completado }
          : prev
      );
      void onSuccess();
    }
  };

  const handleOpenDetail = (compromiso: CompromisoItem) => {
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

    onOptimisticCompromisoUpdate?.(selectedCompromiso.id, {
      titulo: nextTitulo,
      descripcion: nextDescripcion,
    });
    setSelectedCompromiso({
      ...selectedCompromiso,
      titulo: nextTitulo,
      descripcion: nextDescripcion,
    });
    setIsEditingCompromiso(false);

    setSavingEdit(true);
    const result = await updateCompromiso(selectedCompromiso.id, {
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

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between w-full px-3 py-2 bg-gray-100 border-b border-gray-200 rounded-t-xl">
          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
            Compromisos pendientes
          </h4>
          {isCoordinadorOrAdmin && (
            <Button
              size="icon"
              className="h-7 w-7 rounded-full bg-emerald-600 hover:bg-emerald-700 flex-shrink-0"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-3.5 w-3.5 text-white" />
            </Button>
          )}
        </header>
        <div className="flex-1 overflow-auto min-h-0 p-4">
          {compromisos.length === 0 ? (
            <div className="text-center py-8 rounded-lg bg-gray-50/50">
              <p className="text-sm text-gray-500">
                No hay compromisos pendientes
              </p>
              {isCoordinadorOrAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowAddModal(true)}
                >
                  Agregar primer compromiso
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
              {compromisos
                .filter(
                  (compromiso) =>
                    compromiso.descripcion && compromiso.descripcion.trim()
                )
                .map((compromiso) => {
                  const titulo =
                    compromiso.titulo?.trim() ||
                    tituloDeDescripcion(compromiso.descripcion);

                  return (
                    <div
                      key={compromiso.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleOpenDetail(compromiso)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenDetail(compromiso);
                        }
                      }}
                      className={`rounded-lg border-2 shadow-md p-3 min-h-[120px] flex flex-col text-left w-full min-w-0 cursor-pointer hover:shadow-lg transition-all duration-200 ${getPostItClass(compromiso)}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p
                          className={`text-sm font-medium flex-1 min-w-0 line-clamp-1 break-words ${
                            compromiso.completado
                              ? 'line-through text-gray-600'
                              : 'text-gray-900'
                          }`}
                          title={compromiso.descripcion}
                        >
                          {compromiso.titulo?.trim() ||
                            tituloDeDescripcion(compromiso.descripcion)}
                        </p>
                        <EstadoIcon compromiso={compromiso} />
                      </div>
                      <p className="text-xs text-gray-500 mb-2 flex-shrink-0">
                        Creado: {formatFechaCreacion(compromiso.createdAt)}
                      </p>
                      <div
                        className="flex flex-wrap gap-3 mt-auto flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                          {togglingId === compromiso.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                          ) : (
                            <Checkbox
                              checked={compromiso.completado}
                              onCheckedChange={() =>
                                canMarkRealizado &&
                                handleToggleRealizado(compromiso.id)
                              }
                              disabled={!canMarkRealizado}
                              className="border-gray-400/60 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:border-emerald-700"
                            />
                          )}
                          <span className="text-xs font-medium text-gray-700 whitespace-nowrap">
                            Realizado (Encargado)
                          </span>
                        </label>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Popup detalle del compromiso (mismo diseño que crear) */}
      {selectedCompromiso && detailModalOpen && (
        <Dialog
          open={true}
          onOpenChange={(open) => !open && handleCloseDetail()}
        >
          <DialogContent
            className={`sm:max-w-lg ${getPostItClass(selectedCompromiso)} border-2 shadow-lg [&>button]:hidden`}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck
                    className={`h-5 w-5 ${
                      selectedCompromiso.completado
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  />
                  {isEditingCompromiso ? (
                    <Input
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      placeholder="Título del compromiso"
                      className={`flex-1 h-8 text-sm font-semibold border-2 rounded-lg focus:border-blue-500 ${
                        selectedCompromiso.completado
                          ? 'bg-emerald-100 border-emerald-400'
                          : 'bg-red-100 border-red-300'
                      }`}
                    />
                  ) : (
                    selectedCompromiso.titulo?.trim() ||
                    tituloDeDescripcion(
                      selectedCompromiso.descripcion || '',
                      50
                    )
                  )}
                </div>
                <EstadoIcon compromiso={selectedCompromiso} />
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-500 text-xs uppercase tracking-wide">
                  Descripción
                </Label>
                {isEditingCompromiso ? (
                  <Textarea
                    value={editDescripcion}
                    onChange={(e) => setEditDescripcion(e.target.value)}
                    placeholder="Escriba el compromiso..."
                    rows={4}
                    className="resize-none"
                  />
                ) : (
                  <p
                    className={`text-sm whitespace-pre-wrap break-words break-all ${
                      selectedCompromiso.completado
                        ? 'line-through text-gray-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {selectedCompromiso.descripcion}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label className="text-gray-500 text-xs uppercase tracking-wide">
                  Fecha de creación
                </Label>
                <p className="text-sm text-gray-700">
                  {formatFechaCreacion(selectedCompromiso.createdAt)}
                </p>
              </div>
              <div className="flex flex-col gap-3 pt-2 border-t border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  {togglingId === selectedCompromiso.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  ) : (
                    <Checkbox
                      checked={selectedCompromiso.completado}
                      onCheckedChange={() =>
                        canMarkRealizado &&
                        handleToggleRealizado(selectedCompromiso.id)
                      }
                      disabled={!canMarkRealizado}
                      className="border-gray-400/60 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:border-emerald-700"
                    />
                  )}
                  <span className="font-medium text-gray-700">
                    Realizado (Encargado)
                  </span>
                </label>
              </div>
            </div>
            <DialogFooter>
              {isEditingCompromiso ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditingCompromiso(false);
                      setEditTitulo(selectedCompromiso.titulo ?? '');
                      setEditDescripcion(selectedCompromiso.descripcion ?? '');
                    }}
                    disabled={savingEdit}
                  >
                    Cancelar edición
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={
                      !editDescripcion.trim() ||
                      savingEdit ||
                      (editDescripcion.trim() ===
                        selectedCompromiso.descripcion &&
                        (editTitulo.trim() || null) ===
                          (selectedCompromiso.titulo ?? null))
                    }
                    className="bg-emerald-600 hover:bg-emerald-700"
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
                    <Button
                      variant="outline"
                      onClick={() => setIsEditingCompromiso(true)}
                    >
                      Editar
                    </Button>
                  )}
                  <Button onClick={() => handleCloseDetail()}>Cerrar</Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Popup nuevo compromiso (mismo diseño que detalle, sin rotación) */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-emerald-600" />
              Nuevo compromiso
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-500 text-xs uppercase tracking-wide">
                Título
              </Label>
              <Input
                value={addTitulo}
                onChange={(e) => setAddTitulo(e.target.value)}
                placeholder="Título breve (se muestra en la tarjeta)"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-500 text-xs uppercase tracking-wide">
                Descripción
              </Label>
              <Textarea
                value={addDescripcion}
                onChange={(e) => setAddDescripcion(e.target.value)}
                placeholder="Escriba el compromiso..."
                rows={4}
                className="resize-none"
              />
            </div>
            <p className="text-xs text-gray-500 pt-1">
              El encargado marcará &quot;Realizado (Encargado)&quot; cuando
              complete el compromiso.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddModal(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!addDescripcion.trim() || submitting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Crear compromiso'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
