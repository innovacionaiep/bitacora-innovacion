'use client';

import { useState, useEffect, useCallback } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommentItem } from './CommentItem';
import { getComments, createComment, CommentWithRelations } from '@/lib/actions/post-comments';
import { useSession } from 'next-auth/react';

interface CommentSectionProps {
  postId: string;
  commentsCount: number;
}

export function CommentSection({ postId, commentsCount: initialCount }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<CommentWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalComments, setTotalComments] = useState(initialCount);

  const user = session?.user;
  const userName = user?.name || user?.email?.split('@')[0] || 'U';
  const userInitials = userName.slice(0, 2).toUpperCase();

  const loadComments = useCallback(async () => {
    setLoading(true);
    const result = await getComments(postId);
    if (result.success && result.data) {
      setComments(result.data);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createComment(postId, newComment);

    if (result.success && result.data) {
      setComments((prev) => [...prev, result.data!]);
      setNewComment('');
      setTotalComments((prev) => prev + 1);
    }
    setIsSubmitting(false);
  };

  const handleCommentAdded = (comment: CommentWithRelations) => {
    // Agregar respuesta al comentario padre
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === comment.parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), comment],
            _count: { ...c._count, replies: c._count.replies + 1 },
          };
        }
        return c;
      })
    );
    setTotalComments((prev) => prev + 1);
  };

  const handleCommentDeleted = (commentId: string) => {
    // Verificar si es un comentario principal o una respuesta
    let found = false;

    setComments((prev) => {
      // Primero intentar eliminar como comentario principal
      const filtered = prev.filter((c) => {
        if (c.id === commentId) {
          found = true;
          return false;
        }
        return true;
      });

      if (found) return filtered;

      // Si no se encontró, buscar en las respuestas
      return prev.map((c) => {
        const filteredReplies = c.replies?.filter((r) => r.id !== commentId) || [];
        if (filteredReplies.length !== (c.replies?.length || 0)) {
          found = true;
          return {
            ...c,
            replies: filteredReplies,
            _count: { ...c._count, replies: filteredReplies.length },
          };
        }
        return c;
      });
    });

    if (found) {
      setTotalComments((prev) => prev - 1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t pt-3 space-y-4">
      {/* Formulario para nuevo comentario */}
      {user && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={user.image || undefined} />
            <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              placeholder="Escribe un comentario..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[40px] max-h-[120px] text-sm resize-none"
              rows={1}
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
              className="flex-shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de comentarios */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay comentarios. ¡Sé el primero en comentar!
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              onCommentAdded={handleCommentAdded}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      )}

      {totalComments > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {totalComments} comentario{totalComments !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
