import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/** Estado de carga del tab Indicadores (dynamic import + fetch). */
export function IndicadoresTabLoading() {
  return (
    <div className="flex h-full min-h-[200px] flex-col gap-4 px-5 pt-3 pr-6">
      <div className="flex flex-col items-center justify-center gap-3 py-10">
        <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
        <p className="text-sm text-gray-500">Cargando indicadores…</p>
      </div>
      <Skeleton className="mx-auto h-24 w-full max-w-[1000px] rounded-xl" />
      <div className="mx-auto flex w-full max-w-[1000px] gap-3">
        <Skeleton className="h-32 flex-1 rounded-lg" />
        <Skeleton className="h-32 flex-1 rounded-lg" />
      </div>
    </div>
  );
}
