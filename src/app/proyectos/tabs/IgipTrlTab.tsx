'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

function IgipTrlFallback() {
  return (
    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-6">
      <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      <p className="text-sm text-gray-500">Cargando…</p>
    </div>
  );
}

const IgipTrlCard = dynamic(
  () =>
    import('@/components/proyectos/IgipTrlCard').then((m) => ({
      default: m.IgipTrlCard,
    })),
  { loading: () => <IgipTrlFallback /> }
);

export function IgipTrlTab({
  projectId,
  topLoaderEnabled = true,
}: {
  projectId: string;
  topLoaderEnabled?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pt-2">
      <IgipTrlCard
        projectId={projectId}
        topLoaderEnabled={topLoaderEnabled}
      />
    </div>
  );
}
