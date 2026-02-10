'use client';

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
import { createIndicador } from '@/lib/actions/indicadores';
import { useState, useEffect } from 'react';

export interface ObjetivoEspecificoOption {
  id: string;
  descripcion: string;
  orden: number;
}

interface AgregarIndicadorModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  proyectoId: string;
  objetivosEspecificos: ObjetivoEspecificoOption[];
}

const FORMATO_OPTIONS = ['Porcentaje', 'Número Entero', 'Número Decimal'];

export function AgregarIndicadorModal({
  open,
  onClose,
  onSuccess,
  proyectoId,
  objetivosEspecificos,
}: AgregarIndicadorModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    objetivoEspecificoId: '',
    nombre: '',
    descripcion: '',
    formaCalculo: '',
    resultadoEsperado: '',
    formatoNumero: 'Porcentaje' as string,
    fechaInicio: '',
    fechaFin: '',
  });

  const resetForm = () => {
    setForm({
      objetivoEspecificoId:
        objetivosEspecificos.length > 0 ? objetivosEspecificos[0].id : '',
      nombre: '',
      descripcion: '',
      formaCalculo: '',
      resultadoEsperado: '',
      formatoNumero: 'Porcentaje',
      fechaInicio: '',
      fechaFin: '',
    });
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetForm();
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.objetivoEspecificoId ||
      !form.nombre.trim() ||
      !form.descripcion.trim() ||
      !form.formaCalculo.trim() ||
      !form.resultadoEsperado.trim()
    ) {
      alert(
        'Complete los campos obligatorios: Objetivo específico, Nombre, Descripción, Forma de cálculo y Resultado esperado.'
      );
      return;
    }
    setIsSaving(true);
    try {
      const result = await createIndicador(
        proyectoId,
        form.objetivoEspecificoId,
        {
          nombre: form.nombre.trim(),
          descripcion: form.descripcion.trim(),
          formaCalculo: form.formaCalculo.trim(),
          resultadoEsperado: form.resultadoEsperado.trim(),
          formatoNumero: form.formatoNumero || null,
          fechaInicio: form.fechaInicio.trim() || null,
          fechaFin: form.fechaFin.trim() || null,
        }
      );
      if (result.success) {
        resetForm();
        onClose();
        await onSuccess();
      } else {
        alert(result.error || 'Error al crear el indicador');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al crear el indicador');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar indicador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="objetivoEspecifico">Objetivo específico *</Label>
            <select
              id="objetivoEspecifico"
              value={form.objetivoEspecificoId}
              onChange={(e) =>
                setForm({ ...form, objetivoEspecificoId: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccione un objetivo</option>
              {objetivosEspecificos.map((oe) => (
                <option key={oe.id} value={oe.id}>
                  Objetivo {oe.orden}: {oe.descripcion.slice(0, 60)}
                  {oe.descripcion.length > 60 ? '…' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="nombre">Nombre *</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Nivel de satisfacción de participantes"
              className="mt-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción *</Label>
            <textarea
              id="descripcion"
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              placeholder="Descripción del indicador"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
              required
            />
          </div>

          <div>
            <Label htmlFor="formaCalculo">Forma de cálculo *</Label>
            <textarea
              id="formaCalculo"
              value={form.formaCalculo}
              onChange={(e) =>
                setForm({ ...form, formaCalculo: e.target.value })
              }
              placeholder="Cómo se calcula este indicador"
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-y"
              required
            />
          </div>

          <div>
            <Label htmlFor="formatoNumero">Formato del número</Label>
            <select
              id="formatoNumero"
              value={form.formatoNumero}
              onChange={(e) =>
                setForm({ ...form, formatoNumero: e.target.value })
              }
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FORMATO_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="resultadoEsperado">Resultado esperado *</Label>
            <Input
              id="resultadoEsperado"
              value={form.resultadoEsperado}
              onChange={(e) =>
                setForm({ ...form, resultadoEsperado: e.target.value })
              }
              placeholder="Ej: 75, 4.00, 10"
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaInicio">Fecha inicio</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={form.fechaInicio}
                onChange={(e) =>
                  setForm({ ...form, fechaInicio: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fechaFin">Fecha fin</Label>
              <Input
                id="fechaFin"
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Agregar indicador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
