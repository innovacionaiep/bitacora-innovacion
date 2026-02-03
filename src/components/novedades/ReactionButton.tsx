'use client';

import { useState, useRef } from 'react';
import { ThumbsUp, PartyPopper, Heart, SmilePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { PostReactionType } from '@/lib/actions/posts';

const REACTIONS: {
  type: PostReactionType;
  label: string;
  Icon: typeof ThumbsUp;
}[] = [
  { type: 'Recomendar', label: 'Recomendar', Icon: ThumbsUp },
  { type: 'Celebrar', label: 'Celebrar', Icon: PartyPopper },
  { type: 'Encantar', label: 'Encantar', Icon: Heart },
];

interface ReactionButtonProps {
  userReaction: PostReactionType | null;
  onSelectReaction: (type: PostReactionType) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

export function ReactionButton({
  userReaction,
  onSelectReaction,
  disabled = false,
  size = 'default',
}: ReactionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimeout = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  };
  const clearLeaveTimeout = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const handleOpenHover = () => {
    clearLeaveTimeout();
    hoverTimeoutRef.current = setTimeout(() => setOpen(true), 200);
  };

  const handleCloseHover = () => {
    clearHoverTimeout();
    leaveTimeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  const handleSelect = async (type: PostReactionType) => {
    if (disabled || loading) return;
    setLoading(true);
    setOpen(false);
    try {
      await onSelectReaction(type);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (o: boolean) => {
    clearHoverTimeout();
    clearLeaveTimeout();
    setOpen(o);
  };

  const current = REACTIONS.find((r) => r.type === userReaction);
  const isSmall = size === 'sm';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={isSmall ? 'sm' : 'default'}
          disabled={disabled || loading}
          className={cn(
            'gap-1.5',
            userReaction === 'Recomendar' &&
              'text-blue-600 hover:text-blue-700',
            userReaction === 'Celebrar' &&
              'text-green-600 hover:text-green-700',
            userReaction === 'Encantar' && 'text-red-500 hover:text-red-600'
          )}
          onMouseEnter={handleOpenHover}
          onMouseLeave={handleCloseHover}
          onClick={() => handleOpenChange(!open)}
        >
          {current ? (
            <>
              <current.Icon
                className={cn(
                  isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4',
                  'fill-current'
                )}
              />
              <span className={isSmall ? 'text-xs' : 'text-sm'}>
                {current.label}
              </span>
            </>
          ) : (
            <>
              <SmilePlus className={cn(isSmall ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
              <span className={isSmall ? 'text-xs' : 'text-sm'}>
                Reaccionar
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-1 rounded-full flex items-center gap-0.5"
        align="start"
        side="top"
        sideOffset={6}
        onMouseEnter={clearLeaveTimeout}
        onMouseLeave={handleCloseHover}
      >
        {REACTIONS.map(({ type, label, Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleSelect(type)}
            className={cn(
              'flex items-center justify-center rounded-full p-2 transition-colors',
              'hover:bg-muted',
              userReaction === type && 'bg-muted'
            )}
            title={label}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                type === 'Recomendar' && 'text-blue-600',
                type === 'Celebrar' && 'text-green-600',
                type === 'Encantar' && 'text-red-500'
              )}
            />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
