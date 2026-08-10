'use client';

import NextTopLoader from 'nextjs-toploader';

/** Barra superior global — montada en todas las rutas (auth incluida). */
export function GlobalTopLoader() {
  return <NextTopLoader color="#10b981" height={2} showSpinner={false} />;
}
