import { redirect } from 'next/navigation';
import { getSession, ROLES_SIN_DASHBOARD_REPORTES, type Role } from '@/lib/auth-utils';

export default async function ReportesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const activeRole = session?.user?.activeRole;
  if (activeRole && ROLES_SIN_DASHBOARD_REPORTES.includes(activeRole as Role)) {
    redirect('/inicio');
  }

  return children;
}
