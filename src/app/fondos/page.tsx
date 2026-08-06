import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import { getFondosNavItems } from '@/lib/actions/operaciones-fondo';
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

  return <FondosPage initialFondos={fondos} />;
}
