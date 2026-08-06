'use server';

import { getSession } from '@/lib/auth-utils';
import { userHasAdminEnabled } from '@/lib/authz/pure';
import {
  getPosts,
  getUpcomingEvents,
  getProyectosParaPost,
} from '@/lib/actions/posts';
import {
  getRandomProjects,
  getMonthlyTrends,
  type RandomProject,
  type MonthlyTrends,
} from '@/lib/actions/discovery';
import type { PostWithRelations } from '@/lib/actions/posts';

export interface NovedadesPageData {
  initialPosts: PostWithRelations[];
  initialHasMore: boolean;
  initialCursor: string | undefined;
  initialEventos: PostWithRelations[];
  initialProjects: RandomProject[];
  initialTrends: MonthlyTrends | null;
  initialProyectosParaFiltro: { id: string; proyecto: string }[];
}

/**
 * Obtiene todos los datos para la página de Novedades. Solo Admin.
 * Se usa tras verificar contraseña en el cliente (no se persiste cookie).
 */
export async function getNovedadesPageData(): Promise<
  { success: true; data: NovedadesPageData } | { success: false; error: string }
> {
  const session = await getSession();
  if (!session?.user) {
    return { success: false, error: 'No autenticado' };
  }
  if (!userHasAdminEnabled(session.user.availableRoles ?? [])) {
    return { success: false, error: 'Sin permisos' };
  }

  const [
    postsResult,
    eventosResult,
    projectsResult,
    trendsResult,
    proyectosParaFiltroResult,
  ] = await Promise.all([
    getPosts(),
    getUpcomingEvents(10),
    getRandomProjects(6),
    getMonthlyTrends(),
    getProyectosParaPost(),
  ]);

  const initialPosts =
    postsResult.success && postsResult.data ? postsResult.data.posts : [];
  const initialHasMore =
    postsResult.success && postsResult.data ? postsResult.data.hasMore : false;
  const initialCursor =
    postsResult.success && postsResult.data
      ? postsResult.data.nextCursor
      : undefined;
  const initialEventos =
    eventosResult.success && eventosResult.data ? eventosResult.data.posts : [];
  const initialProjects =
    projectsResult.success && projectsResult.data ? projectsResult.data : [];
  const initialTrends =
    trendsResult.success && trendsResult.data ? trendsResult.data : null;
  const initialProyectosParaFiltro =
    proyectosParaFiltroResult.success && proyectosParaFiltroResult.data
      ? proyectosParaFiltroResult.data
      : [];

  return {
    success: true,
    data: {
      initialPosts,
      initialHasMore,
      initialCursor,
      initialEventos,
      initialProjects,
      initialTrends,
      initialProyectosParaFiltro,
    },
  };
}
