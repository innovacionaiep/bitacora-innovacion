'use client';

import { useState } from 'react';
import { MessageCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { LikeButton } from './LikeButton';
import {
  toggleCommentLike,
  createComment,
  deleteComment,
  CommentWithRelations,
} from '@/lib/actions/post-comments';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

interface CommentItemProps {
  comment: CommentWithRelations;
  postId: string;
  onCommentAdded: (comment: CommentWithRelations) => void;
  onCommentDeleted: (commentId: string) => void;
  isReply?: boolean;
}

export function CommentItem({
  comment,
  postId,
  onCommentAdded,
  onCommentDeleted,
  isReply = false,
}: CommentItemProps) {
  const { data: session } = useSession();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likesCount, setLikesCount] = useState(comment._count.likes);
  const [isLiked, setIsLiked] = useState(comment.isLikedByUser || false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAuthor = session?.user?.id === comment.authorId;
  const authorName = comment.author.name || comment.author.email.split('@')[0];
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  const handleToggleLike = async () => {
    const result = await toggleCommentLike(comment.id);
    if (result.success) {
      setIsLiked(result.liked || false);
      setLikesCount((prev) => (result.liked ? prev + 1 : prev - 1));
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const result = await createComment(postId, replyContent, comment.id);

    if (result.success && result.data) {
      onCommentAdded(result.data);
      setReplyContent('');
      setShowReplyForm(false);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (isDeleting) return;

    if (!confirm('¿Estás seguro de eliminar este comentario?')) return;

    setIsDeleting(true);
    const result = await deleteComment(comment.id);

    if (result.success) {
      onCommentDeleted(comment.id);
    }
    setIsDeleting(false);
  };

  return (
    <div className={`flex gap-3 ${isReply ? 'ml-10' : ''}`}>
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={DEFAULT_AVATAR} />
        <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="bg-muted rounded-lg px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-sm">{authorName}</span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(comment.createdAt), {
                addSuffix: true,
                locale: es,
              })}
            </span>
          </div>
          <p className="text-sm mt-1 whitespace-pre-wrap break-words">
            {comment.contenido}
          </p>
        </div>

        {/* Acciones del comentario */}
        <div className="flex items-center gap-1 mt-1">
          <LikeButton
            isLiked={isLiked}
            likesCount={likesCount}
            onToggle={handleToggleLike}
            size="sm"
          />

          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="gap-1.5 text-muted-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-xs">Responder</span>
            </Button>
          )}

          {isAuthor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Formulario de respuesta */}
        {showReplyForm && (
          <div className="mt-2 flex gap-2">
            <Textarea
              placeholder="Escribe una respuesta..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[60px] text-sm resize-none"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={!replyContent.trim() || isSubmitting}
              >
                {isSubmitting ? '...' : 'Enviar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyContent('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Respuestas */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                postId={postId}
                onCommentAdded={onCommentAdded}
                onCommentDeleted={onCommentDeleted}
                isReply
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
