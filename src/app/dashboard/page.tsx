import { redirect } from 'next/navigation';
import { getProyectosDashboard } from '@/lib/actions/proyectos';
import { getSession } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';
import DashboardPage from './DashboardPage';

export default async function DashboardRoute() {
  const session = await getSession();
  const canView = await userHasPermission(
    session?.user?.availableRoles ?? [],
    'view.dashboard'
  );
  if (!canView) {
    redirect('/inicio');
  }

  const result = await getProyectosDashboard();
  return <DashboardPage initialProyectos={result.data ?? []} />;
}
