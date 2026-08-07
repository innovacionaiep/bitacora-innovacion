'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Handshake, List, Plus, Save, X } from 'lucide-react';
import { SELECT_NONE_VALUE } from '@/app/proyectos/tabs/participantes-tab-utils';
import type { UseEditarSociosComunitariosReturn } from '@/app/proyectos/tabs/useEditarSociosComunitarios';

type EditarSociosComunitariosDialogProps = Pick<
  UseEditarSociosComunitariosReturn,
  | 'isEditarSociosOpen'
  | 'setIsEditarSociosOpen'
  | 'editarSociosIds'
  | 'setEditarSociosIds'
  | 'editarSociosCatalog'
  | 'nuevoSocioNombre'
  | 'setNuevoSocioNombre'
  | 'nuevoSocioDescripcion'
  | 'setNuevoSocioDescripcion'
  | 'nuevoSocioSaving'
  | 'editarSociosSaving'
  | 'handleCreateNuevoSocio'
  | 'handleSaveEditarSocios'
>;

type AgregarSocioMode = 'choose' | 'list' | 'create';

function SectionLabel({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-2.5">
      <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
        {children}
      </h3>
      {hint ? (
        <p className="mt-1 text-[12px] font-normal text-gray-400 leading-snug">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ModeChoiceButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1',
        active
          ? 'border-gray-300 bg-white text-gray-900 shadow-sm'
          : 'border-gray-200 bg-gray-50/80 text-gray-600 hover:border-gray-300 hover:bg-white hover:text-gray-900',
      ].join(' ')}
    >
      {icon}
      {children}
    </button>
  );
}

export function EditarSociosComunitariosDialog({
  isEditarSociosOpen,
  setIsEditarSociosOpen,
  editarSociosIds,
  setEditarSociosIds,
  editarSociosCatalog,
  nuevoSocioNombre,
  setNuevoSocioNombre,
  nuevoSocioDescripcion,
  setNuevoSocioDescripcion,
  nuevoSocioSaving,
  editarSociosSaving,
  handleCreateNuevoSocio,
  handleSaveEditarSocios,
}: EditarSociosComunitariosDialogProps) {
  const [agregarMode, setAgregarMode] = useState<AgregarSocioMode>('choose');

  const disponibles = editarSociosCatalog.filter(
    (s) => !editarSociosIds.includes(s.id)
  );

  useEffect(() => {
    if (!isEditarSociosOpen) {
      setAgregarMode('choose');
      setNuevoSocioNombre('');
      setNuevoSocioDescripcion('');
    }
  }, [
    isEditarSociosOpen,
    setNuevoSocioNombre,
    setNuevoSocioDescripcion,
  ]);

  const selectListMode = () => {
    setAgregarMode('list');
    setNuevoSocioNombre('');
    setNuevoSocioDescripcion('');
  };

  const selectCreateMode = () => {
    setAgregarMode('create');
  };

  return (
    <Dialog open={isEditarSociosOpen} onOpenChange={setIsEditarSociosOpen}>
      <DialogContent
        hideCloseButton
        className="max-w-lg gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg"
        onCloseAutoFocus={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => {
          // Evita que el click de cierre “caiga” en controles detrás del overlay
          e.preventDefault();
        }}
        onInteractOutside={(e) => {
          e.preventDefault();
        }}
      >
        <DialogHeader className="space-y-0 border-b border-gray-100 bg-gray-50/90 px-5 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="m-0 flex items-center gap-2 text-[13px] font-medium leading-none tracking-wide text-gray-800">
              <Handshake
                className="size-3.5 shrink-0 text-gray-500"
                aria-hidden
              />
              Socios comunitarios
            </DialogTitle>
            <div className="flex h-7 shrink-0 items-center gap-3">
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={handleSaveEditarSocios}
                disabled={editarSociosSaving}
                className="inline-flex h-7 items-center gap-1.5 text-[13px] font-normal leading-none text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
              >
                <Save className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {editarSociosSaving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => setIsEditarSociosOpen(false)}
                className="inline-flex h-7 items-center gap-1.5 text-[13px] font-normal leading-none text-gray-500 hover:text-gray-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
              >
                <X className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                Cerrar
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-5">
          {/* 1. Qué ya está en el proyecto */}
          <section>
            <SectionLabel hint="Estos socios podrán asociarse a beneficiarios en Participantes.">
              En este proyecto
              {editarSociosIds.length > 0 ? (
                <span className="ml-1.5 normal-case tracking-normal text-gray-400">
                  ({editarSociosIds.length})
                </span>
              ) : null}
            </SectionLabel>

            <div className="min-h-[3rem] rounded-lg border border-dashed border-gray-200 bg-gray-50/40 px-3 py-3">
              {editarSociosIds.length === 0 ? (
                <p className="text-[13px] font-normal text-gray-400 leading-snug">
                  Todavía no hay socios. Agrégalos desde el listado o crea uno
                  nuevo.
                </p>
              ) : (
                <ul className="flex flex-wrap gap-2 max-h-36 overflow-y-auto custom-scrollbar">
                  {editarSociosIds.map((id) => {
                    const socio = editarSociosCatalog.find((s) => s.id === id);
                    return (
                      <li
                        key={id}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1.5"
                      >
                        <span className="text-[13px] font-normal text-gray-600 leading-snug break-words [overflow-wrap:anywhere]">
                          {socio?.nombre ?? id}
                        </span>
                        <button
                          type="button"
                          className="h-5 w-5 shrink-0 rounded-sm flex items-center justify-center text-gray-300 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                          onClick={() =>
                            setEditarSociosIds((prev) =>
                              prev.filter((x) => x !== id)
                            )
                          }
                          aria-label={`Quitar ${socio?.nombre ?? 'socio'}`}
                        >
                          <X className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* 2. Cómo agregar */}
          <section className="mt-6 border-t border-gray-100 pt-5">
            <SectionLabel>Agregar socio</SectionLabel>

            <div className="flex gap-2">
              <ModeChoiceButton
                active={agregarMode === 'list'}
                onClick={selectListMode}
                icon={
                  <List className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                }
              >
                Seleccionar de listado
              </ModeChoiceButton>
              <ModeChoiceButton
                active={agregarMode === 'create'}
                onClick={selectCreateMode}
                icon={
                  <Plus className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
                }
              >
                Crear uno nuevo
              </ModeChoiceButton>
            </div>

            {agregarMode === 'list' ? (
              <div className="mt-4">
                <p className="mb-1.5 text-[12px] font-normal text-gray-500">
                  Desde el listado
                </p>
                <Select
                  key={`socio-add-${editarSociosIds.length}-${disponibles.length}`}
                  value={SELECT_NONE_VALUE}
                  onValueChange={(value) => {
                    if (
                      value &&
                      value !== SELECT_NONE_VALUE &&
                      !editarSociosIds.includes(value)
                    ) {
                      setEditarSociosIds((prev) => [...prev, value]);
                    }
                  }}
                >
                  <SelectTrigger className="h-9 border-gray-200 bg-white text-[13px] font-normal text-gray-700 shadow-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1">
                    <SelectValue placeholder="Seleccionar socio existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      value={SELECT_NONE_VALUE}
                      disabled
                      className="text-[13px] text-gray-400"
                    >
                      — Seleccionar —
                    </SelectItem>
                    {disponibles.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        className="text-[13px] text-gray-700"
                      >
                        {s.nombre}
                      </SelectItem>
                    ))}
                    {disponibles.length === 0 && (
                      <span className="block px-2 py-1.5 text-[13px] text-gray-400">
                        {editarSociosCatalog.length === 0
                          ? 'No hay socios en el listado'
                          : 'Todos los del listado ya están en el proyecto'}
                      </span>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {agregarMode === 'create' ? (
              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/50 px-3.5 py-3.5 space-y-2.5">
                <p className="text-[12px] font-normal text-gray-500">
                  Nuevo socio (se agrega al listado y al proyecto)
                </p>
                <Input
                  placeholder="Nombre *"
                  value={nuevoSocioNombre}
                  onChange={(e) => setNuevoSocioNombre(e.target.value)}
                  className="h-9 border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                />
                <Textarea
                  placeholder="Descripción (opcional)"
                  value={nuevoSocioDescripcion}
                  onChange={(e) => setNuevoSocioDescripcion(e.target.value)}
                  className="min-h-[56px] resize-none border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                />
                <button
                  type="button"
                  disabled={nuevoSocioSaving || !nuevoSocioNombre.trim()}
                  onClick={handleCreateNuevoSocio}
                  className="inline-flex items-center gap-1 text-[13px] font-normal text-gray-900 hover:text-emerald-700 transition-colors disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1 rounded-sm"
                >
                  <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
                  {nuevoSocioSaving ? 'Creando...' : 'Crear y agregar'}
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
