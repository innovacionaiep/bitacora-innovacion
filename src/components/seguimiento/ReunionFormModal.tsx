'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createReunion, updateReunion } from '@/lib/actions/seguimiento';
import { Loader2 } from 'lucide-react';

interface ReunionFormModalProps {
  projectId: string;
  reunionId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void | Promise<void>;
  defaultFecha?: Date;
  initialData?: {
    fecha: Date;
    duracionMinutos?: number | null;
    resumen?: string | null;
    notas?: string | null;
  };
}

export function ReunionFormModal({
  projectId,
  reunionId,
  open,
  onOpenChange,
  onSuccess,
  defaultFecha = new Date(),
  initialData,
}: ReunionFormModalProps) {
  const isEdit = Boolean(reunionId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const getInitialFormData = () => ({
    fecha: (initialData?.fecha || defaultFecha).toISOString().slice(0, 16),
    duracionMinutos: String(initialData?.duracionMinutos ?? ''),
    resumen: initialData?.resumen ?? '',
    notas: initialData?.notas ?? '',
  });
  const [formData, setFormData] = useState(getInitialFormData);

  useEffect(() => {
    if (open && initialData) {
      setFormData({
        fecha: new Date(initialData.fecha).toISOString().slice(0, 16),
        duracionMinutos: String(initialData.duracionMinutos ?? ''),
        resumen: initialData.resumen ?? '',
        notas: initialData.notas ?? '',
      });
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const fecha = new Date(formData.fecha);
      if (isEdit && reunionId) {
        const result = await updateReunion(reunionId, {
          fecha,
          duracionMinutos: formData.duracionMinutos
            ? parseInt(formData.duracionMinutos, 10)
            : undefined,
          resumen: formData.resumen || undefined,
          notas: formData.notas || undefined,
        });
        if (result.success) {
          await onSuccess();
          onOpenChange(false);
        } else {
          setError(result.error || 'Error al actualizar');
        }
      } else {
        const result = await createReunion({
          proyectoId: projectId,
          fecha,
          duracionMinutos: formData.duracionMinutos
            ? parseInt(formData.duracionMinutos, 10)
            : undefined,
          resumen: formData.resumen || undefined,
          notas: formData.notas || undefined,
        });
        if (result.success) {
          await onSuccess();
          onOpenChange(false);
        } else {
          setError(result.error || 'Error al crear');
        }
      }
    } catch (err) {
      setError('Error inesperado');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Editar reunión' : 'Nueva reunión de seguimiento'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fecha">Fecha y hora</Label>
            <Input
              id="fecha"
              type="datetime-local"
              value={formData.fecha}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fecha: e.target.value }))
              }
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="duracion">Duración (minutos)</Label>
            <Input
              id="duracion"
              type="number"
              min="0"
              placeholder="45"
              value={formData.duracionMinutos}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, duracionMinutos: e.target.value }))
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="resumen">Resumen</Label>
            <Textarea
              id="resumen"
              placeholder="Breve resumen de lo tratado en la reunión..."
              value={formData.resumen}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, resumen: e.target.value }))
              }
              className="mt-1 min-h-[80px]"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="notas">Notas adicionales</Label>
            <Textarea
              id="notas"
              placeholder="Notas u observaciones..."
              value={formData.notas}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notas: e.target.value }))
              }
              className="mt-1 min-h-[60px]"
              rows={2}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEdit ? 'Actualizar' : 'Crear reunión'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
