'use client';

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** Textarea para tab General: 2 líneas por defecto, se expande al enfocar para mostrar todo el texto */
export function GeneralTabTextarea({
  className,
  onFocus,
  onBlur,
  onChange,
  ...props
}: React.ComponentProps<typeof Textarea>) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const expandHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 52)}px`;
  };
  const resetHeight = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '';
  };
  return (
    <Textarea
      ref={ref}
      rows={2}
      className={cn('min-h-[52px] resize-none overflow-y-auto', className)}
      onFocus={(e) => {
        expandHeight();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        resetHeight();
        onBlur?.(e);
      }}
      onChange={(e) => {
        if (document.activeElement === e.target) expandHeight();
        onChange?.(e);
      }}
      {...props}
    />
  );
}
