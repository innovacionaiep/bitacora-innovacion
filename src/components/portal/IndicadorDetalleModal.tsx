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

export interface IndicadorDetalleModalProps {
  indicadorId: string | null;
  proyectoId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
}

export function IndicadorDetalleModal({
  indicadorId,
  proyectoId,
  open,
  onOpenChange,
  onSuccess,
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
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
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

  const handleUpdate = async () => {
    if (onSuccess) await onSuccess();
  };

  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg border border-gray-200 bg-white shadow-md sm:rounded-lg">
          <DialogTitle className="sr-only">Cargando indicador</DialogTitle>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-4 text-[13px] text-gray-400">Cargando indicador…</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !indicador) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg border border-gray-200 bg-white shadow-md sm:rounded-lg">
          <DialogTitle className="sr-only">Error</DialogTitle>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-destructive">{error ?? 'Indicador no encontrado'}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <IndicadorModal
      indicador={indicador}
      onClose={handleClose}
      onUpdate={handleUpdate}
      projectId={proyectoId ?? undefined}
      hideEditButton
    />
  );
}
