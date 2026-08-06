'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-utils';
import { requireSession } from '@/lib/authz/guards';

// Tipos para comentarios
export interface CommentWithRelations {
  id: string;
  postId: string;
  authorId: string;
  parentId: string | null;
  contenido: string;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  likes: {
    id: string;
    userId: string;
  }[];
  _count: {
    likes: number;
    replies: number;
  };
  replies?: CommentWithRelations[];
  isLikedByUser?: boolean;
}

/**
 * Obtener comentarios de un post con respuestas anidadas
 */
export async function getComments(postId: string) {
  try {
    const user = await getCurrentUser();
    const userId = user?.id;

    // Obtener comentarios principales (sin parentId)
    const comments = await prisma.postComment.findMany({
      where: {
        postId,
        parentId: null,
      },
      orderBy: {
        createdAt: 'asc',
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
        likes: userId
          ? {
              where: {
                userId: userId,
              },
              select: {
                id: true,
                userId: true,
              },
            }
          : false,
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
        replies: {
          orderBy: {
            createdAt: 'asc',
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
            likes: userId
              ? {
                  where: {
                    userId: userId,
                  },
                  select: {
                    id: true,
                    userId: true,
                  },
                }
              : false,
            _count: {
              select: {
                likes: true,
                replies: true,
              },
            },
          },
        },
      },
    });

    // Agregar flag de si el usuario dio like
    const commentsWithLikeStatus = comments.map((comment) => ({
      ...comment,
      isLikedByUser: userId ? comment.likes.length > 0 : false,
      replies: comment.replies.map((reply) => ({
        ...reply,
        isLikedByUser: userId ? reply.likes.length > 0 : false,
      })),
    }));

    return {
      success: true,
      data: commentsWithLikeStatus as CommentWithRelations[],
    };
  } catch (error) {
    console.error('Error fetching comments:', error);
    return {
      success: false,
      error: 'Error al cargar los comentarios',
    };
  }
}

/**
 * Crear un comentario o respuesta
 */
export async function createComment(
  postId: string,
  contenido: string,
  parentId?: string
) {
  try {
    const gate = await requireSession();
    if (!gate.ok) return { success: false, error: gate.error };
    const user = gate.user;

    if (!contenido.trim()) {
      return {
        success: false,
        error: 'El comentario no puede estar vacío',
      };
    }

    // Verificar que el post existe
    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      return {
        success: false,
        error: 'La publicación no existe',
      };
    }

    // Si es una respuesta, verificar que el comentario padre existe
    if (parentId) {
      const parentComment = await prisma.postComment.findUnique({
        where: { id: parentId },
      });

      if (!parentComment) {
        return {
          success: false,
          error: 'El comentario padre no existe',
        };
      }
    }

    const comment = await prisma.postComment.create({
      data: {
        postId,
        authorId: user.id,
        contenido: contenido.trim(),
        parentId: parentId || null,
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
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
    });

    return {
      success: true,
      data: {
        ...comment,
        likes: [],
        isLikedByUser: false,
      } as CommentWithRelations,
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    return {
      success: false,
      error: 'Error al crear el comentario',
    };
  }
}

/**
 * Eliminar un comentario (solo el autor puede eliminar)
 */
export async function deleteComment(commentId: string) {
  try {
    const gate = await requireSession();
    if (!gate.ok) return { success: false, error: gate.error };
    const user = gate.user;

    // Verificar que el comentario existe y pertenece al usuario
    const comment = await prisma.postComment.findUnique({
      where: { id: commentId },
      select: { authorId: true },
    });

    if (!comment) {
      return {
        success: false,
        error: 'Comentario no encontrado',
      };
    }

    if (comment.authorId !== user.id) {
      return {
        success: false,
        error: 'No tienes permiso para eliminar este comentario',
      };
    }

    // Eliminar el comentario (las respuestas y likes se eliminan en cascada)
    await prisma.postComment.delete({
      where: { id: commentId },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting comment:', error);
    return {
      success: false,
      error: 'Error al eliminar el comentario',
    };
  }
}

/**
 * Dar o quitar like a un comentario
 */
export async function toggleCommentLike(commentId: string) {
  try {
    const gate = await requireSession();
    if (!gate.ok) return { success: false, error: gate.error };
    const user = gate.user;

    // Verificar si ya existe el like
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId,
          userId: user.id,
        },
      },
    });

    if (existingLike) {
      // Quitar like
      await prisma.commentLike.delete({
        where: { id: existingLike.id },
      });

      return {
        success: true,
        liked: false,
      };
    } else {
      // Dar like
      await prisma.commentLike.create({
        data: {
          commentId,
          userId: user.id,
        },
      });

      return {
        success: true,
        liked: true,
      };
    }
  } catch (error) {
    console.error('Error toggling comment like:', error);
    return {
      success: false,
      error: 'Error al procesar el like',
    };
  }
}
