'use client';

import { useState } from 'react';
import {
  Send,
  Loader2,
  Play,
  ImageIcon,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { Calendar } from '@/components/ui/calendar';
import { ImageUploader, UploadedImage } from './ImageUploader';
import { ProjectSelector } from './ProjectSelector';
import { createPost, PostWithRelations } from '@/lib/actions/posts';
import { useSession } from 'next-auth/react';
import { parseYouTubeUrl } from '@/lib/youtube';
import { cn } from '@/lib/utils';

type MediaMode = 'foto' | 'video' | 'evento';

interface CreatePostFormProps {
  onPostCreated: (post: PostWithRelations) => void;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const { data: session } = useSession();
  const [contenido, setContenido] = useState('');
  const [proyectoIds, setProyectoIds] = useState<string[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [mediaMode, setMediaMode] = useState<MediaMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  // Campos específicos para eventos
  const [eventoFecha, setEventoFecha] = useState<string>('');
  const [eventoNombre, setEventoNombre] = useState<string>('');
  const [eventoDescripcion, setEventoDescripcion] = useState<string>('');

  const user = session?.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'U';
  const userInitials = userName.slice(0, 2).toUpperCase();

  const canSubmit =
    contenido.trim().length > 0 &&
    proyectoIds.length > 0 &&
    (mediaMode !== 'evento' ||
      (eventoFecha.trim() && eventoNombre.trim() && eventoDescripcion.trim()));

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    const videos: { youtubeUrl: string; youtubeVideoId: string }[] = [];
    if (mediaMode === 'video' && youtubeUrl.trim()) {
      const parsed = parseYouTubeUrl(youtubeUrl.trim());
      if (!parsed) {
        setError(
          'Ingresa una URL válida de YouTube (ej. youtube.com/watch?v=... o youtu.be/...)'
        );
        return;
      }
      videos.push({
        youtubeUrl: youtubeUrl.trim(),
        youtubeVideoId: parsed.videoId,
      });
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createPost({
      contenido,
      proyectoIds,
      imagenes: images,
      videos: videos.length > 0 ? videos : undefined,
      eventoFecha: mediaMode === 'evento' ? eventoFecha : undefined,
      eventoNombre: mediaMode === 'evento' ? eventoNombre : undefined,
      eventoDescripcion: mediaMode === 'evento' ? eventoDescripcion : undefined,
    });

    if (result.success && result.data) {
      onPostCreated(result.data as PostWithRelations);
      setContenido('');
      setProyectoIds([]);
      setImages([]);
      setYoutubeUrl('');
      setMediaMode(null);
      setIsExpanded(false);
      setEventoFecha('');
      setEventoNombre('');
      setEventoDescripcion('');
    } else {
      setError(result.error || 'Error al crear la publicación');
    }

    setIsSubmitting(false);
  };

  const discard = () => {
    if (
      contenido.trim() ||
      images.length > 0 ||
      proyectoIds.length > 0 ||
      youtubeUrl.trim() ||
      eventoFecha.trim() ||
      eventoNombre.trim() ||
      eventoDescripcion.trim()
    ) {
      if (confirm('¿Descartar los cambios?')) {
        setContenido('');
        setProyectoIds([]);
        setImages([]);
        setYoutubeUrl('');
        setMediaMode(null);
        setIsExpanded(false);
        setError(null);
        setEventoFecha('');
        setEventoNombre('');
        setEventoDescripcion('');
      }
    } else {
      setIsExpanded(false);
      setMediaMode(null);
      setError(null);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-center text-muted-foreground">
            Inicia sesión para crear publicaciones
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={DEFAULT_AVATAR} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            <Textarea
              placeholder="¿Qué novedades sobre tus proyectos te gustaría compartir?"
              value={contenido}
              onChange={(e) => {
                setContenido(e.target.value);
                if (!isExpanded && e.target.value.length > 0)
                  setIsExpanded(true);
              }}
              onFocus={() => setIsExpanded(true)}
              className={cn(
                'resize-none border-0 shadow-none focus-visible:ring-0 bg-muted/50 rounded-lg pl-3 pr-3 py-2',
                isExpanded ? 'min-h-[100px]' : 'min-h-[40px]'
              )}
              rows={isExpanded ? 4 : 1}
            />

            {/* Botones Vídeo | Foto | Evento (siempre visibles) */}
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5 text-muted-foreground hover:text-green-600 hover:bg-green-50',
                  mediaMode === 'video' && 'text-green-600 bg-green-50'
                )}
                onClick={() => {
                  setMediaMode((m) => (m === 'video' ? null : 'video'));
                  if (!isExpanded) setIsExpanded(true);
                }}
              >
                <Play className="h-4 w-4" />
                Vídeo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5 text-muted-foreground hover:text-blue-600 hover:bg-blue-50',
                  mediaMode === 'foto' && 'text-blue-600 bg-blue-50'
                )}
                onClick={() => {
                  setMediaMode((m) => (m === 'foto' ? null : 'foto'));
                  if (!isExpanded) setIsExpanded(true);
                }}
              >
                <ImageIcon className="h-4 w-4" />
                Foto
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'gap-1.5 text-muted-foreground hover:text-orange-600 hover:bg-orange-50',
                  mediaMode === 'evento' && 'text-orange-600 bg-orange-50'
                )}
                onClick={() => {
                  setMediaMode((m) => (m === 'evento' ? null : 'evento'));
                  if (!isExpanded) setIsExpanded(true);
                }}
              >
                <CalendarIcon className="h-4 w-4" />
                Evento
              </Button>
            </div>

            {isExpanded && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">
                    Proyectos asociados *
                  </label>
                  <ProjectSelector
                    selectedIds={proyectoIds}
                    onSelectionChange={setProyectoIds}
                    disabled={isSubmitting}
                  />
                </div>

                {mediaMode === 'foto' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Imágenes (opcional)
                    </label>
                    <ImageUploader
                      images={images}
                      onImagesChange={setImages}
                      disabled={isSubmitting}
                      maxImages={4}
                    />
                  </div>
                )}

                {mediaMode === 'video' && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-muted-foreground">
                      Enlace de YouTube
                    </label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="https://www.youtube.com/watch?v=... o youtu.be/..."
                        value={youtubeUrl}
                        onChange={(e) => {
                          setYoutubeUrl(e.target.value);
                          setError(null);
                        }}
                        disabled={isSubmitting}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setYoutubeUrl('');
                          setError(null);
                        }}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {mediaMode === 'evento' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Fecha del evento *
                      </label>
                      <Calendar
                        value={eventoFecha || undefined}
                        onChange={(date) => {
                          setEventoFecha(date);
                          setError(null);
                        }}
                        placeholder="Seleccionar fecha"
                        disabled={isSubmitting}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Nombre del evento *
                      </label>
                      <Input
                        placeholder="Ej: Reunión de coordinación"
                        value={eventoNombre}
                        onChange={(e) => {
                          setEventoNombre(e.target.value);
                          setError(null);
                        }}
                        disabled={isSubmitting}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Descripción breve *
                      </label>
                      <Textarea
                        placeholder="Describe brevemente el evento..."
                        value={eventoDescripcion}
                        onChange={(e) => {
                          setEventoDescripcion(e.target.value);
                          setError(null);
                        }}
                        disabled={isSubmitting}
                        className="min-h-[80px] resize-none"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">
                        Imagen del evento (opcional)
                      </label>
                      <ImageUploader
                        images={images}
                        onImagesChange={setImages}
                        disabled={isSubmitting}
                        maxImages={1}
                      />
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-destructive">{error}</p>}

                <div className="flex items-center justify-between pt-2 border-t">
                  <Button variant="ghost" size="sm" onClick={discard}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={!canSubmit || isSubmitting}
                    className="gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Publicando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Publicar
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
