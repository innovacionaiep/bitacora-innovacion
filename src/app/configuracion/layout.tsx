import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import Link from 'next/link';
import { Users, FolderKanban, ListChecks, FileCode } from 'lucide-react';
import { ConfigRoleGuard } from '@/components/config/ConfigRoleGuard';

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect('/auth/login');
  }
  if (session.user.activeRole !== 'Admin') {
    redirect('/');
  }

  const navItems = [
    { href: '/configuracion/usuarios', label: 'Usuarios', icon: Users },
    { href: '/configuracion/proyectos', label: 'Proyectos', icon: FolderKanban },
    {
      href: '/configuracion/validacion',
      label: 'Validación de datos',
      icon: ListChecks,
    },
    {
      href: '/configuracion/desarrollo-tecnico',
      label: 'Desarrollo técnico',
      icon: FileCode,
    },
  ];

  return (
    <div className="flex flex-col w-full h-full min-h-0 px-8 pt-6 pb-6">
      <ConfigRoleGuard />
      <div className="flex-shrink-0 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <nav className="flex flex-wrap gap-2 mt-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
