import { redirect } from 'next/navigation';
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from '@tanstack/react-query';
import { getSession } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import {
  getFondoGestionData,
  getFondosNavItems,
} from '@/lib/actions/operaciones-fondo';
import { fondoGestionKey } from '@/lib/query-keys';
import FondosPage from './FondosPage';

export default async function FondosRoute() {
  const session = await getSession();
  const canView = await userHasPermission(
    session?.user?.availableRoles ?? [],
    'view.fondos'
  );
  if (!canView) {
    redirect('/inicio');
  }

  const result = await getFondosNavItems();
  const fondos = result.success ? (result.data ?? []) : [];

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  });

  const activeFondoNombre = fondos[0]?.nombre;
  if (activeFondoNombre) {
    await queryClient.prefetchQuery({
      queryKey: fondoGestionKey(activeFondoNombre),
      queryFn: async () => {
        const fondoResult = await getFondoGestionData(activeFondoNombre);
        if (!fondoResult.success || !fondoResult.data) {
          throw new Error(fondoResult.error ?? 'Error al cargar datos del fondo');
        }
        return fondoResult.data;
      },
    });
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <FondosPage initialFondos={fondos} />
    </HydrationBoundary>
  );
}
