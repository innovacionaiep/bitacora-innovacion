import { Skeleton } from '@/components/ui/skeleton';

/** Chrome del selector mientras hidrata el listado (RSC/Suspense). */
export function ProyectosListSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden px-4 py-6">
      <div className="flex shrink-0 items-center gap-6">
        <Skeleton className="h-8 w-48 bg-gray-100" />
        <Skeleton className="h-10 w-80 bg-gray-100" />
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-full min-h-[200px] w-72 shrink-0 bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
