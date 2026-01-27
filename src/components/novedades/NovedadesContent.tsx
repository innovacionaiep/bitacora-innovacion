'use client';

import { useState, useEffect, useRef } from 'react';
import { Feed } from './Feed';
import { CreatePostForm } from './CreatePostForm';
import { PostFilters, FilterType, SortType } from './PostFilters';
import { PostWithRelations } from '@/lib/actions/posts';

interface NovedadesContentProps {
  initialPosts?: PostWithRelations[];
  initialHasMore?: boolean;
  initialCursor?: string;
  onPostCreated?: (post: PostWithRelations) => void;
  showCreateForm?: boolean;
}

export function NovedadesContent({
  initialPosts = [],
  initialHasMore = true,
  initialCursor,
  onPostCreated: externalOnPostCreated,
  showCreateForm = true,
}: NovedadesContentProps) {
  const [newPost, setNewPost] = useState<PostWithRelations | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [selectedProyectoIds, setSelectedProyectoIds] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const formContainerRef = useRef<HTMLDivElement>(null);

  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'NovedadesContent.tsx:component-mount',
        message: 'Component mounted',
        data: { initialPostsCount: initialPosts.length, hasMore: initialHasMore },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'A'
      })
    }).catch(() => {});
  }, []);
  // #endregion

  // #region agent log
  useEffect(() => {
    if (containerRef.current && formContainerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const formRect = formContainerRef.current.getBoundingClientRect();
      fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'NovedadesContent.tsx:layout-check',
          message: 'Layout dimensions check',
          data: {
            containerHeight: containerRect.height,
            containerWidth: containerRect.width,
            containerTop: containerRect.top,
            containerBottom: containerRect.bottom,
            formHeight: formRect.height,
            formWidth: formRect.width,
            formTop: formRect.top,
            formBottom: formRect.bottom,
            formLeft: formRect.left,
            viewportHeight: window.innerHeight,
            isFormVisible: formRect.height > 0 && formRect.width > 0,
            isFormInViewport: formRect.top < window.innerHeight && formRect.bottom > 0
          },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          runId: 'run1',
          hypothesisId: 'A,B,C'
        })
      }).catch(() => {});
    }
  });
  // #endregion

  const handlePostCreated = (post: PostWithRelations) => {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'NovedadesContent.tsx:handlePostCreated',
        message: 'Post created callback',
        data: { postId: post.id },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'run1',
        hypothesisId: 'D'
      })
    }).catch(() => {});
    // #endregion
    // Si hay un callback externo, llamarlo
    if (externalOnPostCreated) {
      externalOnPostCreated(post);
    }
    // Pasar el nuevo post al Feed
    setNewPost(post);
    // Resetear después de un momento para permitir que se agregue nuevamente si es necesario
    setTimeout(() => setNewPost(null), 100);
  };

  return (
    <div ref={containerRef} className="relative min-h-[600px]">
      {/* Feed centrado respecto a toda la página */}
      <div className="max-w-2xl" style={{ marginLeft: 'calc(50vw - 550px - 336px)' }}>
        {/* Componente de Filtros y Ordenamiento */}
        <PostFilters
          filterType={filterType}
          sortType={sortType}
          selectedProyectoIds={selectedProyectoIds}
          onFilterChange={setFilterType}
          onSortChange={setSortType}
          onProyectoIdsChange={setSelectedProyectoIds}
        />
        
        <Feed
          initialPosts={initialPosts}
          initialHasMore={initialHasMore}
          initialCursor={initialCursor}
          newPost={newPost}
          filterType={filterType}
          sortType={sortType}
          selectedProyectoIds={selectedProyectoIds}
        />
      </div>

      {/* Formulario de posteo en la parte inferior izquierda del área de contenido */}
      {showCreateForm && (
        <div ref={formContainerRef} className="absolute bottom-0 left-0 w-96 max-w-[calc(50vw-4rem)]">
          {/* #region agent log */}
          {(() => {
            fetch('http://127.0.0.1:7244/ingest/aab8fdcd-8a37-4785-bc99-6e88f2d38fbe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                location: 'NovedadesContent.tsx:form-container-render',
                message: 'Form container rendering',
                data: { className: 'absolute bottom-0 left-0 w-96 max-w-[calc(50vw-4rem)]' },
                timestamp: Date.now(),
                sessionId: 'debug-session',
                runId: 'run1',
                hypothesisId: 'A,C'
              })
            }).catch(() => {});
            return null;
          })()}
          {/* #endregion */}
          <CreatePostForm onPostCreated={handlePostCreated} />
        </div>
      )}
    </div>
  );
}
