import { Suspense } from 'react';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { getSession } from '@/lib/auth-utils';
import { getProyectosListadoParaUsuario } from '@/lib/actions/proyectos';
import { proyectosListadoKey } from '@/lib/query-keys';
import type { ProyectoListadoItem } from '@/types/proyecto';
import { ProyectosContent } from './ProyectosContent';

export default async function ProyectosPage() {
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
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<div className="h-full min-h-[200px]" />}>
        <ProyectosContent initialListado={initialListado} />
      </Suspense>
    </HydrationBoundary>
  );
}
