'use client';

import { useState } from 'react';
import { Feed } from './Feed';
import { CreatePostForm } from './CreatePostForm';
import { PostFilters, FilterType, SortType, Proyecto } from './PostFilters';
import { PostWithRelations } from '@/lib/actions/posts';

interface NovedadesContentProps {
  initialPosts?: PostWithRelations[];
  initialHasMore?: boolean;
  initialCursor?: string;
  initialProyectosParaFiltro?: Proyecto[];
  canManagePosts?: boolean;
  onPostCreated?: (post: PostWithRelations) => void;
  onPostDeleted?: (postId: string) => void;
  onOpenEvento?: (postId: string) => void;
  refreshTrigger?: number;
  onAttendanceChanged?: () => void;
}

export function NovedadesContent({
  initialPosts = [],
  initialHasMore = true,
  initialCursor,
  initialProyectosParaFiltro = [],
  canManagePosts = false,
  onPostCreated: externalOnPostCreated,
  onPostDeleted: onPostDeleted,
  onOpenEvento,
  refreshTrigger,
  onAttendanceChanged,
}: NovedadesContentProps) {
  const [newPost, setNewPost] = useState<PostWithRelations | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [selectedProyectoIds, setSelectedProyectoIds] = useState<string[]>([]);

  const handlePostCreated = (post: PostWithRelations) => {
    if (externalOnPostCreated) externalOnPostCreated(post);
    setNewPost(post);
    setTimeout(() => setNewPost(null), 100);
  };

  return (
    <div className="relative min-h-[600px] w-full">
      <div className="w-full">
        {canManagePosts && (
          <div className="mb-0">
            <CreatePostForm onPostCreated={handlePostCreated} />
          </div>
        )}

        {/* Línea + Ordenar por / Filtrar */}
        <PostFilters
          initialProyectos={initialProyectosParaFiltro}
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
          onOpenEvento={onOpenEvento}
          onPostDeleted={onPostDeleted}
          refreshTrigger={refreshTrigger}
          onAttendanceChanged={onAttendanceChanged}
        />
      </div>
    </div>
  );
}
