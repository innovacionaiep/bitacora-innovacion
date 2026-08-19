'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { saveVitrinaVideos } from '@/lib/actions/vitrina-videos';
import { VITRINA_VIDEOS_MAX } from '@/lib/vitrina-videos';
import type { VitrinaVideo } from '@/components/vitrina/vitrina-content';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  videos: VitrinaVideo[];
};

export function VitrinaVideoEditor({ videos }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<string[]>(() => videos.map((v) => v.url));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setUrls(videos.map((v) => v.url));
      setPassword('');
      setError('');
    }
  }, [open, videos]);

  const updateUrl = (index: number, value: string) => {
    setUrls((prev) => prev.map((url, i) => (i === index ? value : url)));
  };

  const removeUrl = (index: number) => {
    setUrls((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const addUrl = () => {
    setUrls((prev) => (prev.length >= VITRINA_VIDEOS_MAX ? prev : [...prev, '']));
  };

  async function handleSave() {
    setError('');
    setSaving(true);
    const result = await saveVitrinaVideos({ urls, password });
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo guardar');
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-md transition-colors hover:bg-slate-50"
      >
        <Pencil className="h-4 w-4" aria-hidden />
        Editar videos
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>URLs de videos de la vitrina</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {urls.map((url, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Label htmlFor={`vitrina-video-${index}`}>Video {index + 1}</Label>
                  <Input
                    id={`vitrina-video-${index}`}
                    type="url"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=… o Vimeo"
                    disabled={saving}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeUrl(index)}
                  disabled={saving || urls.length <= 1}
                  aria-label={`Quitar video ${index + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {urls.length < VITRINA_VIDEOS_MAX ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addUrl}
                disabled={saving}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Añadir URL
              </Button>
            ) : null}
            <div className="space-y-1.5 pt-2">
              <Label htmlFor="vitrina-videos-password">Contraseña</Label>
              <Input
                id="vitrina-videos-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña de Novedades"
                disabled={saving}
                autoComplete="current-password"
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
