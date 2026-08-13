import { Suspense } from 'react';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { getSession } from '@/lib/auth-utils';
import {
  getProyectosListadoParaUsuario,
  getProyectoBase,
} from '@/lib/actions/proyectos';
import { proyectosListadoKey, proyectoBaseKey } from '@/lib/query-keys';
import type { ProyectoListadoItem, ProyectoWithRelations } from '@/types/proyecto';
import { ProyectosContent } from './ProyectosContent';
import { ProyectosListSkeleton } from './ProyectosListSkeleton';

type ProyectosPageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default function ProyectosPage({ searchParams }: ProyectosPageProps) {
  return (
    <Suspense fallback={<ProyectosListSkeleton />}>
      <ProyectosHydrated searchParams={searchParams} />
    </Suspense>
  );
}

async function ProyectosHydrated({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id: proyectoIdFromUrl } = await searchParams;
  const session = await getSession();
  const userId = session?.user?.id ?? null;

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  });

  let initialListado: ProyectoListadoItem[] | undefined;
  if (session?.user) {
    const listadoTask = queryClient.prefetchQuery({
      queryKey: proyectosListadoKey(userId),
      queryFn: async () => {
        const result = await getProyectosListadoParaUsuario();
        if (!result.success) {
          throw new Error(result.error ?? 'Error al obtener listado');
        }
        return (result.data ?? []) as ProyectoListadoItem[];
      },
    });
    const baseTask = proyectoIdFromUrl
      ? queryClient.prefetchQuery({
          queryKey: proyectoBaseKey(proyectoIdFromUrl),
          queryFn: async () => {
            const result = await getProyectoBase(proyectoIdFromUrl);
            if (!result.success || !result.data) {
              throw new Error(result.error ?? 'Error al cargar proyecto');
            }
            return result.data as ProyectoWithRelations;
          },
        })
      : Promise.resolve();
    await Promise.all([listadoTask, baseTask]);
    initialListado = queryClient.getQueryData<ProyectoListadoItem[]>(
      proyectosListadoKey(userId)
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProyectosContent initialListado={initialListado} />
    </HydrationBoundary>
  );
}
