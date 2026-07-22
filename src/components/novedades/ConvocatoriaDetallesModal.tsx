'use client';

import { useEffect, useState, useRef } from 'react';
import { ClipboardList, Pencil, ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
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
import type { ConvocatoriaPlaceholder } from './ConvocatoriasWall';

export interface ConvocatoriaSavedData {
  id?: string;
  titulo: string;
  fechaInicio: Date;
  fechaFin: Date;
  descripcion: string;
  imagenUrl?: string | null;
}

interface ConvocatoriaDetallesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  convocatoriaId: string | null;
  convocatoria?: ConvocatoriaPlaceholder | null;
  isAdmin?: boolean;
  onSaved?: (data: ConvocatoriaSavedData) => void;
}

function toInputDate(d: Date): string {
  const x = new Date(d);
  return x.toISOString().slice(0, 10);
}

function formatDisplayDate(d: Date): string {
  return format(new Date(d), "d 'de' MMM yyyy", { locale: es });
}

export function ConvocatoriaDetallesModal({
  open,
  onOpenChange,
  convocatoriaId,
  convocatoria,
  isAdmin = false,
  onSaved,
}: ConvocatoriaDetallesModalProps) {
  const [titulo, setTitulo] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  const [imagenPreviewUrl, setImagenPreviewUrl] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => reject(new Error('Error al leer la imagen'));
      r.readAsDataURL(file);
    });

  const setPreviewFromFile = (file: File | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    if (!file) {
      setImagenPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setImagenPreviewUrl(url);
  };

  useEffect(() => {
    if (!open) return;
    const source = convocatoria ? 'postular' : 'create';
    const initialEditMode = !convocatoria;
    setEditMode(initialEditMode);
    if (convocatoria) {
      setTitulo(convocatoria.titulo);
      setFechaInicio(toInputDate(convocatoria.fechaInicio));
      setFechaFin(toInputDate(convocatoria.fechaFin));
      setDescripcion(convocatoria.descripcion ?? '');
      setImagenUrl(convocatoria.imagenUrl ?? '');
    } else {
      setTitulo('');
      setFechaInicio('');
      setFechaFin('');
      setDescripcion('');
      setImagenUrl('');
    }
    setImagenFile(null);
    setPreviewFromFile(null);
  }, [open, convocatoria, isAdmin]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (!titulo.trim() || !fechaInicio || !fechaFin) return;
    setSaving(true);
    try {
      let finalImagenUrl: string | null = imagenUrl || null;
      if (imagenFile) {
        try {
          finalImagenUrl = await fileToDataUrl(imagenFile);
        } catch {
          finalImagenUrl = null;
        }
      }
      const data: ConvocatoriaSavedData = {
        ...(convocatoria?.id && { id: convocatoria.id }),
        titulo,
        fechaInicio: new Date(fechaInicio),
        fechaFin: new Date(fechaFin),
        descripcion,
        imagenUrl: finalImagenUrl,
      };
      onSaved?.(data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = () => {
    setEditMode(true);
  };

  const resetFromConvocatoria = () => {
    if (!convocatoria) return;
    setTitulo(convocatoria.titulo);
    setFechaInicio(toInputDate(convocatoria.fechaInicio));
    setFechaFin(toInputDate(convocatoria.fechaFin));
    setDescripcion(convocatoria.descripcion ?? '');
    setImagenUrl(convocatoria.imagenUrl ?? '');
    setImagenFile(null);
    setPreviewFromFile(null);
    setEditMode(false);
  };

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImagenFile(f);
    setPreviewFromFile(f);
    setImagenUrl('');
  };

  const quitarImagen = () => {
    setImagenFile(null);
    setPreviewFromFile(null);
    setImagenUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isViewMode = !editMode && !!convocatoria;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg">
        <DialogHeader className="space-y-0 border-b border-gray-100 bg-gray-50/90 px-5 py-3 text-left">
          <DialogTitle className="m-0 flex items-center gap-2 text-[13px] font-medium leading-none tracking-wide text-gray-800">
            <ClipboardList className="size-3.5 shrink-0 text-blue-600" />
            <span>
              {convocatoria
                ? 'Detalles de la convocatoria'
                : 'Nueva convocatoria'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isViewMode ? (
          <>
            <div className="space-y-4 px-5 py-5">
              {imagenUrl ? (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                    Imagen
                  </p>
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagenUrl}
                      alt={titulo || 'Imagen de la convocatoria'}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
              ) : null}
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                  Título de convocatoria
                </p>
                <p className="text-[13px] text-gray-700">{titulo || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                    Fecha de inicio
                  </p>
                  <p className="text-[13px] text-gray-700">
                    {fechaInicio
                      ? formatDisplayDate(new Date(fechaInicio))
                      : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                    Fecha de fin
                  </p>
                  <p className="text-[13px] text-gray-700">
                    {fechaFin ? formatDisplayDate(new Date(fechaFin)) : '—'}
                  </p>
                </div>
              </div>
              {descripcion != null && descripcion !== '' && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                    Descripción
                  </p>
                  <p className="text-[13px] text-gray-700 whitespace-pre-wrap">
                    {descripcion}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter className="border-t border-gray-100 px-5 py-3 gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
              >
                Cerrar
              </Button>
              {isAdmin && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleEditar}
                  className="h-7 gap-1.5 px-2 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent"
                >
                  <Pencil className="size-3.5 shrink-0" />
                  Editar
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <div className="space-y-2">
              <Label htmlFor="conv-titulo" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Título de convocatoria
              </Label>
              <Input
                id="conv-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Beca de innovación 2025"
                required
                className="border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv-inicio" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                  Fecha de inicio
                </Label>
                <Input
                  id="conv-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                  className="border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conv-fin" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                  Fecha de fin
                </Label>
                <Input
                  id="conv-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                  className="border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv-desc" className="text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                Descripción
              </Label>
              <Textarea
                id="conv-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalles adicionales de la convocatoria..."
                rows={4}
                className="resize-none border-gray-200 bg-white text-[13px] shadow-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-gray-900">
                <ImageIcon className="size-3.5 shrink-0 text-gray-500" />
                Imagen de la convocatoria
              </Label>
              <input
                ref={fileInputRef}
                id="conv-imagen"
                type="file"
                accept="image/*"
                onChange={handleImagenChange}
                className="block w-full text-[13px] text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-200 file:text-[13px] file:font-normal file:bg-white file:text-gray-700 hover:file:text-emerald-700 file:cursor-pointer cursor-pointer"
              />
              {imagenPreviewUrl || imagenUrl ? (
                <div className="space-y-1 mt-2">
                  <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagenPreviewUrl || imagenUrl || ''}
                      alt="Vista previa"
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
                    onClick={quitarImagen}
                  >
                    Quitar imagen
                  </Button>
                </div>
              ) : null}
            </div>

            <DialogFooter className="border-t border-gray-100 -mx-5 px-5 py-3 gap-3 mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() =>
                  convocatoria ? resetFromConvocatoria() : onOpenChange(false)
                }
                disabled={saving}
                className="h-7 px-2 text-[13px] font-normal text-gray-500 hover:text-gray-900 hover:bg-transparent"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="ghost"
                disabled={saving}
                className="h-7 px-2 text-[13px] font-normal text-gray-900 hover:text-emerald-700 hover:bg-transparent"
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
