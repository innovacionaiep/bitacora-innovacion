import { NovedadesPageWrapper } from '@/components/novedades/NovedadesPageWrapper';
import { getPosts } from '@/lib/actions/posts';

export default async function NovedadesPage() {
  // Cargar posts iniciales en el servidor
  const result = await getPosts();

  const initialPosts = result.success && result.data ? result.data.posts : [];
  const initialHasMore = result.success && result.data ? result.data.hasMore : false;
  const initialCursor = result.success && result.data ? result.data.nextCursor : undefined;

  return (
    <NovedadesPageWrapper
      initialPosts={initialPosts}
      initialHasMore={initialHasMore}
      initialCursor={initialCursor}
    />
  );
}
