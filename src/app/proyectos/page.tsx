'use client';

import { Suspense } from 'react';
import { ProyectosContent } from './ProyectosContent';

export default function ProyectosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[40vh]">
          <span className="text-muted-foreground">Cargando...</span>
        </div>
      }
    >
      <ProyectosContent />
    </Suspense>
  );
}
