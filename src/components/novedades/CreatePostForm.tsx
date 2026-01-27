'use client';

import { useState, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageUploader, UploadedImage } from './ImageUploader';
import { ProjectSelector } from './ProjectSelector';
import { createPost, PostWithRelations } from '@/lib/actions/posts';
import { useSession } from 'next-auth/react';

interface CreatePostFormProps {
  onPostCreated: (post: PostWithRelations) => void;
}

export function CreatePostForm({ onPostCreated }: CreatePostFormProps) {
  const { data: session } = useSession();
  const [contenido, setContenido] = useState('');
  const [proyectoIds, setProyectoIds] = useState<string[]>([]);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const user = session?.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'U';
  const userInitials = userName.slice(0, 2).toUpperCase();

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'CreatePostForm.tsx:component-render',
        message: 'CreatePostForm rendering',
        data: { hasUser: !!user, userId: user?.id, userEmail: user?.email },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D'
      })
    }).catch(() => { });
  }, [user]);
  // #endregion

  // #region agent log
  useEffect(() => {
    if (!user) {
      fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'CreatePostForm.tsx:no-user-branch',
          message: 'No user - showing login message',
          data: { sessionExists: !!session },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'D'
        })
      }).catch(() => { });
    } else {
      fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'CreatePostForm.tsx:form-rendering',
          message: 'Form is rendering (user exists)',
          data: { isExpanded, contenidoLength: contenido.length },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'D'
        })
      }).catch(() => { });
    }
  }, [user, session, isExpanded, contenido]);
  // #endregion

  const canSubmit = contenido.trim().length > 0 && proyectoIds.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const result = await createPost({
      contenido,
      proyectoIds,
      imagenes: images,
    });

    if (result.success && result.data) {
      onPostCreated(result.data as PostWithRelations);
      // Limpiar formulario
      setContenido('');
      setProyectoIds([]);
      setImages([]);
      setIsExpanded(false);
    } else {
      setError(result.error || 'Error al crear la publicación');
    }

    setIsSubmitting(false);
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
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-3">
            {/* Textarea principal */}
            <Textarea
              placeholder="¿Qué novedades tienes sobre tus proyectos?"
              value={contenido}
              onChange={(e) => {
                setContenido(e.target.value);
                if (!isExpanded && e.target.value.length > 0) {
                  setIsExpanded(true);
                }
              }}
              onFocus={() => setIsExpanded(true)}
              className={`resize-none border-0 shadow-none focus-visible:ring-0 p-0 ${isExpanded ? 'min-h-[100px]' : 'min-h-[40px]'
                }`}
              rows={isExpanded ? 4 : 1}
            />

            {/* Campos adicionales cuando está expandido */}
            {isExpanded && (
              <>
                {/* Selector de proyectos */}
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

                {/* Subida de imágenes */}
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

                {/* Error */}
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                {/* Acciones */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (contenido.trim() || images.length > 0 || proyectoIds.length > 0) {
                        if (confirm('¿Descartar los cambios?')) {
                          setContenido('');
                          setProyectoIds([]);
                          setImages([]);
                          setIsExpanded(false);
                          setError(null);
                        }
                      } else {
                        setIsExpanded(false);
                      }
                    }}
                  >
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
