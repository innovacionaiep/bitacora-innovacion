import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import { userHasPermission } from '@/lib/permissions/check';

export default async function ReportesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const canView = await userHasPermission(
    session?.user?.availableRoles ?? [],
    'view.reportes'
  );
  if (!canView) {
    redirect('/inicio');
  }

  return children;
}
