'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  VITRINA_HERO,
  type VitrinaVideo,
} from '@/components/vitrina/vitrina-content';
import { VitrinaImpactPattern } from '@/components/vitrina/VitrinaImpactSketch';
import { VitrinaProjectFicha } from '@/components/vitrina/VitrinaProjectFicha';
import { VitrinaProjectsEditor } from '@/components/vitrina/VitrinaProjectsEditor';
import { VitrinaProjectsGrid } from '@/components/vitrina/VitrinaProjectsGrid';
import { VitrinaProjectsSidebar } from '@/components/vitrina/VitrinaProjectsSidebar';
import { VitrinaRotatingWord } from '@/components/vitrina/VitrinaRotatingWord';
import { VitrinaVideoCarousel } from '@/components/vitrina/VitrinaVideoCarousel';
import { VitrinaVideoEditor } from '@/components/vitrina/VitrinaVideoEditor';
import { prefetchVitrinaImpactIcons } from '@/hooks/useVitrinaIconSvg';
import {
  useVitrinaTransitionPerf,
  VitrinaPerfOverlay,
} from '@/hooks/useVitrinaTransitionPerf';
import { useVitrinaTypewriter } from '@/hooks/useVitrinaTypewriter';
import { cn } from '@/lib/utils';
import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';
import {
  EMPTY_VITRINA_FILTERS,
  applyVitrinaAiMatchIds,
  filterVitrinaProyectos,
  toggleVitrinaFilterValue,
  uniqueVitrinaFilterOptions,
  vitrinaDiscoveryIsActive,
  type VitrinaProjectFilters,
} from '@/lib/vitrina-project-filters';
import {
  VITRINA_ANIM_MS,
  VITRINA_PANEL_MOTION,
  canGoToHero,
  canGoToProjects,
  heroBandFromRects,
  layoutScaleFromSizes,
  vitrinaCarouselLive,
  vitrinaGridMounted,
  vitrinaTypewriterPaused,
  type VitrinaScene,
} from '@/lib/vitrina-transition';
import type { VitrinaPerfDirection } from '@/lib/vitrina-transition-perf';

const PATTERN_EDGES = 'left-[calc(50%-50cqw)] right-[calc(50%+6rem)]';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function VitrinaLanding({
  videos,
  proyectos,
  filterCatalogs,
  canEdit,
  aiConfigured,
}: {
  videos: VitrinaVideo[];
  proyectos: VitrinaProyecto[];
  filterCatalogs: VitrinaProjectFilters;
  canEdit: boolean;
  aiConfigured: boolean;
}) {
  const [heroOff, setHeroOff] = useState(false);
  const [headerCompact, setHeaderCompact] = useState(false);
  const [cardsShown, setCardsShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hasVisitedProjects, setHasVisitedProjects] = useState(false);
  const [ficha, setFicha] = useState<null | 'new' | string>(null);
  const [filters, setFilters] =
    useState<VitrinaProjectFilters>(EMPTY_VITRINA_FILTERS);
  const [aiMatchIds, setAiMatchIds] = useState<string[] | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [perfDirection, setPerfDirection] = useState<VitrinaPerfDirection | null>(
    null,
  );
  const timersRef = useRef<number[]>([]);

  const scene: VitrinaScene = heroOff ? 'projects' : 'hero';
  const typewriterPaused = vitrinaTypewriterPaused(scene, busy);
  const carouselLive = vitrinaCarouselLive(scene, busy);
  const filterOptions = useMemo(
    () => uniqueVitrinaFilterOptions(filterCatalogs, proyectos),
    [filterCatalogs, proyectos],
  );
  const proyectosFiltrados = useMemo(
    () =>
      applyVitrinaAiMatchIds(
        filterVitrinaProyectos(proyectos, filters),
        aiMatchIds,
      ),
    [proyectos, filters, aiMatchIds],
  );

  const { index, displayed, progress, current } = useVitrinaTypewriter(
    VITRINA_HERO.headlineRotating,
    2000,
    typewriterPaused,
  );
  const impactWord = current?.word ?? 'social';
  const perf = useVitrinaTransitionPerf(busy, perfDirection);

  useEffect(() => {
    prefetchVitrinaImpactIcons();
  }, []);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const ctaClassName =
    current?.ctaClassName ?? VITRINA_HERO.headlineRotating[0].ctaClassName;

  const mainRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroBand, setHeroBand] = useState({ top: 0, height: 0 });

  useLayoutEffect(() => {
    const main = mainRef.current;
    const hero = heroRef.current;
    if (!main || !hero) return;

    const sync = () => {
      const mainBox = main.getBoundingClientRect();
      const heroBox = hero.getBoundingClientRect();
      const scale = layoutScaleFromSizes(mainBox.width, main.offsetWidth);
      setHeroBand(
        heroBandFromRects(mainBox.top, heroBox.top, heroBox.height, scale),
      );
    };

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(main);
    observer.observe(hero);
    window.addEventListener('resize', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, []);

  const queue = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
  };

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  const goToProjects = () => {
    if (!canGoToProjects(busy, scene)) return;
    setHasVisitedProjects(true);
    if (prefersReducedMotion()) {
      setHeroOff(true);
      setHeaderCompact(true);
      setCardsShown(true);
      return;
    }
    clearTimers();
    setPerfDirection('ida');
    setBusy(true);
    setHeroOff(true);
    setHeaderCompact(true);
    setCardsShown(true);
    queue(() => setBusy(false), VITRINA_ANIM_MS);
  };

  const goToHero = () => {
    if (!canGoToHero(busy, scene)) return;
    if (prefersReducedMotion()) {
      setCardsShown(false);
      setHeaderCompact(false);
      setHeroOff(false);
      return;
    }
    clearTimers();
    setPerfDirection('vuelta');
    setBusy(true);
    setCardsShown(false);
    setHeaderCompact(false);
    setHeroOff(false);
    queue(() => setBusy(false), VITRINA_ANIM_MS);
  };

  const brandInteractive = cardsShown && !busy;
  const reduced = prefersReducedMotion();
  const panelMotion = reduced ? 'duration-0' : VITRINA_PANEL_MOTION;
  const headerMotion = reduced
    ? 'duration-0'
    : 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]';

  return (
    <div
      className={cn(
        'relative overflow-x-hidden bg-white text-slate-900',
        cardsShown ? 'flex h-full min-h-0 flex-col' : 'min-h-full',
      )}
    >
      <header
        className={cn(
          'relative z-20 shrink-0 flex w-full items-center justify-between bg-[linear-gradient(to_right,#000_0%,#000_8%,#3f3f46_48%)] px-8 sm:px-10',
          'transition-[padding]',
          headerMotion,
          headerCompact ? 'py-[1.5px]' : 'py-3',
        )}
      >
        <div className="flex items-center gap-5 sm:gap-6">
          <button
            type="button"
            onClick={goToHero}
            disabled={!brandInteractive}
            className={cn(
              'inline-flex items-center p-0 leading-none',
              brandInteractive ? 'cursor-pointer' : 'cursor-default',
            )}
            aria-label={brandInteractive ? 'Volver a la portada' : undefined}
          >
            <VitrinaBrandLogo compact={headerCompact} />
          </button>
          <span
            className={cn(
              'w-[3px] shrink-0 bg-white/80',
              'transition-[height]',
              headerMotion,
              headerCompact ? 'h-4 sm:h-5' : 'h-6 sm:h-7',
            )}
            aria-hidden
          />
          <button
            type="button"
            onClick={goToHero}
            disabled={!brandInteractive}
            className={cn(
              'inline-flex items-center p-0 leading-none',
              brandInteractive ? 'cursor-pointer' : 'cursor-default',
            )}
          >
            <VitrinaBrandTitle compact={headerCompact} />
          </button>
        </div>

        <div
          className={cn(
            'flex items-center gap-6',
            'transition-opacity',
            headerMotion,
            headerCompact
              ? 'pointer-events-none absolute right-8 opacity-0'
              : 'opacity-100',
          )}
          aria-hidden={headerCompact}
        >
          <Link
            href="/auth/login"
            tabIndex={headerCompact ? -1 : undefined}
            className="rounded-full border border-white/80 px-5 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/10"
          >
            Iniciar sesión
          </Link>
        </div>

        {headerCompact && canEdit ? (
          <VitrinaProjectsEditor
            count={proyectos.length}
            onAdd={() => setFicha('new')}
          />
        ) : null}
      </header>

      <div
        className={cn('relative isolate', cardsShown && 'min-h-0 flex-1')}
      >
        <div
          className={cn(
            'w-full [contain:paint]',
            panelMotion,
            busy && 'will-change-transform',
            heroOff
              ? 'pointer-events-none -translate-x-[calc(100cqw+8rem)] opacity-0'
              : 'translate-x-0 opacity-100',
          )}
        >
          <main
            ref={mainRef}
            aria-hidden={heroOff}
            className="relative z-10 mx-auto w-full max-w-[1600px] px-8 pb-16 pt-6 lg:px-12 lg:pb-24 lg:pt-10"
          >
            <VitrinaImpactPattern
              word={impactWord}
              progress={progress}
              frozen={typewriterPaused}
              className={`top-0 bottom-0 ${PATTERN_EDGES}`}
            />
            {heroBand.height > 0 ? (
              <div
                aria-hidden
                className={`pointer-events-none absolute z-[1] bg-white ${PATTERN_EDGES}`}
                style={{
                  top: heroBand.top + 8,
                  height: heroBand.height + 24,
                }}
              />
            ) : null}
            <div className="relative z-10 grid w-full items-stretch gap-12 lg:grid-cols-2 lg:gap-16">
              <section className="flex min-h-[min(76cqh,46rem)] items-center">
                <div
                  ref={heroRef}
                  className="relative z-10 flex w-fit max-w-3xl flex-col px-7 py-7 -translate-x-20 -translate-y-12"
                >
                  <h1 className="font-bold leading-tight">
                    <HeroKicker
                      text={VITRINA_HERO.kicker}
                      match={VITRINA_HERO.headlineLead}
                    />
                    <span className="block text-5xl tracking-tight sm:text-6xl">
                      <VitrinaRotatingWord
                        items={VITRINA_HERO.headlineRotating}
                        displayed={displayed}
                        index={index}
                      />
                    </span>
                  </h1>
                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={goToProjects}
                      className={`rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-500 ${ctaClassName}`}
                    >
                      {VITRINA_HERO.primaryCta}
                    </button>
                  </div>
                </div>
              </section>

              <aside className="h-[min(76cqh,46rem)] translate-x-8 translate-y-10 overflow-visible">
                <VitrinaVideoCarousel videos={videos} live={carouselLive} />
              </aside>
            </div>
          </main>
        </div>

        {vitrinaGridMounted(hasVisitedProjects) ? (
          <div
            className={cn(
              'absolute inset-0 z-10 flex min-h-0 [contain:paint]',
              panelMotion,
              busy && 'will-change-transform',
              cardsShown
                ? 'translate-x-0 opacity-100'
                : 'pointer-events-none translate-x-12 opacity-0 [content-visibility:hidden]',
            )}
            aria-hidden={!cardsShown}
          >
            <div className="flex h-full min-h-0 w-full items-stretch">
              <VitrinaProjectsSidebar
                options={filterOptions}
                filters={filters}
                matchIds={aiMatchIds}
                aiConfigured={aiConfigured}
                aiFilterActive={aiApplied}
                onToggle={(facet, value) => {
                  setFilters((current) => ({
                    ...current,
                    [facet]: toggleVitrinaFilterValue(current[facet], value),
                  }));
                }}
                onClear={() => {
                  setFilters(EMPTY_VITRINA_FILTERS);
                  setAiMatchIds(null);
                  setAiApplied(false);
                }}
                onAiResult={(nextFilters, nextMatchIds) => {
                  setFilters(nextFilters);
                  setAiMatchIds(nextMatchIds);
                  setAiApplied(
                    vitrinaDiscoveryIsActive(nextFilters, nextMatchIds),
                  );
                }}
              />
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                <VitrinaProjectsGrid
                  proyectos={proyectosFiltrados}
                  canEdit={canEdit}
                  emptyHint={
                    proyectos.length > 0
                      ? 'No hay proyectos que coincidan con los filtros.'
                      : undefined
                  }
                  onOpen={(id) => setFicha(id)}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {!heroOff && !headerCompact && canEdit && !busy ? (
        <VitrinaVideoEditor videos={videos} />
      ) : null}

      <VitrinaProjectFicha
        open={ficha !== null}
        onOpenChange={(open) => {
          if (!open) setFicha(null);
        }}
        isNew={ficha === 'new'}
        proyecto={
          ficha && ficha !== 'new'
            ? (proyectos.find((p) => p.id === ficha) ?? null)
            : null
        }
        canEdit={canEdit}
        onCreated={(id) => setFicha(id)}
      />

      <VitrinaPerfOverlay
        enabled={perf.enabled}
        ida={perf.ida}
        vuelta={perf.vuelta}
      />
    </div>
  );
}

function VitrinaBrandLogo({ compact }: { compact: boolean }) {
  const fullRef = useRef<HTMLImageElement>(null);
  const cropRef = useRef<HTMLImageElement>(null);
  const [sm, setSm] = useState(false);
  const [ratios, setRatios] = useState({ full: 0, crop: 0 });

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setSm(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  const fullH = sm ? 48 : 40;
  const cropH = sm ? 24 : 20;

  const measure = () => {
    const full = fullRef.current;
    const crop = cropRef.current;
    setRatios({
      full:
        full && full.naturalHeight ? full.naturalWidth / full.naturalHeight : 0,
      crop:
        crop && crop.naturalHeight ? crop.naturalWidth / crop.naturalHeight : 0,
    });
  };

  useLayoutEffect(() => {
    measure();
  }, [fullH, cropH]);

  const width = compact ? ratios.crop * cropH : ratios.full * fullH;
  const height = compact ? cropH : fullH;
  const motion = prefersReducedMotion()
    ? 'duration-0'
    : 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]';

  return (
    <span
      className={cn(
        'relative inline-block overflow-hidden',
        'transition-[width,height,transform]',
        motion,
      )}
      style={{
        width: width > 0 ? width : undefined,
        height,
        transform: compact ? 'translateY(-2px)' : 'translateY(0)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={fullRef}
        src="/logo.png?v=3"
        alt="AIEP de la Universidad Andrés Bello"
        onLoad={measure}
        className={cn(
          'absolute left-0 top-1/2 w-auto max-w-none -translate-y-1/2 object-contain',
          'transition-opacity',
          motion,
          compact ? 'opacity-0' : 'opacity-100',
        )}
        style={{ height: fullH }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={cropRef}
        src="/logo_recortado.png"
        alt=""
        aria-hidden
        onLoad={measure}
        className={cn(
          'pointer-events-none absolute left-0 top-1/2 w-auto max-w-none -translate-y-1/2 object-contain',
          'transition-opacity',
          motion,
          compact ? 'opacity-100' : 'opacity-0',
        )}
        style={{ height: cropH }}
      />
    </span>
  );
}

function VitrinaBrandTitle({ compact }: { compact: boolean }) {
  const motion = prefersReducedMotion()
    ? 'duration-0'
    : 'duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]';

  return (
    <span
      className={cn(
        'inline-flex items-center overflow-visible',
        'transition-[height]',
        motion,
        compact ? 'h-5 sm:h-6' : 'h-10 sm:h-12',
      )}
    >
      <span
        className={cn(
          'inline-block origin-left text-[1.7rem] font-bold leading-none tracking-tight text-white sm:text-[2.05rem]',
          'transition-transform',
          motion,
          compact
            ? 'translate-y-px scale-[0.735] sm:scale-[0.707]'
            : 'scale-100',
        )}
      >
        Bitácora
      </span>
    </span>
  );
}

function HeroKicker({ text, match }: { text: string; match: string }) {
  return (
    <span className="inline-grid">
      <span className="col-start-1 row-start-1 mb-2 whitespace-nowrap pl-1 text-base font-bold leading-none tracking-widest text-slate-500">
        {text}
      </span>
      <span className="col-start-1 row-start-2 whitespace-nowrap text-5xl tracking-tight text-slate-900 sm:text-6xl">
        {match}
      </span>
    </span>
  );
}
