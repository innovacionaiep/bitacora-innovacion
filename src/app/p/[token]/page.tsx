import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { getProyectoPublicoVista } from '@/lib/actions/proyecto-publico';
import { proyectoBaseKey } from '@/lib/query-keys';
import { ProyectoPublicoFicha } from '@/components/proyectos/ProyectoPublicoFicha';
import { isPublicLinkTokenFormat } from '@/lib/public-link';

export default async function PublicProjectPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!isPublicLinkTokenFormat(token)) {
    return <PublicLinkUnavailable />;
  }

  const vista = await getProyectoPublicoVista(token);
  if (!vista.success || !vista.data) {
    return <PublicLinkUnavailable message={vista.error} />;
  }

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000 } },
  });
  queryClient.setQueryData(
    proyectoBaseKey(vista.data.proyecto.id),
    vista.data.proyecto
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProyectoPublicoFicha
        initialProyecto={vista.data.proyecto}
        catalog={vista.data.catalog}
      />
    </HydrationBoundary>
  );
}

function PublicLinkUnavailable({ message }: { message?: string }) {
  return (
    <div className="flex h-full min-h-0 items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-lg font-semibold text-gray-900">
          Link no disponible
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {message ?? 'Este link no está disponible o fue caducado.'}
        </p>
      </div>
    </div>
  );
}
