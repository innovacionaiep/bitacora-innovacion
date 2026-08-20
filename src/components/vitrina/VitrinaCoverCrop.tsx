'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  clampCoverOffset,
  clampCoverZoom,
  vitrinaCoverImageStyle,
} from '@/lib/vitrina-proyectos';
import { cn } from '@/lib/utils';

type Props = {
  url: string;
  offsetX: number;
  offsetY: number;
  zoom: number;
  className?: string;
  maskClassName?: string;
  interactive?: boolean;
  disabled?: boolean;
  onChange?: (next: {
    coverOffsetX: number;
    coverOffsetY: number;
    coverZoom: number;
  }) => void;
};

export function VitrinaCoverCrop({
  url,
  offsetX,
  offsetY,
  zoom,
  className,
  maskClassName,
  interactive = false,
  disabled = false,
  onChange,
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const emit = useCallback(
    (nextX: number, nextY: number, nextZoom: number) => {
      onChange?.({
        coverOffsetX: clampCoverOffset(nextX),
        coverOffsetY: clampCoverOffset(nextY),
        coverZoom: clampCoverZoom(nextZoom),
      });
    },
    [onChange],
  );

  useEffect(() => {
    const el = boxRef.current;
    if (!el || !interactive || disabled) return;
    const onWheelNative = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY > 0 ? -0.08 : 0.08;
      emit(offsetX, offsetY, zoom + delta);
    };
    el.addEventListener('wheel', onWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', onWheelNative);
  }, [disabled, emit, interactive, offsetX, offsetY, zoom]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || disabled) return;
    event.preventDefault();
    event.stopPropagation();
    const box = boxRef.current;
    if (!box) return;
    box.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offsetX,
      originY: offsetY,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const box = boxRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !box) return;
    const width = box.getBoundingClientRect().width || 1;
    const height = box.getBoundingClientRect().height || 1;
    const scale = Math.max(zoom, 1);
    const nextX =
      drag.originX - ((event.clientX - drag.startX) / width) * (100 / scale);
    const nextY =
      drag.originY - ((event.clientY - drag.startY) / height) * (100 / scale);
    emit(nextX, nextY, zoom);
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      boxRef.current?.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  };

  const style = vitrinaCoverImageStyle(offsetX, offsetY, zoom);

  return (
    <div
      ref={boxRef}
      className={cn(
        'relative overflow-hidden bg-slate-100',
        interactive && !disabled && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        decoding="async"
        className={cn(
          'pointer-events-none h-full w-full select-none object-cover',
          maskClassName,
        )}
        style={style}
      />
    </div>
  );
}
