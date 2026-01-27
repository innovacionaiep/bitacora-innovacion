'use client';

import { useState } from 'react';
import { Feed } from './Feed';
import { CreatePostForm } from './CreatePostForm';
import { PostFilters, FilterType, SortType } from './PostFilters';
import { PostWithRelations } from '@/lib/actions/posts';

interface NovedadesContentProps {
  initialPosts?: PostWithRelations[];
  initialHasMore?: boolean;
  initialCursor?: string;
  onPostCreated?: (post: PostWithRelations) => void;
}

export function NovedadesContent({
  initialPosts = [],
  initialHasMore = true,
  initialCursor,
  onPostCreated: externalOnPostCreated,
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
    <div className="relative min-h-[600px]">
      <div className="max-w-2xl" style={{ marginLeft: 'calc(50vw - 550px - 336px)' }}>
        {/* Casilla crear publicación (estilo LinkedIn) */}
        <div className="mb-2">
          <CreatePostForm onPostCreated={handlePostCreated} />
        </div>

        {/* Línea + Ordenar por / Filtrar */}
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
    </div>
  );
}
