'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  repeatingIconMaskUri,
  vitrinaImpactIcon,
} from '@/lib/vitrina-impact-icons';
import { useVitrinaIconSvg } from '@/hooks/useVitrinaIconSvg';

export function VitrinaImpactPattern({
  word,
  progress,
  frozen = false,
  className,
}: {
  word: string;
  progress: number;
  frozen?: boolean;
  className?: string;
}) {
  const icon = useVitrinaIconSvg(word);
  const { color } = vitrinaImpactIcon(word);
  const mask = useMemo(
    () =>
      icon && icon.paths.length > 0
        ? repeatingIconMaskUri(icon.paths, icon.viewBox)
        : null,
    [icon],
  );
  if (!icon || !mask) return null;

  const maxOpacity =
    word === 'educativo' || word === 'tecnológico' ? 0.32 : 0.2;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute motion-reduce:opacity-20',
        className ?? 'inset-0',
      )}
      style={{
        backgroundColor: color,
        opacity: progress * maxOpacity,
        WebkitMaskImage: mask,
        maskImage: mask,
        WebkitMaskRepeat: 'repeat',
        maskRepeat: 'repeat',
        WebkitMaskSize: '72px 72px',
        maskSize: '72px 72px',
        WebkitMaskPosition: 'left top',
        maskPosition: 'left top',
        transition: frozen
          ? 'none'
          : 'opacity 55ms linear, background-color 400ms ease',
      }}
    />
  );
}

