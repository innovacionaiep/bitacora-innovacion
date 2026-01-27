'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { PostCard } from './PostCard';
import { getPosts, PostWithRelations, GetPostsParams } from '@/lib/actions/posts';
import { FilterType, SortType } from './PostFilters';

interface FeedProps {
  initialPosts?: PostWithRelations[];
  initialHasMore?: boolean;
  initialCursor?: string;
  newPost?: PostWithRelations | null;
  filterType?: FilterType;
  sortType?: SortType;
  selectedProyectoIds?: string[];
}

export function Feed({
  initialPosts = [],
  initialHasMore = true,
  initialCursor,
  newPost,
  filterType = 'all',
  sortType = 'recent',
  selectedProyectoIds = [],
}: FeedProps) {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<PostWithRelations[]>(initialPosts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(initialPosts.length === 0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Agregar nuevo post cuando se crea uno externamente
  useEffect(() => {
    if (newPost) {
      setPosts((prev) => [{
        ...newPost,
        likes: [],
        isLikedByUser: false,
        userReactionType: null,
        reactionCounts: { Recomendar: 0, Celebrar: 0, Encantar: 0 },
        videos: newPost.videos ?? [],
      } as PostWithRelations, ...prev]);
    }
  }, [newPost]);

  const loadPosts = useCallback(async (loadCursor?: string, reset: boolean = false) => {
    setLoading(true);
    
    // Construir parámetros de filtrado
    const params: GetPostsParams = {
      cursor: loadCursor,
      sortBy: sortType,
    };

    // Aplicar filtros
    if (filterType === 'my-posts') {
      // Usar el parámetro myPosts que filtra por el usuario actual en el servidor
      params.myPosts = true;
    } else if (filterType === 'by-project' && selectedProyectoIds.length > 0) {
      // Solo aplicar filtro de proyectos si hay proyectos seleccionados
      params.proyectoIds = selectedProyectoIds;
    }
    // Si filterType es 'all' o 'by-project' sin proyectos seleccionados, 
    // no aplicamos filtros (mostrar todos)

    const result = await getPosts(params);

    if (result.success && result.data) {
      if (loadCursor && !reset) {
        // Agregar más posts
        setPosts((prev) => [...prev, ...result.data!.posts]);
      } else {
        // Posts iniciales o recarga completa
        setPosts(result.data.posts);
      }
      setHasMore(result.data.hasMore);
      setCursor(result.data.nextCursor);
    }

    setLoading(false);
    setInitialLoading(false);
  }, [filterType, sortType, selectedProyectoIds]);

  // Cargar posts cuando cambian los filtros u ordenamiento (solo si ya se cargaron posts iniciales)
  const [hasLoadedInitial, setHasLoadedInitial] = useState(initialPosts.length > 0);
  
  useEffect(() => {
    if (hasLoadedInitial) {
      loadPosts(undefined, true);
    }
  }, [loadPosts, hasLoadedInitial]);

  // Cargar posts iniciales si no se proporcionaron
  useEffect(() => {
    if (initialPosts.length === 0 && !hasLoadedInitial) {
      loadPosts().then(() => setHasLoadedInitial(true));
    } else if (initialPosts.length > 0) {
      setHasLoadedInitial(true);
    }
  }, [initialPosts.length, loadPosts, hasLoadedInitial]);

  // Infinite scroll
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading && cursor) {
      loadPosts(cursor);
    }
  }, [hasMore, loading, cursor]);

  // Observer para infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [handleLoadMore]);


  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Lista de posts */}
      {initialLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No hay publicaciones aún. ¡Sé el primero en compartir una novedad!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onPostDeleted={handlePostDeleted}
            />
          ))}

          {/* Trigger para cargar más */}
          <div ref={loadMoreRef} className="py-4">
            {loading && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
            {!hasMore && posts.length > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                No hay más publicaciones
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
