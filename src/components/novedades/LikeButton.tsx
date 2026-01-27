'use client';

import { useState } from 'react';
import { ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  isLiked: boolean;
  likesCount: number;
  onToggle: () => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

export function LikeButton({
  isLiked,
  likesCount,
  onToggle,
  disabled = false,
  size = 'default',
}: LikeButtonProps) {
  const [optimisticLiked, setOptimisticLiked] = useState(isLiked);
  const [optimisticCount, setOptimisticCount] = useState(likesCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    // Actualización optimista
    const wasLiked = optimisticLiked;
    setOptimisticLiked(!wasLiked);
    setOptimisticCount((prev) => (wasLiked ? prev - 1 : prev + 1));
    setIsLoading(true);

    try {
      await onToggle();
    } catch {
      // Revertir en caso de error
      setOptimisticLiked(wasLiked);
      setOptimisticCount((prev) => (wasLiked ? prev + 1 : prev - 1));
    } finally {
      setIsLoading(false);
    }
  };

  const isSmall = size === 'sm';

  return (
    <Button
      variant="ghost"
      size={isSmall ? 'sm' : 'default'}
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        'gap-1.5',
        optimisticLiked && 'text-blue-600 hover:text-blue-700'
      )}
    >
      <ThumbsUp
        className={cn(
          isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4',
          optimisticLiked && 'fill-current'
        )}
      />
      {optimisticCount > 0 && (
        <span className={isSmall ? 'text-xs' : 'text-sm'}>
          {optimisticCount}
        </span>
      )}
    </Button>
  );
}
