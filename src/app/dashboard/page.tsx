import { redirect } from 'next/navigation';
import { getProyectosDashboard } from '@/lib/actions/proyectos';
import { getSession } from '@/lib/auth-utils';
import { roleHasPermission } from '@/lib/permissions/check';
import DashboardPage from './DashboardPage';

export default async function DashboardRoute() {
  const session = await getSession();
  const canView = await roleHasPermission(
    session?.user?.activeRole,
    'view.dashboard'
  );
  if (!canView) {
    redirect('/inicio');
  }

  const result = await getProyectosDashboard();
  return <DashboardPage initialProyectos={result.data ?? []} />;
}
