import { NovedadesPageWrapper } from '@/components/novedades/NovedadesPageWrapper';
import { getPosts, getUpcomingEvents, getProyectosParaPost } from '@/lib/actions/posts';
import { getRandomParticipants, getRandomProjects, getMonthlyTrends } from '@/lib/actions/discovery';

export default async function NovedadesPage() {
  // Cargar TODOS los datos en paralelo en el servidor
  const [postsResult, eventosResult, participantsResult, projectsResult, trendsResult, proyectosParaFiltroResult] = await Promise.all([
    getPosts(),
    getUpcomingEvents(10),
    getRandomParticipants(4),
    getRandomProjects(3),
    getMonthlyTrends(),
    getProyectosParaPost(), // Proyectos para el filtro
  ]);

  const initialPosts = postsResult.success && postsResult.data ? postsResult.data.posts : [];
  const initialHasMore = postsResult.success && postsResult.data ? postsResult.data.hasMore : false;
  const initialCursor = postsResult.success && postsResult.data ? postsResult.data.nextCursor : undefined;
  
  // Datos del sidebar
  const initialEventos = eventosResult.success && eventosResult.data ? eventosResult.data.posts : [];
  const initialParticipants = participantsResult.success && participantsResult.data ? participantsResult.data : [];
  const initialProjects = projectsResult.success && projectsResult.data ? projectsResult.data : [];
  const initialTrends = trendsResult.success && trendsResult.data ? trendsResult.data : null;
  
  // Proyectos para el filtro
  const initialProyectosParaFiltro = proyectosParaFiltroResult.success && proyectosParaFiltroResult.data 
    ? proyectosParaFiltroResult.data 
    : [];

  return (
    <NovedadesPageWrapper
      initialPosts={initialPosts}
      initialHasMore={initialHasMore}
      initialCursor={initialCursor}
      initialEventos={initialEventos}
      initialParticipants={initialParticipants}
      initialProjects={initialProjects}
      initialTrends={initialTrends}
      initialProyectosParaFiltro={initialProyectosParaFiltro}
    />
  );
}
