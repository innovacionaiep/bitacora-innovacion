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

type ProyectosPageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function ProyectosPage({ searchParams }: ProyectosPageProps) {
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
    await queryClient.prefetchQuery({
      queryKey: proyectosListadoKey(userId),
      queryFn: async () => {
        const result = await getProyectosListadoParaUsuario();
        if (!result.success) {
          throw new Error(result.error ?? 'Error al obtener listado');
        }
        return (result.data ?? []) as ProyectoListadoItem[];
      },
    });
    initialListado =
      queryClient.getQueryData<ProyectoListadoItem[]>(
        proyectosListadoKey(userId)
      );

    if (proyectoIdFromUrl) {
      await queryClient.prefetchQuery({
        queryKey: proyectoBaseKey(proyectoIdFromUrl),
        queryFn: async () => {
          const result = await getProyectoBase(proyectoIdFromUrl);
          if (!result.success || !result.data) {
            throw new Error(result.error ?? 'Error al cargar proyecto');
          }
          return result.data as ProyectoWithRelations;
        },
      });
    }
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="h-full min-h-[200px]" />}>
        <ProyectosContent initialListado={initialListado} />
      </Suspense>
    </HydrationBoundary>
  );
}
