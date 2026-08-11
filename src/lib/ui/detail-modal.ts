/**
 * Layout compartido de modales de detalle (actividad, indicador, presupuesto).
 * Usa % del contenedor ScalePortal (no vw/vh) y @container para adaptarse al zoom.
 */

/** Shell DialogContent: deja aire para la X exterior (-right-12 ≈ 3rem). */
export const DETAIL_MODAL_CONTENT_CLASS =
  '@container flex h-[min(85%,calc(100%-2rem))] max-h-[min(85%,calc(100%-2rem))] w-[min(85%,calc(100%-7rem))] max-w-[min(85%,calc(100%-7rem))] flex-col gap-0 overflow-hidden border border-gray-200 bg-white p-0 shadow-md sm:rounded-lg';

/** Cabecera: título + progreso; apila en contenedores estrechos. */
export const DETAIL_MODAL_HEADER_ROW_CLASS =
  'flex flex-col gap-3 @min-[720px]:flex-row @min-[720px]:items-center @min-[720px]:justify-between @min-[720px]:gap-4';

export const DETAIL_MODAL_TITLE_CLASS =
  'm-0 line-clamp-2 text-xl font-semibold leading-tight text-gray-900 @min-[720px]:text-2xl';

export const DETAIL_MODAL_PROGRESS_WRAP_CLASS =
  'flex shrink-0 items-center gap-3 pr-2 @min-[720px]:gap-4';

export const DETAIL_MODAL_PROGRESS_BAR_CLASS =
  'h-2.5 w-32 overflow-hidden rounded-full bg-gray-200 @min-[720px]:w-48 @min-[1000px]:w-64';

/**
 * Cuerpo a 3 columnas. Bajo ~900px de ancho del modal, apila en una columna
 * con scroll único (misma lógica “nada se pierde” que el árbol de indicadores).
 */
export const DETAIL_MODAL_COLUMNS_CLASS =
  'grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-y-auto px-5 py-4 @min-[900px]:grid-cols-3 @min-[900px]:overflow-hidden';

/** Columna con scroll propio en layout ancho; divisor inferior al apilar. */
export const DETAIL_MODAL_COL_CLASS =
  'custom-scrollbar min-h-0 space-y-14 overflow-visible @max-[899px]:border-b @max-[899px]:border-gray-100 @max-[899px]:pb-6 @min-[900px]:overflow-y-auto';

export const DETAIL_MODAL_COL_DIVIDER_CLASS =
  '@min-[900px]:border-r @min-[900px]:border-gray-100 @min-[900px]:pr-6';
