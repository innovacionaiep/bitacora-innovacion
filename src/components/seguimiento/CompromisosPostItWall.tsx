'use client';

import { useEffect, useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { toggleCompromiso } from '@/lib/actions/seguimiento';
import { ClipboardCheck, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import { getPermissionsForRole } from '@/lib/permissions/check';
import type { RolePermissionMap } from '@/lib/permissions/catalog';
import {
  CompromisoDetalleModal,
  EstadoIcon,
  formatFechaCreacion,
  getPostItClass,
  tituloDeDescripcion,
  type CompromisoItem,
} from './compromiso-ui';

interface CompromisosPostItWallProps {
  projectId: string;
  compromisos: CompromisoItem[];
  rolEnProyecto?: string | null;
  /** @deprecated UI-only; authorization uses availableRoles + rolEnProyecto */
  activeRole?: string | null;
  onSuccess: () => void | Promise<void>;
  /** Actualización optimista del listado (toggle / edit). */
  onOptimisticCompromisoUpdate?: (
    id: string,
    patch: { completado?: boolean; titulo?: string | null; descripcion?: string }
  ) => void;
}

export function CompromisosPostItWall({
  projectId: _projectId,
  compromisos,
  rolEnProyecto,
  activeRole: _activeRole,
  onSuccess,
  onOptimisticCompromisoUpdate,
}: CompromisosPostItWallProps) {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedCompromiso, setSelectedCompromiso] =
    useState<CompromisoItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

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

  const canMarkRealizado =
    isAdmin || partPerms?.['compromisos.mark_done'] === true;

  const pendientes = useMemo(
    () =>
      compromisos.filter(
        (c) => !c.completado && c.descripcion && c.descripcion.trim()
      ),
    [compromisos]
  );

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
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-between w-full px-3 py-2 bg-gray-100 border-b border-gray-200 rounded-t-xl">
          <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wide flex items-center gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5 text-emerald-600" />
            Compromisos pendientes
          </h4>
        </header>
        <div className="flex-1 overflow-auto min-h-0 p-4">
          {pendientes.length === 0 ? (
            <div className="text-center py-8 rounded-lg bg-gray-50/50">
              <p className="text-sm text-gray-500">
                No hay compromisos pendientes
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Agrégalos desde una reunión en la tabla inferior
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
              {pendientes.map((compromiso, index) => (
                <div
                  key={compromiso.id}
                  id={index === 0 ? 'tour-seguimiento-estados' : undefined}
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
                      className="text-sm font-medium flex-1 min-w-0 line-clamp-1 break-words text-gray-900"
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
              ))}
            </div>
          )}
        </div>
      </div>

      <CompromisoDetalleModal
        compromiso={selectedCompromiso}
        open={detailModalOpen}
        onOpenChange={(open) => {
          setDetailModalOpen(open);
          if (!open) setSelectedCompromiso(null);
        }}
        rolEnProyecto={rolEnProyecto}
        onSuccess={onSuccess}
        onOptimisticCompromisoUpdate={onOptimisticCompromisoUpdate}
      />
    </>
  );
}
