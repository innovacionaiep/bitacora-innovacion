'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { getIndicadorById } from '@/lib/actions/indicadores';
import { IndicadorModal } from '@/components/proyectos/IndicadorModal';
import { DETAIL_MODAL_CONTENT_CLASS } from '@/lib/ui/detail-modal';

const INDICADOR_DIALOG_CLASS = DETAIL_MODAL_CONTENT_CLASS;

export interface IndicadorDetalleModalProps {
  indicadorId: string | null;
  proyectoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
  /** Admin / Coordinador / Encargado del proyecto: muestra lápices de edición. */
  canEdit?: boolean;
}

export function IndicadorDetalleModal({
  indicadorId,
  proyectoId,
  open,
  onOpenChange,
  onSuccess,
  canEdit = false,
}: IndicadorDetalleModalProps) {
  const [indicador, setIndicador] = useState<{
    id: string;
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    resultadoAlcanzado: string;
    formatoNumero?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !indicadorId) {
      setIndicador(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setIndicador(null);
    getIndicadorById(indicadorId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) {
        setIndicador(res.data);
      } else {
        setError(res.error ?? 'Error al cargar indicador');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, indicadorId]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleUpdate = async (optimistic?: {
    id: string;
    patch: Partial<{
      nombre: string;
      descripcion: string;
      formaCalculo: string;
      formatoNumero: string | null;
      resultadoEsperado: string;
      resultadoAlcanzado: string;
      fechaInicio: string | null;
      fechaFin: string | null;
    }>;
  }) => {
    if (optimistic) {
      setIndicador((prev) =>
        prev && prev.id === optimistic.id
          ? {
              ...prev,
              ...optimistic.patch,
              formatoNumero:
                optimistic.patch.formatoNumero !== undefined
                  ? optimistic.patch.formatoNumero
                  : prev.formatoNumero,
              fechaInicio:
                optimistic.patch.fechaInicio !== undefined
                  ? optimistic.patch.fechaInicio
                  : prev.fechaInicio,
              fechaFin:
                optimistic.patch.fechaFin !== undefined
                  ? optimistic.patch.fechaFin
                  : prev.fechaFin,
            }
          : prev
      );
      return;
    }
    if (onSuccess) await onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeButtonPosition="outside-top-right"
        className={INDICADOR_DIALOG_CLASS}
      >
        {loading ? (
          <>
            <DialogTitle className="sr-only">Cargando indicador</DialogTitle>
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-4 text-[13px] text-gray-400">
                Cargando indicador…
              </p>
            </div>
          </>
        ) : error || !indicador ? (
          <>
            <DialogTitle className="sr-only">Error</DialogTitle>
            <div className="flex-1 flex flex-col items-center justify-center py-12">
              <p className="text-sm text-destructive">
                {error ?? 'Indicador no encontrado'}
              </p>
            </div>
          </>
        ) : (
          <IndicadorModal
            indicador={indicador}
            onClose={handleClose}
            onUpdate={handleUpdate}
            projectId={proyectoId ?? undefined}
            hideEditButton={!canEdit}
            wrapInDialog={false}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
