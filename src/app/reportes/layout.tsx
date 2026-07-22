import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import { roleHasPermission } from '@/lib/permissions/check';

export default async function ReportesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const canView = await roleHasPermission(
    session?.user?.activeRole,
    'view.reportes'
  );
  if (!canView) {
    redirect('/inicio');
  }

  return children;
}
