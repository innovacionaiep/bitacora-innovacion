/** Contenido de marketing de la landing oculta. No proviene de la BD ni de proyectos reales. */

export const VITRINA_NAV_LINKS = [
  'Ver proyectos',
  'Cómo funciona',
  'Novedades',
] as const;

export const VITRINA_HERO = {
  kicker: 'Dirección Nacional de Emprendimiento e I+D',
  headlineLead: 'Proyectos de impacto',
  headlineRotating: [
    { word: 'social', className: 'text-red-600', ctaClassName: 'bg-red-600 hover:bg-red-700' },
    { word: 'ambiental', className: 'text-emerald-600', ctaClassName: 'bg-emerald-600 hover:bg-emerald-700' },
    { word: 'productivo', className: 'text-blue-600', ctaClassName: 'bg-blue-600 hover:bg-blue-700' },
    { word: 'educativo', className: 'text-orange-500', ctaClassName: 'bg-orange-500 hover:bg-orange-600' },
    { word: 'innovador', className: 'text-violet-600', ctaClassName: 'bg-violet-600 hover:bg-violet-700' },
    { word: 'tecnológico', className: 'text-cyan-500', ctaClassName: 'bg-cyan-500 hover:bg-cyan-600' },
  ] as const,
  primaryCta: 'Ver proyectos en curso',
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
