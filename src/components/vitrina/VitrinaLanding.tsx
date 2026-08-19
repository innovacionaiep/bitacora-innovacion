'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  VITRINA_HERO,
  VITRINA_NAV_LINKS,
  type VitrinaVideo,
} from '@/components/vitrina/vitrina-content';
import { VitrinaImpactPattern } from '@/components/vitrina/VitrinaImpactSketch';
import { VitrinaRotatingWord } from '@/components/vitrina/VitrinaRotatingWord';
import { VitrinaVideoCarousel } from '@/components/vitrina/VitrinaVideoCarousel';
import { VitrinaVideoEditor } from '@/components/vitrina/VitrinaVideoEditor';
import { prefetchVitrinaImpactIcons } from '@/hooks/useVitrinaIconSvg';
import { useVitrinaTypewriter } from '@/hooks/useVitrinaTypewriter';

const PATTERN_EDGES = 'left-[calc(50%-50vw)] right-[calc(50%+6rem)]';

export function VitrinaLanding({ videos }: { videos: VitrinaVideo[] }) {
  const { index, displayed, progress, current } = useVitrinaTypewriter(
    VITRINA_HERO.headlineRotating,
  );
  const impactWord = current?.word ?? 'social';

  useEffect(() => {
    prefetchVitrinaImpactIcons();
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
      setHeroBand({
        top: heroBox.top - mainBox.top,
        height: heroBox.height,
      });
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
  }, [displayed]);

  return (
    <div className="relative min-h-full bg-white text-slate-900">
      <header className="relative z-10 flex w-full items-center justify-between gap-6 bg-[linear-gradient(to_right,#000_0%,#000_22%,#fff_72%)] px-8 py-3 sm:px-10">
        <div className="flex items-center gap-5 sm:gap-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png?v=3"
            alt="AIEP de la Universidad Andrés Bello"
            className="h-10 w-auto object-contain sm:h-12"
          />
          <span className="h-6 w-[3px] shrink-0 bg-white/80 sm:h-7" aria-hidden />
          <p className="text-[1.7rem] font-bold tracking-tight text-white sm:text-[2.05rem]">
            Bitácora
          </p>
        </div>

        <div className="flex items-center gap-6">
          <nav className="hidden items-center gap-6 md:flex" aria-label="Navegación de vitrina">
            {VITRINA_NAV_LINKS.map((label) => (
              <button
                key={label}
                type="button"
                className="text-sm font-medium text-slate-600"
              >
                {label}
              </button>
            ))}
          </nav>
          <Link
            href="/auth/login"
            className="rounded-full border border-blue-600 px-5 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <main
        ref={mainRef}
        className="relative z-10 mx-auto w-full max-w-[1600px] px-8 pb-16 pt-6 lg:px-12 lg:pb-24 lg:pt-10"
      >
        <VitrinaImpactPattern
          word={impactWord}
          progress={progress}
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
          <section className="flex min-h-[min(76vh,46rem)] items-center">
            <div
              ref={heroRef}
              className="relative z-10 flex w-fit max-w-3xl flex-col px-7 py-7 -translate-x-20 -translate-y-16"
            >
            <h1 className="font-bold leading-tight">
              <HeroKicker text={VITRINA_HERO.kicker} match={VITRINA_HERO.headlineLead} />
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
                className={`rounded-full px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors duration-500 ${ctaClassName}`}
              >
                {VITRINA_HERO.primaryCta}
              </button>
            </div>
          </div>
          </section>

          <aside className="h-[min(76vh,46rem)] translate-x-8 translate-y-10 overflow-visible">
            <VitrinaVideoCarousel videos={videos} />
          </aside>
        </div>
      </main>

      <VitrinaVideoEditor videos={videos} />
    </div>
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
