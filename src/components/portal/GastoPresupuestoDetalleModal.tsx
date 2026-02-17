'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { getItemPresupuestoById } from '@/lib/actions/presupuesto';
import type { ItemPresupuestoItem } from '@/types/presupuesto';
import { GastoPresupuestoModal } from '@/components/proyectos/GastoPresupuestoModal';

export interface GastoPresupuestoDetalleModalProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
}

export function GastoPresupuestoDetalleModal({
  itemId,
  open,
  onOpenChange,
  onSuccess,
}: GastoPresupuestoDetalleModalProps) {
  const [gasto, setGasto] = useState<ItemPresupuestoItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !itemId) {
      setGasto(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getItemPresupuestoById(itemId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res.success && res.data) {
        setGasto(res.data as ItemPresupuestoItem);
      } else {
        setError(res.error ?? 'Error al cargar ítem de presupuesto');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, itemId]);

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
        <DialogContent className="max-w-lg">
          <DialogTitle className="sr-only">Cargando presupuesto</DialogTitle>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-sm text-muted-foreground">Cargando ítem de presupuesto…</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !gasto) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="sr-only">Error</DialogTitle>
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-sm text-destructive">{error ?? 'Ítem no encontrado'}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <GastoPresupuestoModal
      gasto={gasto}
      onClose={handleClose}
      onUpdate={handleUpdate}
    />
  );
}
