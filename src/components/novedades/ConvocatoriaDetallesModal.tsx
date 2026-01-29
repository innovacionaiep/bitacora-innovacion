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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <span>{convocatoria ? 'Detalles de la convocatoria' : 'Nueva convocatoria'}</span>
          </DialogTitle>
        </DialogHeader>

        {isViewMode ? (
          <>
            <div className="space-y-4">
              {imagenUrl ? (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Imagen</p>
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
                <p className="text-sm font-medium text-muted-foreground">Título de convocatoria</p>
                <p className="text-base text-gray-900">{titulo || '—'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Fecha de inicio</p>
                  <p className="text-base text-gray-900">
                    {fechaInicio ? formatDisplayDate(new Date(fechaInicio)) : '—'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Fecha de fin</p>
                  <p className="text-base text-gray-900">
                    {fechaFin ? formatDisplayDate(new Date(fechaFin)) : '—'}
                  </p>
                </div>
              </div>
              {(descripcion != null && descripcion !== '') && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Descripción</p>
                  <p className="text-base text-gray-900 whitespace-pre-wrap">{descripcion}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
              {isAdmin && (
                <Button type="button" onClick={handleEditar} className="gap-2">
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="conv-titulo">Título de convocatoria</Label>
              <Input
                id="conv-titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Beca de innovación 2025"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conv-inicio">Fecha de inicio</Label>
                <Input
                  id="conv-inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conv-fin">Fecha de fin</Label>
                <Input
                  id="conv-fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="conv-desc">Descripción</Label>
              <Textarea
                id="conv-desc"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Detalles adicionales de la convocatoria..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Imagen de la convocatoria
              </Label>
              <input
                ref={fileInputRef}
                id="conv-imagen"
                type="file"
                accept="image/*"
                onChange={handleImagenChange}
                className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer cursor-pointer"
              />
              {(imagenPreviewUrl || imagenUrl) ? (
                <div className="space-y-1 mt-2">
                  <div className="relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagenPreviewUrl || imagenUrl || ''}
                      alt="Vista previa"
                      className="object-cover w-full h-full"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={quitarImagen}
                  >
                    Quitar imagen
                  </Button>
                </div>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => (convocatoria ? resetFromConvocatoria() : onOpenChange(false))}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
