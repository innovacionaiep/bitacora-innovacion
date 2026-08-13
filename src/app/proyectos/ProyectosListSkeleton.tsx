import { Skeleton } from '@/components/ui/skeleton';

/** Chrome del selector mientras hidrata el listado (RSC/Suspense). */
export function ProyectosListSkeleton() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-hidden px-4 py-6 lg:flex-row lg:gap-8">
      <div className="flex w-full shrink-0 flex-col gap-4 lg:w-1/3">
        <Skeleton className="h-8 w-48 bg-gray-100" />
        <Skeleton className="h-10 w-full bg-gray-100" />
        <Skeleton className="h-10 w-full bg-gray-100" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full bg-gray-100" />
        ))}
      </div>
    </div>
  );
}
