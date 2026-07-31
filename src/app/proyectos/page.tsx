'use client';

import { Suspense } from 'react';
import { ProyectosContent } from './ProyectosContent';

export default function ProyectosPage() {
  return (
    <Suspense fallback={<div className="h-full min-h-[200px]" />}>
      <ProyectosContent />
    </Suspense>
  );
}
