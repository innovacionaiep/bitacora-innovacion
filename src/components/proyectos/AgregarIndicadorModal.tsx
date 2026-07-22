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
  onSuccess: (created?: {
    objetivoEspecificoId: string;
    indicador: {
      id: string;
      nombre: string;
      descripcion: string;
      formaCalculo: string;
      resultadoEsperado: string;
      formatoNumero?: string | null;
      fechaInicio?: string | null;
      fechaFin?: string | null;
    };
  }) => Promise<void>;
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
        const formSnapshot = { ...form };
        resetForm();
        onClose();
        await onSuccess({
          objetivoEspecificoId: formSnapshot.objetivoEspecificoId,
          indicador: {
            id: result.id ?? `temp-ind-${Date.now()}`,
            nombre: formSnapshot.nombre.trim(),
            descripcion: formSnapshot.descripcion.trim(),
            formaCalculo: formSnapshot.formaCalculo.trim(),
            resultadoEsperado: formSnapshot.resultadoEsperado.trim(),
            formatoNumero: formSnapshot.formatoNumero || null,
            fechaInicio: formSnapshot.fechaInicio.trim() || null,
            fechaFin: formSnapshot.fechaFin.trim() || null,
          },
        });
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
      <DialogContent className="max-w-lg max-h-[90vh] gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg">
        <DialogHeader className="space-y-0 border-b border-gray-100 bg-gray-50/90 px-5 py-3 text-left">
          <DialogTitle className="m-0 text-[13px] font-medium tracking-wide text-gray-800">
            Agregar indicador
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 overflow-y-auto max-h-[calc(90vh-3rem)]">
          <div>
            <Label htmlFor="objetivoEspecifico" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
              Objetivo específico *
            </Label>
            <select
              id="objetivoEspecifico"
              value={form.objetivoEspecificoId}
              onChange={(e) =>
                setForm({ ...form, objetivoEspecificoId: e.target.value })
              }
              className="w-full mt-1.5 h-9 px-3 border border-gray-200 rounded-md bg-white text-[13px] text-gray-700 shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1"
              required
            >
              <option value="">Seleccione un objetivo</option>
              {objetivosEspecificos.map((oe, index) => (
                <option key={oe.id} value={oe.id}>
                  Objetivo {index + 1}: {oe.descripcion.slice(0, 60)}
                  {oe.descripcion.length > 60 ? '…' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="nombre" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
              Nombre *
            </Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Ej: Nivel de satisfacción de participantes"
              className="mt-1.5 h-9 border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              required
            />
          </div>

          <div>
            <Label htmlFor="descripcion" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
              Descripción *
            </Label>
            <textarea
              id="descripcion"
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              placeholder="Descripción del indicador"
              className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-md bg-white text-[13px] text-gray-800 shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 min-h-[80px] resize-y"
              required
            />
          </div>

          <div>
            <Label htmlFor="formaCalculo" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
              Forma de cálculo *
            </Label>
            <textarea
              id="formaCalculo"
              value={form.formaCalculo}
              onChange={(e) =>
                setForm({ ...form, formaCalculo: e.target.value })
              }
              placeholder="Cómo se calcula este indicador"
              className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-md bg-white text-[13px] text-gray-800 shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 min-h-[80px] resize-y"
              required
            />
          </div>

          <div>
            <Label htmlFor="formatoNumero" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
              Formato del número
            </Label>
            <select
              id="formatoNumero"
              value={form.formatoNumero}
              onChange={(e) =>
                setForm({ ...form, formatoNumero: e.target.value })
              }
              className="w-full mt-1.5 h-9 px-3 border border-gray-200 rounded-md bg-white text-[13px] text-gray-700 shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1"
            >
              {FORMATO_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="resultadoEsperado" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
              Resultado esperado *
            </Label>
            <Input
              id="resultadoEsperado"
              value={form.resultadoEsperado}
              onChange={(e) =>
                setForm({ ...form, resultadoEsperado: e.target.value })
              }
              placeholder="Ej: 75, 4.00, 10"
              className="mt-1.5 h-9 border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fechaInicio" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Fecha inicio
              </Label>
              <Input
                id="fechaInicio"
                type="date"
                value={form.fechaInicio}
                onChange={(e) =>
                  setForm({ ...form, fechaInicio: e.target.value })
                }
                className="mt-1.5 h-9 border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>
            <div>
              <Label htmlFor="fechaFin" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Fecha fin
              </Label>
              <Input
                id="fechaFin"
                type="date"
                value={form.fechaFin}
                onChange={(e) => setForm({ ...form, fechaFin: e.target.value })}
                className="mt-1.5 h-9 border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>
          </div>

          <DialogFooter className="gap-3 sm:gap-3 pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              className="h-7 px-0 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="ghost"
              disabled={isSaving}
              className="h-7 px-0 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent disabled:opacity-50"
            >
              {isSaving ? 'Guardando…' : 'Agregar indicador'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
