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
  toggleCompromiso,
  toggleValidacionCompromiso,
  updateCompromiso,
} from '@/lib/actions/seguimiento';
import {
  ClipboardCheck,
  CircleAlert,
  CheckCircle,
  BadgeCheck,
  Loader2,
} from 'lucide-react';

type CompromisoPortal = Awaited<
  ReturnType<typeof import('@/lib/actions/seguimiento').getCompromisosPendientesParaUsuario>
>['data'][number];

const POST_IT_ROJO = 'bg-red-100 border-red-300 shadow-red-200/50';
const POST_IT_AMARILLO = 'bg-amber-100 border-amber-300 shadow-amber-200/50';
const POST_IT_VERDE = 'bg-emerald-100 border-emerald-400 shadow-emerald-300/50';

function getPostItClass(c: CompromisoPortal): string {
  if (c.validadoPorCoordinador) return POST_IT_VERDE;
  if (c.completado) return POST_IT_AMARILLO;
  return POST_IT_ROJO;
}

function EstadoIcon({ compromiso }: { compromiso: CompromisoPortal }) {
  if (compromiso.validadoPorCoordinador)
    return <BadgeCheck className="h-5 w-5 text-emerald-600 shrink-0" />;
  if (compromiso.completado)
    return <CheckCircle className="h-5 w-5 text-amber-600 shrink-0" />;
  return <CircleAlert className="h-5 w-5 text-red-600 shrink-0" />;
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

export interface PortalCompromisosPendientesProps {
  compromisos: CompromisoPortal[];
  activeRole: string | null;
  onSuccess: () => void | Promise<void>;
  loading?: boolean;
}

export function PortalCompromisosPendientes({
  compromisos,
  activeRole,
  onSuccess,
  loading = false,
}: PortalCompromisosPendientesProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedCompromiso, setSelectedCompromiso] =
    useState<CompromisoPortal | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isEditingCompromiso, setIsEditingCompromiso] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isCoordinadorOrAdmin =
    activeRole === 'Coordinador' || activeRole === 'Admin';
  const canMarkRealizado =
    activeRole === 'Encargado' || activeRole === 'Admin';

  const handleToggleRealizado = async (id: string) => {
    if (!canMarkRealizado) return;
    setTogglingId(id);
    const result = await toggleCompromiso(id);
    setTogglingId(null);
    if (result.success) {
      setSelectedCompromiso((prev) =>
        prev?.id === id ? { ...prev, completado: !prev.completado } : prev
      );
      await onSuccess();
    }
  };

  const handleToggleValidacion = async (id: string) => {
    if (!isCoordinadorOrAdmin) return;
    setTogglingId(id);
    const result = await toggleValidacionCompromiso(id);
    setTogglingId(null);
    if (result.success) {
      setSelectedCompromiso((prev) =>
        prev?.id === id
          ? { ...prev, validadoPorCoordinador: !prev.validadoPorCoordinador }
          : prev
      );
      await onSuccess();
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
    setSavingEdit(true);
    const result = await updateCompromiso(selectedCompromiso.id, {
      titulo: editTitulo.trim() || null,
      descripcion: editDescripcion.trim(),
    });
    setSavingEdit(false);
    if (result.success && result.data) {
      setSelectedCompromiso({
        ...selectedCompromiso,
        titulo: result.data.titulo ?? null,
        descripcion: result.data.descripcion,
      });
      setIsEditingCompromiso(false);
      await onSuccess();
    }
  };

  const handleCloseDetail = () => {
    setSelectedCompromiso(null);
    setIsEditingCompromiso(false);
    setDetailModalOpen(false);
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
        <div className="flex-shrink-0 px-4 py-3 border-b">
          <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-emerald-600" />
            Compromisos pendientes
          </h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const list = compromisos.filter(
    (c) => c.descripcion && c.descripcion.trim()
  );

  return (
    <>
    <div className="h-full flex flex-col border rounded-lg bg-card shadow-md overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b">
        <h3 className="font-semibold text-lg text-emerald-600 flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-emerald-600" />
          Compromisos pendientes
        </h3>
      </div>
      <div className="flex-1 min-h-0 overflow-auto px-4 py-2">
        {list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No hay compromisos pendientes.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  className={`rounded-lg border-2 shadow-md p-3 min-h-[120px] flex flex-col text-left cursor-pointer hover:shadow-lg transition-all duration-200 ${getPostItClass(c)}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p
                      className="text-sm font-medium flex-1 min-w-0 line-clamp-2 break-words"
                      title={c.descripcion}
                    >
                      {titulo}
                    </p>
                    <EstadoIcon compromiso={c} />
                  </div>
                  {proyectoNombre && (
                    <p className="text-xs text-gray-600 mb-1">
                      {proyectoNombre}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    Creado: {formatFecha(c.createdAt)}
                  </p>
                  <div
                    className="flex flex-wrap gap-3 mt-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      {togglingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Checkbox
                          checked={c.completado}
                          onCheckedChange={() => handleToggleRealizado(c.id)}
                          disabled={!canMarkRealizado}
                          className="border-gray-400/60 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-600"
                        />
                      )}
                      Realizado
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      {togglingId === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Checkbox
                          checked={c.validadoPorCoordinador}
                          onCheckedChange={() => handleToggleValidacion(c.id)}
                          disabled={!isCoordinadorOrAdmin}
                          className="border-gray-400/60 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-700"
                        />
                      )}
                      Validado
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>

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
                    className={
                      selectedCompromiso.validadoPorCoordinador
                        ? 'h-5 w-5 text-emerald-600'
                        : selectedCompromiso.completado
                          ? 'h-5 w-5 text-amber-600'
                          : 'h-5 w-5 text-red-600'
                    }
                  />
                  {isEditingCompromiso ? (
                    <Input
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      placeholder="Título del compromiso"
                      className={`flex-1 h-8 text-sm font-semibold border-2 rounded-lg focus:border-blue-500 ${
                        selectedCompromiso.validadoPorCoordinador
                          ? 'bg-emerald-100 border-emerald-400'
                          : selectedCompromiso.completado
                            ? 'bg-amber-100 border-amber-300'
                            : 'bg-red-100 border-red-300'
                      }`}
                    />
                  ) : (
                    selectedCompromiso.titulo?.trim() ||
                    tituloDeDescripcion(selectedCompromiso.descripcion, 50)
                  )}
                </div>
                <EstadoIcon compromiso={selectedCompromiso} />
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {(selectedCompromiso as CompromisoPortal & { proyecto?: { proyecto?: string } }).proyecto?.proyecto && (
                <div className="space-y-1">
                  <Label className="text-gray-500 text-xs uppercase tracking-wide">
                    Proyecto
                  </Label>
                  <p className="text-sm text-gray-700">
                    {(selectedCompromiso as CompromisoPortal & { proyecto?: { proyecto?: string } }).proyecto?.proyecto}
                  </p>
                </div>
              )}
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
                  {formatFecha(selectedCompromiso.createdAt)}
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
                      className="border-gray-400/60 data-[state=checked]:bg-amber-500 data-[state=checked]:text-black data-[state=checked]:border-amber-600"
                    />
                  )}
                  <span className="font-medium text-gray-700">
                    Realizado (Encargado)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  {togglingId === selectedCompromiso.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                  ) : (
                    <Checkbox
                      checked={selectedCompromiso.validadoPorCoordinador}
                      onCheckedChange={() =>
                        isCoordinadorOrAdmin &&
                        handleToggleValidacion(selectedCompromiso.id)
                      }
                      disabled={!isCoordinadorOrAdmin}
                      className="border-gray-400/60 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:border-emerald-700"
                    />
                  )}
                  <span className="font-medium text-gray-700">
                    Validado (Coordinador)
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
                  <Button onClick={handleCloseDetail}>Cerrar</Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
