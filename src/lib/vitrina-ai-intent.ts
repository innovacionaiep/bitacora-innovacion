import {
  facetConstraintsAreActive,
  facetConstraintsFromQuery,
  foldVitrinaText,
  type VitrinaAiCatalogs,
} from '@/lib/vitrina-ai-index';

export type VitrinaAiTurnIntent = 'search' | 'ask' | 'detail' | 'reset';

export {
  facetConstraintsAreActive,
  facetConstraintsFromQuery,
  type VitrinaAiFacetConstraints,
} from '@/lib/vitrina-ai-index';

const RESET_RE =
  /\b(mostrar todos|ver todos|ver todas|limpia(?:r)?(?: los)? filtros|quita(?:r)?(?: los)? filtros|borra(?:r)?(?: el| los)? filtros?|reset|volver a todos|sin filtros)\b/;

const SEARCH_HINTS = [
  'busco',
  'buscar',
  'necesito ver',
  'necesito un',
  'necesito otro',
  'muestrame',
  'muestra proyectos',
  'muestra los',
  'mostrar los',
  'quiero ver',
  'ver proyectos',
  'ver los de',
  'ver los proyectos',
  'otro proyecto',
  'otros proyectos',
  'ahora necesito',
  'hay algun proyecto',
  'hay un proyecto',
  'filtr',
  'ensename',
  'solo los de',
  'solo los proyectos',
  'los de ',
];

const COUNT_HINTS = [
  'cuantos',
  'cuantas',
  'que fondos',
  'cuales fondos',
  'cuales son los fondos',
  'que sedes hay',
  'que escuelas hay',
  'que etiquetas hay',
  'hay en curso',
  'hay en total',
  'en total hay',
];

const DETAIL_HINTS = [
  'como trabaja',
  'como lo hace',
  'que hace',
  'que es',
  'de que trata',
  'en que consiste',
  'ese proyecto',
  'este proyecto',
  'el proyecto',
  'explica',
  'describe',
  'cuenta ',
  'por que',
];

const TOPIC_HINTS = [
  'algun',
  'alguno',
  'alguna',
  'algunos',
  'algunas',
  'se trata',
  'trata de',
  'de que trata',
  'acerca de',
  'vinculad',
  'relacionad',
  'habla de',
  'el tema',
  'existen',
  'existe',
  'algo de',
];

const FACET_WORD_STOP = new Set([
  'fondo',
  'fondos',
  'sede',
  'sedes',
  'escuela',
  'escuelas',
  'etiqueta',
  'etiquetas',
  'linea',
  'lineas',
  'socio',
  'socios',
]);

export function vitrinaAiIntentAllowsFilters(
  intent: VitrinaAiTurnIntent,
): boolean {
  return intent === 'search';
}

function hasCountSignal(
  folded: string,
  leftover: string[],
  hasFacets: boolean,
): boolean {
  if (COUNT_HINTS.some((hint) => folded.includes(hint))) return true;
  if (leftover.length > 0) return false;
  return (
    hasFacets &&
    (/\bhay de\b/.test(folded) ||
      /\bhay proyectos de\b/.test(folded) ||
      /\bhay alguno\b/.test(folded) ||
      /\bhay alguna\b/.test(folded))
  );
}

function isShortShowQuery(
  folded: string,
  leftover: string[],
  hasFacets: boolean,
): boolean {
  if (!hasFacets) return false;
  if (folded.includes('?')) return false;
  if (/^(y |¿y )/.test(folded)) return false;
  const leftoverCore = leftover.filter(
    (token) => !['solo', 'filtra', 'filtrar', 'los'].includes(token),
  );
  if (leftoverCore.length > 0) return false;
  if (/^(los de |solo |filtra |filtrar )/.test(folded)) return true;
  const tokens = folded.split(/[^a-z0-9]+/).filter(Boolean);
  const meaningful = tokens.filter(
    (token) => !FACET_WORD_STOP.has(token) && token.length > 2,
  );
  return meaningful.length <= 3;
}

const META_HINTS = [
  'hola',
  'buenas',
  'buenos dias',
  'buen dia',
  'hello',
  'hey',
  'que tal',
  'como estas',
  'en que puedes',
  'que puedes hacer',
  'que puedes ayudar',
  'puedes ayudarme',
  'como me puedes',
  'para que sirves',
  'quien eres',
];

const META_LEFTOVER = new Set([
  'hola',
  'buenas',
  'dias',
  'dia',
  'hello',
  'hey',
  'tal',
  'estas',
  'puedes',
  'hacer',
  'ayudar',
  'ayudarme',
  'sirves',
  'eres',
  'quien',
  'ayuda',
  'ayudas',
  'chat',
  'asistente',
]);

export function isVitrinaAiChatMetaQuery(
  message: string,
  catalogs?: VitrinaAiCatalogs,
): boolean {
  const folded = foldVitrinaText(message);
  if (!folded) return false;
  if (!META_HINTS.some((hint) => folded.includes(hint))) return false;
  const { leftover, constraints } = facetConstraintsFromQuery(message, catalogs);
  if (facetConstraintsAreActive(constraints)) return false;
  return leftover.every((token) => META_LEFTOVER.has(token));
}

export function isVitrinaAiTopicQuery(
  message: string,
  catalogs?: VitrinaAiCatalogs,
): boolean {
  const folded = foldVitrinaText(message);
  if (!folded) return false;
  if (isVitrinaAiChatMetaQuery(message, catalogs)) return false;
  const { leftover } = facetConstraintsFromQuery(message, catalogs);
  if (leftover.length === 0) return false;
  if (
    folded.includes('ese proyecto') ||
    folded.includes('este proyecto') ||
    folded.includes('el proyecto') ||
    folded.includes('como trabaja') ||
    folded.includes('que hace')
  ) {
    return false;
  }
  if (TOPIC_HINTS.some((hint) => folded.includes(hint))) return true;
  if (
    /\bes de /.test(folded) &&
    !/\bes de (fondo|la sede|la escuela|la etiqueta)/.test(folded)
  ) {
    return true;
  }
  if (/\bsobre [a-z]/.test(folded)) return true;
  if (/\b(hay|existen|existe)\b/.test(folded)) return true;
  if (folded.includes('?')) return true;
  return false;
}

export function vitrinaAiQueryRefersToPrevious(
  message: string,
  historyLength = 0,
): boolean {
  const folded = foldVitrinaText(message);
  if (
    /\b(esos|esas|de esos|de esas|alguno de|alguna de|de ellos|de ellas)\b/.test(
      folded,
    )
  ) {
    return true;
  }
  if (historyLength <= 0) return false;
  if (/\bcuant[oa]s\b/.test(folded)) return false;
  return /^(y |¿y )(de |en )?/.test(folded) || /^¿y /.test(folded);
}

export function classifyVitrinaAiIntent(
  message: string,
  historyLength: number,
  catalogs?: VitrinaAiCatalogs,
): VitrinaAiTurnIntent {
  const folded = foldVitrinaText(message);
  if (!folded) return historyLength > 0 ? 'detail' : 'search';
  if (RESET_RE.test(folded)) return 'reset';
  if (isVitrinaAiChatMetaQuery(message, catalogs)) return 'detail';

  const { leftover, constraints } = facetConstraintsFromQuery(message, catalogs);
  const hasFacets = facetConstraintsAreActive(constraints);
  const isTopic = isVitrinaAiTopicQuery(message, catalogs);
  const isCount = hasCountSignal(folded, leftover, hasFacets);
  const isSearchHint = SEARCH_HINTS.some((hint) => folded.includes(hint));
  const isShortShow = isShortShowQuery(folded, leftover, hasFacets);
  const isDetail =
    DETAIL_HINTS.some((hint) => folded.includes(hint)) ||
    (historyLength > 0 &&
      (folded.includes('como ') ||
        folded.includes('que hace') ||
        folded.includes('ese ') ||
        folded.includes('este ') ||
        folded.includes('?')));

  if (isCount) return 'ask';
  if (isTopic && !isSearchHint) return 'ask';
  if (isSearchHint || isShortShow) return 'search';
  if (
    historyLength > 0 &&
    hasFacets &&
    leftover.length === 0 &&
    (folded.includes('?') || /^(y |¿y )/.test(folded))
  ) {
    return 'ask';
  }
  if (isDetail) return 'detail';
  return historyLength > 0 ? 'detail' : 'search';
}
