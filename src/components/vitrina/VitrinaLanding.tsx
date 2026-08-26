'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  VITRINA_HERO,
  type VitrinaVideo,
} from '@/components/vitrina/vitrina-content';
import { VitrinaImpactPattern } from '@/components/vitrina/VitrinaImpactSketch';
import { VitrinaProjectFicha } from '@/components/vitrina/VitrinaProjectFicha';
import { VitrinaProjectsEditor } from '@/components/vitrina/VitrinaProjectsEditor';
import { VitrinaProjectsGrid } from '@/components/vitrina/VitrinaProjectsGrid';
import { VitrinaProjectsSidebar } from '@/components/vitrina/VitrinaProjectsSidebar';
import { VitrinaAiChat } from '@/components/vitrina/VitrinaAiChat';
import { VitrinaAvancesPlaceholder } from '@/components/vitrina/VitrinaAvancesPlaceholder';
import { VitrinaDataDashboard } from '@/components/vitrina/VitrinaDataDashboard';
import { VitrinaGuestGate } from '@/components/vitrina/VitrinaGuestGate';
import { VitrinaIndicadoresDashboard } from '@/components/vitrina/VitrinaIndicadoresDashboard';
import { VitrinaProjectsTable } from '@/components/vitrina/VitrinaProjectsTable';
import {
  VitrinaViewToggle,
  type VitrinaProjectsView,
} from '@/components/vitrina/VitrinaViewToggle';
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
import {
  removeVitrinaProyectoFromList,
  upsertVitrinaProyectoInList,
  type VitrinaProyecto,
} from '@/lib/vitrina-proyectos';
import type { VitrinaProjectCatalogs } from '@/lib/actions/vitrina-proyectos';
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
import {
  clampPortalView,
  portalCanSeeView,
  portalViewsForLevel,
  type PortalAccessKind,
  type PortalGuestLevel,
} from '@/lib/portal-guest-access';

const PATTERN_EDGES = 'left-[calc(50%-50cqw)] right-[calc(50%+6rem)]';

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

const LOGIN_HERO_HREF = `/auth/login?callbackUrl=${encodeURIComponent('/')}`;

export function VitrinaLanding({
  videos,
  proyectos,
  filterCatalogs,
  catalogs,
  canEdit,
  aiConfigured,
  sessionEmail = null,
  accessKind = 'none',
  accessLevel = 0,
  initialScene = 'hero',
}: {
  videos: VitrinaVideo[];
  proyectos: VitrinaProyecto[];
  filterCatalogs: VitrinaProjectFilters;
  catalogs: VitrinaProjectCatalogs;
  canEdit: boolean;
  aiConfigured: boolean;
  sessionEmail?: string | null;
  accessKind?: PortalAccessKind;
  accessLevel?: 0 | PortalGuestLevel;
  initialScene?: VitrinaScene;
}) {
  const router = useRouter();
  const startProjects = initialScene === 'projects';
  const hasAccess = accessLevel >= 1;
  const visibleTabs = portalViewsForLevel(accessLevel);
  const [proyectosLocal, setProyectosLocal] = useState(proyectos);
  const [heroOff, setHeroOff] = useState(startProjects);
  const [headerCompact, setHeaderCompact] = useState(startProjects);
  const [cardsShown, setCardsShown] = useState(startProjects);
  const [busy, setBusy] = useState(false);
  const [hasVisitedProjects, setHasVisitedProjects] = useState(startProjects);
  const [ficha, setFicha] = useState<null | 'new' | string>(null);
  const [filters, setFilters] =
    useState<VitrinaProjectFilters>(EMPTY_VITRINA_FILTERS);
  const [aiMatchIds, setAiMatchIds] = useState<string[] | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [projectsView, setProjectsView] = useState<VitrinaProjectsView>(() =>
    clampPortalView(accessLevel, 'proyectos'),
  );
  const [perfDirection, setPerfDirection] = useState<VitrinaPerfDirection | null>(
    null,
  );
  const timersRef = useRef<number[]>([]);
  const pendingMutationsRef = useRef(0);

  useEffect(() => {
    if (pendingMutationsRef.current === 0) {
      setProyectosLocal(proyectos);
    }
  }, [proyectos]);

  const upsertProyectoLocal = useCallback((proyecto: VitrinaProyecto) => {
    setProyectosLocal((prev) => {
      const result = upsertVitrinaProyectoInList(prev, proyecto);
      return result.ok ? result.proyectos : prev;
    });
  }, []);

  const removeProyectoLocal = useCallback((id: string) => {
    setProyectosLocal((prev) => {
      const result = removeVitrinaProyectoFromList(prev, id);
      return result.ok ? result.proyectos : prev;
    });
  }, []);

  const beginOptimisticMutation = useCallback(() => {
    pendingMutationsRef.current += 1;
  }, []);

  const endOptimisticMutation = useCallback(() => {
    pendingMutationsRef.current = Math.max(0, pendingMutationsRef.current - 1);
    if (pendingMutationsRef.current === 0) {
      router.refresh();
    }
  }, [router]);

  const scene: VitrinaScene = heroOff ? 'projects' : 'hero';
  const typewriterPaused = vitrinaTypewriterPaused(scene, busy);
  const carouselLive = vitrinaCarouselLive(scene, busy);
  const filterOptions = useMemo(
    () => uniqueVitrinaFilterOptions(filterCatalogs, proyectosLocal),
    [filterCatalogs, proyectosLocal],
  );
  const proyectosFiltrados = useMemo(
    () =>
      applyVitrinaAiMatchIds(
        filterVitrinaProyectos(proyectosLocal, filters, searchQuery),
        aiMatchIds,
      ),
    [proyectosLocal, filters, aiMatchIds, searchQuery],
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
    setProjectsView((current) => clampPortalView(accessLevel, current));
  }, [accessLevel]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    };
  }, []);

  const ctaClassName =
    current?.ctaClassName ?? VITRINA_HERO.headlineRotating[0].ctaClassName;
  const ctaOutlineClassName =
    current?.ctaOutlineClassName ??
    VITRINA_HERO.headlineRotating[0].ctaOutlineClassName;
  const appCtaHref = sessionEmail ? '/inicio' : LOGIN_HERO_HREF;

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
    router.replace('/?vista=proyectos', { scroll: false });
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
    router.replace('/', { scroll: false });
    if (prefersReducedMotion()) {
      setCardsShown(false);
      setHeaderCompact(false);
      setHeroOff(false);
      setProjectsView('proyectos');
      return;
    }
    clearTimers();
    setPerfDirection('vuelta');
    setBusy(true);
    setCardsShown(false);
    setHeaderCompact(false);
    setHeroOff(false);
    setProjectsView('proyectos');
    queue(() => setBusy(false), VITRINA_ANIM_MS);
  };

  const brandInteractive = headerCompact && !busy;
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
          {sessionEmail ? (
            <div className="flex max-w-[min(100%,28rem)] items-center gap-3 sm:max-w-none">
              <span className="min-w-0 truncate text-sm font-medium text-white/90">
                Sesión Iniciada: {sessionEmail}
              </span>
              <Link
                href="/inicio"
                tabIndex={headerCompact ? -1 : undefined}
                className="shrink-0 rounded-full border border-white/80 px-5 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/10"
              >
                Ir a la app
              </Link>
            </div>
          ) : (
            <Link
              href={LOGIN_HERO_HREF}
              tabIndex={headerCompact ? -1 : undefined}
              className="rounded-full border border-white/80 px-5 py-2 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/10"
            >
              Iniciar sesión
            </Link>
          )}
        </div>

        {headerCompact && hasAccess ? (
          <div className="pointer-events-auto absolute left-1/2 z-10 -translate-x-1/2">
            <VitrinaViewToggle
              value={projectsView}
              onChange={setProjectsView}
              tabs={visibleTabs}
            />
          </div>
        ) : null}

        {headerCompact ? (
          <div className="flex h-9 min-w-0 shrink-0 items-center justify-end gap-2">
            {hasAccess ? (
              <span className="min-w-0 max-w-[12rem] truncate text-sm font-medium text-white/90 sm:max-w-[16rem]">
                {sessionEmail
                  ? `Sesión Iniciada: ${sessionEmail}`
                  : accessKind === 'guest'
                    ? 'Sesión de Invitado'
                    : null}
              </span>
            ) : null}
            {accessKind === 'session' ? (
              <Link
                href="/inicio"
                className="inline-flex h-7 shrink-0 items-center rounded-full border border-white/80 px-3 text-xs font-semibold whitespace-nowrap text-white transition-colors hover:bg-white/10"
              >
                Ir a la app
              </Link>
            ) : null}
            {canEdit ? (
              <VitrinaProjectsEditor
                count={proyectosLocal.length}
                onAdd={() => setFicha('new')}
              />
            ) : null}
          </div>
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
                  <div className="mt-8 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={goToProjects}
                      className={`inline-flex items-center justify-center rounded-full border border-transparent px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-500 ${ctaClassName}`}
                    >
                      {VITRINA_HERO.primaryCta}
                    </button>
                    <Link
                      href={appCtaHref}
                      className={`inline-flex items-center justify-center rounded-full border bg-transparent px-6 py-3 text-sm font-semibold shadow-sm transition-colors duration-500 ${ctaOutlineClassName}`}
                    >
                      {VITRINA_HERO.appCta}
                    </Link>
                  </div>
                </div>
              </section>

              <aside className="h-[min(76cqh,46rem)] translate-x-8 translate-y-10 overflow-visible">
                <VitrinaVideoCarousel videos={videos} live={carouselLive} />
              </aside>
            </div>
          </main>
        </div>

        {headerCompact && !hasAccess ? (
          <div className="absolute inset-0 z-10 flex w-full min-h-0 bg-white">
            <VitrinaGuestGate onBack={goToHero} />
          </div>
        ) : null}

        {vitrinaGridMounted(hasVisitedProjects) && hasAccess ? (
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
                query={searchQuery}
                matchIds={aiMatchIds}
                aiFilterActive={aiApplied}
                onBack={goToHero}
                onToggle={(facet, value) => {
                  setFilters((current) => ({
                    ...current,
                    [facet]: toggleVitrinaFilterValue(current[facet], value),
                  }));
                }}
                onQueryChange={setSearchQuery}
                onClear={() => {
                  setFilters(EMPTY_VITRINA_FILTERS);
                  setSearchQuery('');
                  setAiMatchIds(null);
                  setAiApplied(false);
                }}
              />
              <div className="relative min-h-0 min-w-0 flex-1">
                <div
                  className={cn(
                    'h-full min-h-0 overflow-y-auto overscroll-contain pb-[38rem]',
                    projectsView !== 'proyectos' && 'hidden',
                  )}
                >
                  <VitrinaProjectsGrid
                    proyectos={proyectosFiltrados}
                    canEdit={canEdit}
                    emptyHint={
                      proyectosLocal.length > 0
                        ? 'No hay proyectos que coincidan con los filtros.'
                        : undefined
                    }
                    onOpen={(id) => setFicha(id)}
                  />
                </div>
                {portalCanSeeView(accessLevel, 'analisis') ? (
                <div
                  className={cn(
                    'h-full min-h-0 overflow-hidden',
                    projectsView !== 'analisis' && 'hidden',
                  )}
                >
                  <VitrinaDataDashboard proyectos={proyectosFiltrados} />
                </div>
                ) : null}
                {portalCanSeeView(accessLevel, 'indicadores') ? (
                <div
                  className={cn(
                    'h-full min-h-0 overflow-hidden',
                    projectsView !== 'indicadores' && 'hidden',
                  )}
                >
                  <VitrinaIndicadoresDashboard proyectos={proyectosFiltrados} />
                </div>
                ) : null}
                {portalCanSeeView(accessLevel, 'avances') ? (
                <div
                  className={cn(
                    'h-full min-h-0 overflow-hidden',
                    projectsView !== 'avances' && 'hidden',
                  )}
                >
                  <VitrinaAvancesPlaceholder />
                </div>
                ) : null}
                {portalCanSeeView(accessLevel, 'data') ? (
                <div
                  className={cn(
                    'h-full min-h-0 overflow-hidden',
                    projectsView !== 'data' && 'hidden',
                  )}
                >
                  <VitrinaProjectsTable
                    proyectos={proyectosFiltrados}
                    catalogs={catalogs}
                    canEdit={canEdit}
                    emptyHint={
                      proyectosLocal.length > 0
                        ? 'No hay proyectos que coincidan con los filtros.'
                        : undefined
                    }
                    onProyectoUpsert={upsertProyectoLocal}
                    onOptimisticMutationStart={beginOptimisticMutation}
                    onOptimisticMutationEnd={endOptimisticMutation}
                  />
                </div>
                ) : null}
                <VitrinaAiChat
                  configured={aiConfigured}
                  filters={filters}
                  matchIds={aiMatchIds}
                  onResult={(nextFilters, nextMatchIds) => {
                    setFilters(nextFilters);
                    setAiMatchIds(nextMatchIds);
                    setAiApplied(
                      vitrinaDiscoveryIsActive(nextFilters, nextMatchIds),
                    );
                  }}
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
            ? (proyectosLocal.find((p) => p.id === ficha) ?? null)
            : null
        }
        canEdit={canEdit}
        onCreated={(id) => setFicha(id)}
        onProyectoUpsert={upsertProyectoLocal}
        onProyectoRemove={removeProyectoLocal}
        onOptimisticMutationStart={beginOptimisticMutation}
        onOptimisticMutationEnd={endOptimisticMutation}
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
