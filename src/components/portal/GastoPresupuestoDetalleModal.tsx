'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { getItemPresupuestoById } from '@/lib/actions/presupuesto';
import type { ItemPresupuestoItem } from '@/types/presupuesto';
import { GastoPresupuestoModal } from '@/components/proyectos/GastoPresupuestoModal';
import { DETAIL_MODAL_CONTENT_CLASS } from '@/lib/ui/detail-modal';

const PRESUPUESTO_DIALOG_CLASS = DETAIL_MODAL_CONTENT_CLASS;

export interface GastoPresupuestoDetalleModalProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void | Promise<void>;
  canEdit?: boolean;
}

export function GastoPresupuestoDetalleModal({
  itemId,
  open,
  onOpenChange,
  onSuccess,
  canEdit = false,
}: GastoPresupuestoDetalleModalProps) {
  const [gasto, setGasto] = useState<ItemPresupuestoItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async (id: string) => {
    const res = await getItemPresupuestoById(id);
    if (res.success && res.data) {
      setGasto(res.data as ItemPresupuestoItem);
      setError(null);
      return true;
    }
    setError(res.error ?? 'Error al cargar ítem de presupuesto');
    setGasto(null);
    return false;
  }, []);

  useEffect(() => {
    if (!open || !itemId) {
      setGasto(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGasto(null);
    loadItem(itemId).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, itemId, loadItem]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleUpdate = async () => {
    if (itemId) await loadItem(itemId);
    if (onSuccess) await onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeButtonPosition="outside-top-right"
        className={PRESUPUESTO_DIALOG_CLASS}
      >
        {loading ? (
          <>
            <DialogTitle className="sr-only">Cargando presupuesto</DialogTitle>
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-5">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <p className="mt-4 text-[13px] text-gray-400">
                Cargando ítem de presupuesto…
              </p>
            </div>
          </>
        ) : error || !gasto ? (
          <>
            <DialogTitle className="sr-only">Error</DialogTitle>
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-5">
              <p className="text-[13px] text-red-600">
                {error ?? 'Ítem no encontrado'}
              </p>
            </div>
          </>
        ) : (
          <GastoPresupuestoModal
            gasto={gasto}
            onClose={handleClose}
            onUpdate={handleUpdate}
            wrapInDialog={false}
            canEdit={canEdit}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
