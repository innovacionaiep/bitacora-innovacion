'use client';

import { ExternalLink } from 'lucide-react';
import type { ParsedVideoUrl } from '@/lib/video-url';
import { cn } from '@/lib/utils';

type Props = {
  video: ParsedVideoUrl | null;
  coverUrl?: string | null;
  emptyLabel?: string;
  className?: string;
};

export function VitrinaFichaVideo({
  video,
  coverUrl,
  emptyLabel = 'Añadir video',
  className,
}: Props) {
  const embeddable = Boolean(video && !video.externalOnly);
  const openUrl = video?.pageUrl || video?.embedUrl;
  const showCover = Boolean(coverUrl) && !embeddable;

  return (
    <div
      className={cn(
        'flex min-h-0 w-full items-center justify-center',
        className,
      )}
    >
      <div
        className={cn(
          'relative isolate overflow-hidden rounded-3xl bg-black shadow-lg ring-1 ring-black/15',
          'aspect-[9/16] w-[min(22rem,100%)] max-h-full',
        )}
      >
        {showCover ? (
          <>
            <img
              src={coverUrl ?? ''}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-md"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-black/25"
              aria-hidden
            />
          </>
        ) : null}
        {embeddable && video ? (
          <>
            <iframe
              src={video.embedUrl}
              title={video.title || 'Vídeo del proyecto'}
              className="absolute inset-0 h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
            {video.provider === 'sharepoint' && openUrl ? (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Abrir en SharePoint"
                className="absolute bottom-3 right-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white/85 ring-1 ring-white/15 hover:bg-black/75 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </>
        ) : video?.externalOnly && openUrl ? (
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 px-5 text-center text-sm text-white/90 hover:bg-black/10 hover:text-white"
          >
            <ExternalLink className="h-5 w-5" />
            Abrir video
          </a>
        ) : (
          <div className="absolute inset-0 z-10 flex items-center justify-center px-5 text-center text-sm text-white/70">
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}
