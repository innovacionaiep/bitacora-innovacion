'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth-utils';

// Tipos para las respuestas
export interface PostWithRelations {
  id: string;
  contenido: string;
  authorId: string;
  authorRoleAtPost: string | null;
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

    const { cursor, limit: actualLimit, authorId, myPosts, proyectoIds, sortBy = 'recent' } = actualParams;

    // Construir el where clause
    const where: any = {};
    
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

    // Determinar el ordenamiento
    let orderBy: any;
    if (sortBy === 'relevant') {
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
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return bRelevance - aRelevance;
      });
    }

    const nextCursor = hasMore ? postsToReturn[postsToReturn.length - 1]?.id : undefined;
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
        if (reactionCountsByPost[r.postId] && (t === 'Recomendar' || t === 'Celebrar' || t === 'Encantar')) {
          reactionCountsByPost[r.postId][t] = r._count.id;
        }
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
  } catch (error) {
    console.error('Error fetching posts:', error);
    return {
      success: false,
      error: 'Error al cargar las publicaciones',
    };
  }
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

    const post = await prisma.post.create({
      data: {
        contenido: data.contenido.trim(),
        authorId: user.id,
        authorRoleAtPost: user.activeRole ?? null,
        imagenes: {
          create: data.imagenes.map((img, index) => ({
            url: img.url,
            publicId: img.publicId,
            orden: index,
          })),
        },
        videos: (data.videos?.length ?? 0) > 0
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

const VALID_REACTIONS: PostReactionType[] = ['Recomendar', 'Celebrar', 'Encantar'];

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
 * (proyectos donde es participante)
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

    // Obtener proyectos donde el usuario es participante
    const participaciones = await prisma.proyectoParticipante.findMany({
      where: {
        userId: user.id,
      },
      select: {
        proyecto: {
          select: {
            id: true,
            proyecto: true,
          },
        },
      },
    });

    const proyectos = participaciones.map((p) => p.proyecto);

    // Si el usuario es Admin, obtener todos los proyectos
    const userRoles = await prisma.userRole.findMany({
      where: { userId: user.id },
      select: { role: true },
    });

    const isAdmin = userRoles.some((r) => r.role === 'Admin');

    if (isAdmin) {
      const todosLosProyectos = await prisma.proyecto.findMany({
        select: {
          id: true,
          proyecto: true,
        },
        orderBy: {
          proyecto: 'asc',
        },
      });

      return {
        success: true,
        data: todosLosProyectos,
      };
    }

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
