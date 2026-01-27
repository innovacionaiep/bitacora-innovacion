'use client';

import { useState } from 'react';
import { NovedadesContent } from './NovedadesContent';
import { CreatePostForm } from './CreatePostForm';
import { PostWithRelations } from '@/lib/actions/posts';

interface NovedadesPageWrapperProps {
  initialPosts?: PostWithRelations[];
  initialHasMore?: boolean;
  initialCursor?: string;
}

export function NovedadesPageWrapper({
  initialPosts = [],
  initialHasMore = true,
  initialCursor,
}: NovedadesPageWrapperProps) {
  const [newPost, setNewPost] = useState<PostWithRelations | null>(null);

  const handlePostCreated = (post: PostWithRelations) => {
    // Pasar el nuevo post al Feed
    setNewPost(post);
    // Resetear después de un momento para permitir que se agregue nuevamente si es necesario
    setTimeout(() => setNewPost(null), 100);
  };

  return (
    <div className="h-full bg-gray-100 w-full flex">
      {/* Sección estática izquierda - Título, subtítulo y formulario */}
      <div className="flex-shrink-0 bg-gray-100 px-8 pt-6 pb-6 w-[550px] border-r border-gray-200 flex flex-col">
        <div className="sticky top-0 flex flex-col h-full">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Novedades</h1>
            <p className="text-muted-foreground mt-1">
              Comparte y descubre las últimas actualizaciones de los proyectos
            </p>
          </div>

          {/* Formulario de crear post en la parte inferior */}
          <div className="mt-auto">
            <CreatePostForm onPostCreated={handlePostCreated} />
          </div>
        </div>
      </div>

      {/* Sección scrollable derecha - Feed de posts */}
      <div className="flex-1 overflow-y-auto scrollbar-gray bg-white">
        <div className="px-8 pt-6 pb-6">
          <NovedadesContent
            initialPosts={initialPosts}
            initialHasMore={initialHasMore}
            initialCursor={initialCursor}
            onPostCreated={handlePostCreated}
            showCreateForm={false}
          />
        </div>
      </div>
    </div>
  );
}
