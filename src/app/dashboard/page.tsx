import { getProyectosDashboard } from '@/lib/actions/proyectos';
import DashboardPage from './DashboardPage';

export default async function DashboardRoute() {
  const result = await getProyectosDashboard();
  return <DashboardPage initialProyectos={result.data ?? []} />;
}
