'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import { parseVideoUrl } from '@/lib/video-url';
import {
  buildVitrinaColumnLists,
  vitrinaMarqueeRepeats,
} from '@/lib/vitrina-marquee';
import { cn } from '@/lib/utils';
import {
  layoutScaleFromSizes,
  unscaleRelativeRect,
} from '@/lib/vitrina-transition';
import { useScalePortalContainer } from '@/contexts/ScalePortalContext';
import type { VitrinaVideo } from '@/components/vitrina/vitrina-content';
import '@/components/vitrina/vitrina-marquee.css';

type CarouselItem = VitrinaVideo & {
  embedUrl: string;
  playbackUrl: string;
  thumbnailUrl: string | null;
  provider: 'youtube' | 'vimeo' | string;
};

const COL_COUNT = 3;
const MARQUEE_DURATION_S = 22;
const HOVER_SCALE = 1.5;

type HoverClone = {
  key: string;
  item: CarouselItem;
  left: number;
  top: number;
  width: number;
  height: number;
};

function withAutoplay(embedUrl: string, provider: string): string {
  const url = new URL(embedUrl);
  url.searchParams.set('autoplay', '1');
  url.searchParams.set('playsinline', '1');
  if (provider === 'youtube') {
    url.hostname = 'www.youtube-nocookie.com';
    url.searchParams.set('rel', '0');
    url.searchParams.set('modestbranding', '1');
  }
  return url.href;
}

function youtubeThumbnail(embedUrl: string): string | null {
  const match = embedUrl.match(/embed\/([a-zA-Z0-9_-]{11})/);
  return match?.[1]
    ? `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`
    : null;
}

function toCarouselItem(video: VitrinaVideo): CarouselItem | null {
  const parsed = parseVideoUrl(video.url);
  if (!parsed || parsed.externalOnly) return null;
  if (parsed.provider !== 'youtube' && parsed.provider !== 'vimeo') return null;

  return {
    ...video,
    provider: parsed.provider,
    embedUrl: parsed.embedUrl,
    playbackUrl: withAutoplay(parsed.embedUrl, parsed.provider),
    thumbnailUrl:
      parsed.provider === 'youtube' ? youtubeThumbnail(parsed.embedUrl) : null,
  };
}

function Poster({ src }: { src: string | null }) {
  if (!src) {
    return <div className="absolute inset-0 bg-slate-900" />;
  }
  return (
    <img
      src={src}
      alt=""
      decoding="async"
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

export function VitrinaVideoCarousel({
  videos,
  live = true,
}: {
  videos: VitrinaVideo[];
  live?: boolean;
}) {
  const items = useMemo(
    () => videos.map(toCarouselItem).filter((v): v is CarouselItem => v != null),
    [videos],
  );

  const columns = useMemo(() => buildVitrinaColumnLists(items), [items]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const portalContainer = useScalePortalContainer();
  const [vimeoThumbs, setVimeoThumbs] = useState<Record<string, string>>({});
  const [hover, setHover] = useState<HoverClone | null>(null);
  const [lightbox, setLightbox] = useState<CarouselItem | null>(null);
  const [repeats, setRepeats] = useState(1);
  const [mounted, setMounted] = useState(false);
  const vimeoThumbsRef = useRef(vimeoThumbs);
  vimeoThumbsRef.current = vimeoThumbs;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const missing = items.filter(
      (item) => item.provider === 'vimeo' && !vimeoThumbsRef.current[item.url],
    );
    if (missing.length === 0) return;

    let cancelled = false;
    void Promise.all(
      missing.map(async (item) => {
        try {
          const res = await fetch(
            `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(item.url)}`,
          );
          if (!res.ok) return;
          const data = (await res.json()) as { thumbnail_url?: string };
          if (!cancelled && data.thumbnail_url) {
            setVimeoThumbs((prev) => ({ ...prev, [item.url]: data.thumbnail_url! }));
          }
        } catch {
          /* miniatura opcional */
        }
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [items]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const measure = () => {
      const h = wrap.clientHeight;
      const colW = wrap.clientWidth / COL_COUNT;
      if (h < 80 || colW < 40) return;
      const minItems = Math.max(1, ...columns.map((c) => c.length));
      const next = vitrinaMarqueeRepeats(h, colW, minItems);
      setRepeats((prev) => (prev === next ? prev : next));
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [columns]);

  const openHover = (key: string, item: CarouselItem, el: HTMLElement) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const wr = wrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const scale = layoutScaleFromSizes(wr.width, wrap.offsetWidth);
    const layout = unscaleRelativeRect(wr, r, scale);
    setHover({
      key,
      item,
      left: layout.left,
      top: layout.top,
      width: layout.width,
      height: layout.height,
    });
  };

  const closeHover = () => {
    if (lightbox) return;
    setHover(null);
  };

  const openLightbox = (item: CarouselItem) => {
    setHover(null);
    setLightbox(item);
  };

  const closeLightbox = () => {
    setLightbox(null);
    setHover(null);
  };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  useEffect(() => {
    if (!live) setHover(null);
  }, [live]);

  if (items.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-400">
        Añade enlaces de YouTube o Vimeo con «Editar videos»
      </div>
    );
  }

  const paused = !live || hover != null || lightbox != null;
  const hoverThumb = hover
    ? hover.item.thumbnailUrl ?? vimeoThumbs[hover.item.url] ?? null
    : null;
  const cloneW = hover ? hover.width * HOVER_SCALE : 0;
  const cloneH = hover ? hover.height * HOVER_SCALE : 0;
  const cloneLeft = hover ? hover.left - (cloneW - hover.width) / 2 : 0;
  const cloneTop = hover ? hover.top - (cloneH - hover.height) / 2 : 0;

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative h-[min(76cqh,46rem)] w-full overflow-visible',
        paused && 'vitrina-marquee-paused',
        !live && 'vitrina-carousel-idle',
      )}
      onMouseLeave={closeHover}
    >
      <div className="grid h-full grid-cols-3 gap-1.5 overflow-hidden">
        {columns.map((colItems, col) => {
          if (colItems.length === 0) return <div key={col} />;
          const goingDown = col !== 1;
          const durationS =
            (MARQUEE_DURATION_S * Math.max(1, colItems.length / 6) * repeats) / 2;

          return (
            <div
              key={col}
              className={`relative h-full overflow-hidden ${
                col === 2 ? 'pt-[5.5rem]' : ''
              }`}
            >
              <div
                className={goingDown ? 'vitrina-marquee-down' : 'vitrina-marquee-up'}
                style={{ animationDuration: `${durationS}s` }}
              >
                {[0, 1].map((copy) => (
                  <div key={copy} className="flex flex-col gap-7 pb-7">
                    {Array.from({ length: repeats }, (_, rep) =>
                      colItems.map((item, i) => {
                        const key = `${col}-${copy}-${rep}-${i}-${item.url}`;
                        const thumb = item.thumbnailUrl ?? vimeoThumbs[item.url] ?? null;

                        return (
                          <article
                            key={key}
                            className="relative mx-auto aspect-video w-[82%] overflow-hidden rounded-xl bg-slate-900 shadow-md"
                            onMouseEnter={(e) =>
                              openHover(key, item, e.currentTarget)
                            }
                            onClick={() => openLightbox(item)}
                          >
                            <Poster src={thumb} />
                          </article>
                        );
                      }),
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-white to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-white to-transparent"
        aria-hidden
      />

      {hover ? (
        <article
          className="absolute z-30 overflow-hidden rounded-xl bg-slate-900 shadow-2xl shadow-blue-900/30"
          style={{
            left: cloneLeft,
            top: cloneTop,
            width: cloneW,
            height: cloneH,
          }}
          onMouseEnter={() => setHover(hover)}
        >
          <>
            <Poster src={hoverThumb} />
            <button
              type="button"
              onClick={() => openLightbox(hover.item)}
              className="absolute inset-0 flex items-center justify-center bg-black/25"
              aria-label={`Ver ${hover.item.title} en grande`}
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg transition-transform hover:scale-105">
                <Play className="ml-0.5 h-6 w-6 fill-white text-white" aria-hidden />
              </span>
            </button>
          </>
        </article>
      ) : null}

      {lightbox && mounted
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 sm:p-8"
              role="dialog"
              aria-modal="true"
              aria-label={lightbox.title}
              onClick={closeLightbox}
            >
              <button
                type="button"
                onClick={closeLightbox}
                className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-slate-800 shadow-md hover:bg-white"
                aria-label="Cerrar video"
              >
                <X className="h-5 w-5" />
              </button>
              <div
                className="relative w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl aspect-video"
                onClick={(e) => e.stopPropagation()}
              >
                <iframe
                  className="absolute inset-0 h-full w-full border-0"
                  src={lightbox.playbackUrl}
                  title={lightbox.title}
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            </div>,
            portalContainer ?? document.body,
          )
        : null}
    </div>
  );
}
