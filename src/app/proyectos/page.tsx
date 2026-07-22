'use client';

import { Suspense } from 'react';
import { ProyectosContent } from './ProyectosContent';

export default function ProyectosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 items-center justify-center">
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      }
    >
      <ProyectosContent />
    </Suspense>
  );
}
