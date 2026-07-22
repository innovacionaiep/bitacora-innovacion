'use server';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { getCurrentUser } from '@/lib/auth-utils';
import { roleHasPermission } from '@/lib/permissions/check';

// Tipos para las respuestas
export interface PostWithRelations {
  id: string;
  contenido: string;
  authorId: string;
  authorRoleAtPost: string | null;
  eventoFecha: Date | null;
  eventoNombre: string | null;
  eventoDescripcion: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  imagenes: {
    id: string;
    url: string;
    publicId: string;
    orden: number;
  }[];
  videos: {
    id: string;
    youtubeUrl: string;
    youtubeVideoId: string;
    orden: number;
  }[];
  proyectos: {
    proyecto: {
      id: string;
      proyecto: string;
      sede: string;
      escuelas: {
        escuela: {
          id: string;
          nombre: string;
        };
      }[];
    };
  }[];
  likes: {
    id: string;
    userId: string;
    reactionType: string;
  }[];
  _count: {
    likes: number;
    comentarios: number;
  };
  isLikedByUser?: boolean;
  userReactionType?: 'Recomendar' | 'Celebrar' | 'Encantar' | null;
  /** Conteo por tipo (Recomendar, Celebrar, Encantar) para mostrar iconos estilo LinkedIn */
  reactionCounts?: { Recomendar: number; Celebrar: number; Encantar: number };
  /** Asistencia a eventos (solo para posts tipo evento) */
  asistentesCount?: number;
  isAsistiendo?: boolean;
  asistentesPreview?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }[];
}

export type PostReactionType = 'Recomendar' | 'Celebrar' | 'Encantar';

export interface CreatePostData {
  contenido: string;
  proyectoIds: string[];
  imagenes: {
    url: string;
    publicId: string;
  }[];
  videos?: { youtubeUrl: string; youtubeVideoId: string }[];
  eventoFecha?: string; // Fecha en formato string (DD/MM/YYYY)
  eventoNombre?: string;
  eventoDescripcion?: string;
}

export interface GetPostsResult {
  success: boolean;
  data?: {
    posts: PostWithRelations[];
    hasMore: boolean;
    nextCursor?: string;
  };
  error?: string;
}

export interface GetPostsParams {
  cursor?: string;
  limit?: number;
  authorId?: string; // Filtrar por autor (para "Mis posts")
  myPosts?: boolean; // Filtrar solo posts del usuario actual
  proyectoIds?: string[]; // Filtrar por proyectos
  sortBy?: 'recent' | 'relevant'; // Ordenamiento: reciente o relevante
  eventosOnly?: boolean; // Filtrar solo posts de tipo evento
}

/**
 * Obtener posts del feed con paginación basada en cursor
 */
export async function getPosts(
  cursor?: string,
  limit?: number,
  params?: Omit<GetPostsParams, 'cursor' | 'limit'>
): Promise<GetPostsResult>;
export async function getPosts(
  params?: GetPostsParams
): Promise<GetPostsResult>;
export async function getPosts(
  cursorOrParams?: string | GetPostsParams,
  limit: number = 10,
  params?: Omit<GetPostsParams, 'cursor' | 'limit'>
): Promise<GetPostsResult> {
  try {
    const user = await getCurrentUser();
    const userId = user?.id;

    // Manejar sobrecarga de función
    let actualParams: GetPostsParams;
    if (typeof cursorOrParams === 'string') {
      // Formato antiguo: getPosts(cursor, limit, params)
      actualParams = {
        cursor: cursorOrParams,
        limit,
        ...params,
      };
    } else {
      // Formato nuevo: getPosts(params)
      actualParams = cursorOrParams || {};
      if (!actualParams.limit) {
        actualParams.limit = 10;
      }
    }

    const {
      cursor,
      limit: actualLimit,
      authorId,
      myPosts,
      proyectoIds,
      sortBy = 'recent',
      eventosOnly,
    } = actualParams;

    // Determinar si podemos usar caché (solo para carga inicial sin filtros ni cursor)
    // NO cachear si hay userId porque los likes y asistencias son específicos del usuario
    const isInitialLoad =
      !cursor &&
      !authorId &&
      !myPosts &&
      (!proyectoIds || proyectoIds.length === 0) &&
      sortBy === 'recent' &&
      !eventosOnly;

    // Solo usar caché si NO hay userId (datos públicos)
    // Si hay userId, los datos son específicos del usuario y no podemos cachear
    if (isInitialLoad && !userId) {
      const cachedGetPosts = unstable_cache(
        async () => {
          // Ejecutar sin userId (datos públicos)
          return await _executeGetPosts(actualParams, undefined);
        },
        ['posts-initial'],
        {
          revalidate: 15, // Revalidar cada 15 segundos
          tags: ['posts'],
        }
      );
      return await cachedGetPosts();
    }

    // Para otras cargas (con filtros, cursor, userId, etc.), ejecutar directamente sin caché
    return await _executeGetPosts(actualParams, userId);
  } catch (error) {
    console.error('Error fetching posts:', error);
    return {
      success: false,
      error: 'Error al cargar las publicaciones',
    };
  }
}

/**
 * Función interna para ejecutar la query de posts
 */
async function _executeGetPosts(
  actualParams: GetPostsParams,
  userId: string | undefined
): Promise<GetPostsResult> {
  const {
    cursor,
    limit: actualLimit,
    authorId,
    myPosts,
    proyectoIds,
    sortBy = 'recent',
    eventosOnly,
  } = actualParams;
  const postsStartTime = Date.now();

  // Construir el where clause
  const where: Prisma.PostWhereInput = {};

  if (myPosts && userId) {
    // Filtrar solo posts del usuario actual
    where.authorId = userId;
  } else if (authorId) {
    where.authorId = authorId;
  }

  if (proyectoIds && proyectoIds.length > 0) {
    where.proyectos = {
      some: {
        proyectoId: {
          in: proyectoIds,
        },
      },
    };
  }

  // Filtrar solo eventos si se solicita
  if (eventosOnly) {
    where.eventoFecha = { not: null };
    where.eventoNombre = { not: null };
    where.eventoDescripcion = { not: null };
  }

  // Determinar el ordenamiento
  let orderBy: Prisma.PostOrderByWithRelationInput;
  if (eventosOnly) {
    // Para eventos, ordenar por fecha del evento (próximos primero)
    orderBy = {
      eventoFecha: 'asc',
    };
  } else if (sortBy === 'relevant') {
    // Ordenar por relevancia: suma de likes + comentarios
    // Usaremos una consulta raw o múltiples orderBy
    // Por ahora, ordenamos por createdAt y luego ordenaremos en memoria
    // En producción, podrías usar una vista materializada o un campo calculado
    orderBy = {
      createdAt: 'desc',
    };
  } else {
    // Orden por fecha (más reciente)
    orderBy = {
      createdAt: 'desc',
    };
  }

  const posts = await prisma.post.findMany({
    take: (actualLimit || 10) + 1, // +1 para saber si hay más
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Saltar el cursor
    }),
    where,
    orderBy,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      imagenes: {
        orderBy: { orden: 'asc' },
      },
      videos: {
        orderBy: { orden: 'asc' },
      },
      proyectos: {
        include: {
          proyecto: {
            select: {
              id: true,
              proyecto: true,
              sede: true,
              escuelas: {
                include: {
                  escuela: {
                    select: {
                      id: true,
                      nombre: true,
                    },
                  },
                },
                take: 1, // Solo traer la primera escuela para no sobrecargar
              },
            },
          },
        },
      },
      likes: userId
        ? {
            where: { userId },
            select: {
              id: true,
              userId: true,
              reactionType: true,
            },
          }
        : false,
      _count: {
        select: {
          likes: true,
          comentarios: true,
        },
      },
    },
  });

  const actualLimitValue = actualLimit || 10;
  const hasMore = posts.length > actualLimitValue;
  let postsToReturn = hasMore ? posts.slice(0, -1) : posts;

  // Si el ordenamiento es por relevancia, ordenar por interacciones
  if (sortBy === 'relevant') {
    postsToReturn = postsToReturn.sort((a, b) => {
      const aRelevance = (a._count.likes || 0) + (a._count.comentarios || 0);
      const bRelevance = (b._count.likes || 0) + (b._count.comentarios || 0);
      // Ordenar descendente (más relevante primero)
      // Si tienen la misma relevancia, ordenar por fecha (más reciente primero)
      if (aRelevance === bRelevance) {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      return bRelevance - aRelevance;
    });
  }

  const nextCursor = hasMore
    ? postsToReturn[postsToReturn.length - 1]?.id
    : undefined;
  const postIds = postsToReturn.map((p) => p.id);

  const reactionCountsByPost: Record<
    string,
    { Recomendar: number; Celebrar: number; Encantar: number }
  > = {};
  for (const id of postIds) {
    reactionCountsByPost[id] = { Recomendar: 0, Celebrar: 0, Encantar: 0 };
  }
  if (postIds.length > 0) {
    const reactionCountsRaw = await prisma.postLike.groupBy({
      by: ['postId', 'reactionType'],
      where: {
        postId: { in: postIds },
        reactionType: { in: ['Recomendar', 'Celebrar', 'Encantar'] },
      },
      _count: { id: true },
    });
    for (const r of reactionCountsRaw) {
      const t = r.reactionType as 'Recomendar' | 'Celebrar' | 'Encantar';
      if (
        reactionCountsByPost[r.postId] &&
        (t === 'Recomendar' || t === 'Celebrar' || t === 'Encantar')
      ) {
        reactionCountsByPost[r.postId][t] = r._count.id;
      }
    }
  }

  // Conteo y estado de asistencia (solo relevante para eventos)
  const asistentesCountByPost: Record<string, number> = {};
  for (const id of postIds) asistentesCountByPost[id] = 0;
  let asistenciasFeatureAvailable = true;
  if (postIds.length > 0) {
    try {
      const asistentesCountsRaw = await prisma.eventoAsistente.groupBy({
        by: ['postId'],
        where: { postId: { in: postIds } },
        _count: { id: true },
      });
      for (const r of asistentesCountsRaw) {
        asistentesCountByPost[r.postId] = r._count.id;
      }
    } catch (e: unknown) {
      const err = e as {
        name?: string;
        code?: string;
        message?: string;
        stack?: string;
      };
      // Si la tabla aún no existe (migración no aplicada), degradar con gracia (mostrar 0 asistentes)
      if (
        err?.code === 'P2021' &&
        String(err?.message ?? '').includes('evento_asistentes')
      ) {
        asistenciasFeatureAvailable = false;
      } else {
        throw e;
      }
    }
  }

  const isAsistiendoByPost: Record<string, boolean> = {};
  for (const id of postIds) isAsistiendoByPost[id] = false;
  if (asistenciasFeatureAvailable && userId && postIds.length > 0) {
    const asistenciasUsuario = await prisma.eventoAsistente.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    for (const a of asistenciasUsuario) isAsistiendoByPost[a.postId] = true;
  }

  const asistentesPreviewByPost: Record<
    string,
    { id: string; name: string | null; email: string; image: string | null }[]
  > = {};
  for (const id of postIds) asistentesPreviewByPost[id] = [];
  if (asistenciasFeatureAvailable && postIds.length > 0) {
    const asistenciasPreview = await prisma.eventoAsistente.findMany({
      where: { postId: { in: postIds } },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // límite razonable para agrupar en memoria
    });
    for (const a of asistenciasPreview) {
      const arr = asistentesPreviewByPost[a.postId];
      if (arr && arr.length < 3) arr.push(a.user);
    }
  }

  const postsWithLikeStatus = postsToReturn.map((post) => {
    const userLike = userId && post.likes.length > 0 ? post.likes[0] : null;
    return {
      ...post,
      isLikedByUser: !!userLike,
      userReactionType: userLike
        ? (userLike.reactionType as 'Recomendar' | 'Celebrar' | 'Encantar')
        : null,
      reactionCounts: reactionCountsByPost[post.id] ?? {
        Recomendar: 0,
        Celebrar: 0,
        Encantar: 0,
      },
      asistentesCount: asistentesCountByPost[post.id] ?? 0,
      isAsistiendo: isAsistiendoByPost[post.id] ?? false,
      asistentesPreview: asistentesPreviewByPost[post.id] ?? [],
    };
  });

  return {
    success: true,
    data: {
      posts: postsWithLikeStatus as PostWithRelations[],
      hasMore,
      nextCursor,
    },
  };
}

/**
 * Obtener eventos próximos (con caché de 60s)
 * Optimizado para EventosWall
 */
export async function getUpcomingEvents(
  limit: number = 10
): Promise<GetPostsResult> {
  const cachedFetch = unstable_cache(
    async () => {
      return await _executeGetPosts(
        { eventosOnly: true, limit, sortBy: 'recent' },
        undefined
      );
    },
    ['upcoming-events', String(limit)],
    { revalidate: 60, tags: ['posts', 'events'] }
  );
  return await cachedFetch();
}

/**
 * Crear una nueva publicación
 */
export async function createPost(data: CreatePostData) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'Debes iniciar sesión para publicar',
      };
    }

    if (!data.contenido.trim()) {
      return {
        success: false,
        error: 'El contenido no puede estar vacío',
      };
    }

    if (data.proyectoIds.length === 0) {
      return {
        success: false,
        error: 'Debes seleccionar al menos un proyecto',
      };
    }

    // Validar campos de evento si están presentes
    if (data.eventoFecha || data.eventoNombre || data.eventoDescripcion) {
      if (!data.eventoFecha || !data.eventoNombre || !data.eventoDescripcion) {
        return {
          success: false,
          error: 'Todos los campos del evento son requeridos',
        };
      }
    }

    // Convertir fecha de string (DD/MM/YYYY o DD-MM-YYYY) a Date
    let eventoFechaDate: Date | null = null;
    if (data.eventoFecha) {
      // El componente Calendar puede devolver formato DD/MM/YYYY o DD-MM-YYYY
      const separators = ['/', '-'];
      let day: string | undefined,
        month: string | undefined,
        year: string | undefined;

      for (const sep of separators) {
        if (data.eventoFecha.includes(sep)) {
          [day, month, year] = data.eventoFecha.split(sep);
          break;
        }
      }

      if (day && month && year) {
        eventoFechaDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day)
        );
        // Ajustar a medianoche para evitar problemas de timezone
        eventoFechaDate.setHours(0, 0, 0, 0);
        if (isNaN(eventoFechaDate.getTime())) {
          return {
            success: false,
            error: 'Fecha del evento inválida',
          };
        }
      }
    }

    const post = await prisma.post.create({
      data: {
        contenido: data.contenido.trim(),
        authorId: user.id,
        authorRoleAtPost: user.activeRole ?? null,
        eventoFecha: eventoFechaDate,
        eventoNombre: data.eventoNombre?.trim() || null,
        eventoDescripcion: data.eventoDescripcion?.trim() || null,
        imagenes: {
          create: data.imagenes.map((img, index) => ({
            url: img.url,
            publicId: img.publicId,
            orden: index,
          })),
        },
        videos:
          (data.videos?.length ?? 0) > 0
            ? {
                create: (data.videos ?? []).map((v, index) => ({
                  youtubeUrl: v.youtubeUrl,
                  youtubeVideoId: v.youtubeVideoId,
                  orden: index,
                })),
              }
            : undefined,
        proyectos: {
          create: data.proyectoIds.map((proyectoId) => ({
            proyectoId,
          })),
        },
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        imagenes: true,
        videos: true,
        proyectos: {
          include: {
            proyecto: {
              select: {
                id: true,
                proyecto: true,
                sede: true,
                escuelas: {
                  include: {
                    escuela: {
                      select: {
                        id: true,
                        nombre: true,
                      },
                    },
                  },
                  take: 1, // Solo traer la primera escuela para no sobrecargar
                },
              },
            },
          },
        },
        likes: { select: { id: true, userId: true, reactionType: true } },
        _count: {
          select: {
            likes: true,
            comentarios: true,
          },
        },
      },
    });

    revalidatePath('/novedades');
    revalidateTag('posts');
    revalidateTag('discovery');

    return {
      success: true,
      data: post,
    };
  } catch (error) {
    console.error('Error creating post:', error);
    return {
      success: false,
      error: 'Error al crear la publicación',
    };
  }
}

/**
 * Eliminar una publicación (solo el autor puede eliminar)
 */
export async function deletePost(postId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'Debes iniciar sesión',
      };
    }

    // Verificar que el post existe y pertenece al usuario
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      return {
        success: false,
        error: 'Publicación no encontrada',
      };
    }

    if (post.authorId !== user.id) {
      return {
        success: false,
        error: 'No tienes permiso para eliminar esta publicación',
      };
    }

    // Eliminar el post (las relaciones se eliminan en cascada)
    await prisma.post.delete({
      where: { id: postId },
    });

    revalidatePath('/novedades');
    revalidateTag('posts');
    revalidateTag('discovery');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting post:', error);
    return {
      success: false,
      error: 'Error al eliminar la publicación',
    };
  }
}

/**
 * Alternar asistencia del usuario actual a un evento.
 * Si ya está confirmado, se cancela. Si no, se confirma.
 */
export async function toggleEventoAsistencia(postId: string) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'Debes iniciar sesión para confirmar asistencia',
      };
    }

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        eventoFecha: true,
        eventoNombre: true,
        eventoDescripcion: true,
      },
    });
    if (!post) {
      return { success: false, error: 'Evento no encontrado' };
    }
    const isEvento = !!(
      post.eventoFecha &&
      post.eventoNombre &&
      post.eventoDescripcion
    );
    if (!isEvento) {
      return { success: false, error: 'La publicación no es un evento' };
    }

    let existing: { id: string } | null = null;
    try {
      existing = await prisma.eventoAsistente.findUnique({
        where: { postId_userId: { postId, userId: user.id } },
        select: { id: true },
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (
        err?.code === 'P2021' &&
        String(err?.message ?? '').includes('evento_asistentes')
      ) {
        return {
          success: false,
          error:
            'La tabla de asistencias no existe en la BD (migración pendiente). Aplica la migración de Prisma y vuelve a intentar.',
        };
      }
      throw e;
    }

    let isAsistiendo: boolean;
    if (existing) {
      await prisma.eventoAsistente.delete({ where: { id: existing.id } });
      isAsistiendo = false;
    } else {
      await prisma.eventoAsistente.create({
        data: { postId, userId: user.id },
      });
      isAsistiendo = true;
    }

    let asistentesCount = 0;
    try {
      asistentesCount = await prisma.eventoAsistente.count({
        where: { postId },
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (
        err?.code === 'P2021' &&
        String(err?.message ?? '').includes('evento_asistentes')
      ) {
        asistentesCount = 0;
      } else {
        throw e;
      }
    }

    revalidatePath('/novedades');
    revalidateTag('posts');
    revalidateTag('discovery');
    return { success: true, data: { isAsistiendo, asistentesCount } };
  } catch (error) {
    console.error('Error toggling asistencia evento:', error);
    return { success: false, error: 'Error al procesar la asistencia' };
  }
}

/**
 * Obtener lista completa de asistentes confirmados a un evento
 */
export async function getEventoAsistentes(postId: string) {
  try {
    try {
      const asistentes = await prisma.eventoAsistente.findMany({
        where: { postId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      return { success: true, data: asistentes.map((a) => a.user) };
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (
        err?.code === 'P2021' &&
        String(err?.message ?? '').includes('evento_asistentes')
      ) {
        return { success: true, data: [] };
      }
      throw e;
    }
  } catch (error) {
    console.error('Error fetching asistentes evento:', error);
    return { success: false, error: 'Error al cargar asistentes' };
  }
}

export interface EventoDetallesResult {
  success: boolean;
  data?: {
    postId: string;
    eventoNombre: string;
    eventoFecha: Date;
    eventoDescripcion: string;
    imagenUrl?: string | null;
    author: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    };
    proyectos: Array<{
      id: string;
      proyecto: string;
      sede: string;
      escuelas: { id: string; nombre: string }[];
      encargados: Array<{
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        cargo: string | null;
      }>;
    }>;
    sedes: string[];
    escuelas: { id: string; nombre: string }[];
    asistentes: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
    }[];
    asistentesCount: number;
    isAsistiendo: boolean;
  };
  error?: string;
}

/**
 * Obtener detalles completos del evento (para modal)
 */
export async function getEventoDetalles(
  postId: string
): Promise<EventoDetallesResult> {
  try {
    const user = await getCurrentUser();
    const userId = user?.id;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: { select: { id: true, name: true, email: true, image: true } },
        imagenes: { orderBy: { orden: 'asc' } },
        proyectos: {
          include: {
            proyecto: {
              select: {
                id: true,
                proyecto: true,
                sede: true,
                escuelas: {
                  include: { escuela: { select: { id: true, nombre: true } } },
                },
              },
            },
          },
        },
      },
    });

    if (
      !post ||
      !post.eventoFecha ||
      !post.eventoNombre ||
      !post.eventoDescripcion
    ) {
      return { success: false, error: 'Evento no encontrado' };
    }

    const proyectoIds = post.proyectos.map((p) => p.proyecto.id);
    const encargadosByProyecto: Record<
      string,
      Array<{
        id: string;
        name: string | null;
        email: string;
        image: string | null;
        cargo: string | null;
      }>
    > = {};
    for (const id of proyectoIds) encargadosByProyecto[id] = [];

    if (proyectoIds.length > 0) {
      const encargados = await prisma.proyectoParticipante.findMany({
        where: { proyectoId: { in: proyectoIds }, rol: 'Encargado' },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      });
      for (const e of encargados) {
        if (!e.user) continue;
        const arr = encargadosByProyecto[e.proyectoId] ?? [];
        arr.push({ ...e.user, cargo: e.cargo ?? null });
        encargadosByProyecto[e.proyectoId] = arr;
      }
    }

    const proyectos = post.proyectos.map(({ proyecto }) => ({
      id: proyecto.id,
      proyecto: proyecto.proyecto,
      sede: proyecto.sede,
      escuelas: (proyecto.escuelas ?? []).map((e) => e.escuela),
      encargados: encargadosByProyecto[proyecto.id] ?? [],
    }));

    const sedes = Array.from(new Set(proyectos.map((p) => p.sede))).filter(
      Boolean
    );
    const escuelasMap = new Map<string, { id: string; nombre: string }>();
    for (const p of proyectos) {
      for (const esc of p.escuelas) escuelasMap.set(esc.id, esc);
    }
    const escuelas = Array.from(escuelasMap.values());

    let asistentesRows: Array<{
      userId: string;
      user: {
        id: string;
        name: string | null;
        email: string;
        image: string | null;
      };
    }> = [];
    try {
      asistentesRows = await prisma.eventoAsistente.findMany({
        where: { postId },
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (
        err?.code === 'P2021' &&
        String(err?.message ?? '').includes('evento_asistentes')
      ) {
        asistentesRows = [];
      } else {
        throw e;
      }
    }
    const asistentes = asistentesRows.map((a) => a.user);
    const asistentesCount = asistentes.length;
    const isAsistiendo = !!(
      userId && asistentesRows.some((a) => a.userId === userId)
    );

    return {
      success: true,
      data: {
        postId: post.id,
        eventoNombre: post.eventoNombre,
        eventoFecha: post.eventoFecha,
        eventoDescripcion: post.eventoDescripcion,
        imagenUrl: post.imagenes?.[0]?.url ?? null,
        author: post.author,
        proyectos,
        sedes,
        escuelas,
        asistentes,
        asistentesCount,
        isAsistiendo,
      },
    };
  } catch (error) {
    console.error('Error fetching evento detalles:', error);
    return { success: false, error: 'Error al cargar detalles del evento' };
  }
}

const VALID_REACTIONS: PostReactionType[] = [
  'Recomendar',
  'Celebrar',
  'Encantar',
];

/**
 * Establecer o cambiar reacción en una publicación (estilo LinkedIn).
 * Si ya tiene esa reacción, se quita. Si tiene otra, se actualiza.
 */
export async function setPostReaction(
  postId: string,
  reactionType: PostReactionType
) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'Debes iniciar sesión para reaccionar',
      };
    }
    if (!VALID_REACTIONS.includes(reactionType)) {
      return {
        success: false,
        error: 'Reacción no válida',
      };
    }

    const existing = await prisma.postLike.findUnique({
      where: {
        postId_userId: { postId, userId: user.id },
      },
    });

    if (existing) {
      if (existing.reactionType === reactionType) {
        await prisma.postLike.delete({ where: { id: existing.id } });
        revalidatePath('/novedades');
        revalidateTag('posts');
    revalidateTag('discovery');
        return {
          success: true,
          reaction: null as 'Recomendar' | 'Celebrar' | 'Encantar' | null,
          added: false,
        };
      }
      await prisma.postLike.update({
        where: { id: existing.id },
        data: { reactionType },
      });
    } else {
      await prisma.postLike.create({
        data: { postId, userId: user.id, reactionType },
      });
    }

    revalidatePath('/novedades');
    revalidateTag('posts');
    revalidateTag('discovery');
    return {
      success: true,
      reaction: reactionType,
      added: true,
    };
  } catch (error) {
    console.error('Error setting post reaction:', error);
    return {
      success: false,
      error: 'Error al procesar la reacción',
    };
  }
}

/**
 * Obtener los proyectos disponibles para el usuario actual
 * (proyectos donde es participante o todos si es Admin)
 * Optimizado: queries en paralelo
 */
export async function getProyectosParaPost() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return {
        success: false,
        error: 'Debes iniciar sesión',
      };
    }

    // Ejecutar queries en paralelo para mejor rendimiento
    const [participaciones] = await Promise.all([
      prisma.proyectoParticipante.findMany({
        where: { userId: user.id },
        select: {
          proyecto: {
            select: { id: true, proyecto: true },
          },
        },
      }),
    ]);

    const canViewAll = await roleHasPermission(
      (user as { activeRole?: string | null }).activeRole,
      'projects.view_all'
    );

    // Si tiene projects.view_all, obtener todos los proyectos
    if (canViewAll) {
      const todosLosProyectos = await prisma.proyecto.findMany({
        select: { id: true, proyecto: true },
        orderBy: { proyecto: 'asc' },
      });

      return {
        success: true,
        data: todosLosProyectos,
      };
    }

    // Si no, devolver solo sus proyectos
    const proyectos = participaciones.map((p) => p.proyecto);

    return {
      success: true,
      data: proyectos,
    };
  } catch (error) {
    console.error('Error fetching proyectos para post:', error);
    return {
      success: false,
      error: 'Error al cargar los proyectos',
    };
  }
}
