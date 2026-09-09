/** Contenido de marketing de la landing oculta. No proviene de la BD ni de proyectos reales. */

export const VITRINA_HERO = {
  kicker: 'Dirección Nacional de Emprendimiento, Innovación y Desarrollo',
  headlineLead: 'Proyectos de impacto',
  headlineRotating: [
    {
      word: 'social',
      className: 'text-red-600',
      ctaClassName: 'bg-red-600 hover:bg-red-700',
      ctaOutlineClassName:
        'border-red-600 text-red-600 hover:border-red-700 hover:text-red-700',
    },
    {
      word: 'ambiental',
      className: 'text-emerald-600',
      ctaClassName: 'bg-emerald-600 hover:bg-emerald-700',
      ctaOutlineClassName:
        'border-emerald-600 text-emerald-600 hover:border-emerald-700 hover:text-emerald-700',
    },
    {
      word: 'productivo',
      className: 'text-blue-600',
      ctaClassName: 'bg-blue-600 hover:bg-blue-700',
      ctaOutlineClassName:
        'border-blue-600 text-blue-600 hover:border-blue-700 hover:text-blue-700',
    },
    {
      word: 'educativo',
      className: 'text-orange-500',
      ctaClassName: 'bg-orange-500 hover:bg-orange-600',
      ctaOutlineClassName:
        'border-orange-500 text-orange-500 hover:border-orange-600 hover:text-orange-600',
    },
    {
      word: 'innovador',
      className: 'text-violet-600',
      ctaClassName: 'bg-violet-600 hover:bg-violet-700',
      ctaOutlineClassName:
        'border-violet-600 text-violet-600 hover:border-violet-700 hover:text-violet-700',
    },
    {
      word: 'tecnológico',
      className: 'text-cyan-500',
      ctaClassName: 'bg-cyan-500 hover:bg-cyan-600',
      ctaOutlineClassName:
        'border-cyan-500 text-cyan-500 hover:border-cyan-600 hover:text-cyan-600',
    },
  ] as const,
  primaryCta: 'Ver proyectos en curso',
  appCta: 'Ingresar a la app',
} as const;

/**
 * Carrusel de la landing. Las URLs se editan en la propia página
 * (botón inferior izquierdo) y se guardan en SystemSetting.
 * Estos valores son el fallback si aún no hay URLs persistidas.
 */
export type VitrinaVideo = {
  title: string;
  url: string;
  tag?: string;
};

export const VITRINA_VIDEOS: VitrinaVideo[] = [
  {
    title: 'Video 1 — reemplaza este enlace',
    tag: 'YouTube',
    url: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
  },
  {
    title: 'Video 2 — reemplaza este enlace',
    tag: 'YouTube',
    url: 'https://www.youtube.com/watch?v=eRsGyueVLvQ',
  },
  {
    title: 'Video 3 — reemplaza este enlace',
    tag: 'Vimeo',
    url: 'https://vimeo.com/76979871',
  },
  {
    title: 'Video 4 — reemplaza este enlace',
    tag: 'YouTube',
    url: 'https://www.youtube.com/watch?v=R6MlUcmOul8',
  },
  {
    title: 'Video 5 — reemplaza este enlace',
    tag: 'YouTube',
    url: 'https://www.youtube.com/watch?v=WhWc3b3KhnY',
  },
  {
    title: 'Video 6 — reemplaza este enlace',
    tag: 'YouTube',
    url: 'https://www.youtube.com/watch?v=SkVqJ1SGeL0',
  },
];
