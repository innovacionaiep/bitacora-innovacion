import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import Link from 'next/link';
import { Users, ListChecks, FileCode } from 'lucide-react';
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
    { href: '/configuracion/validacion', label: 'Validación de datos', icon: ListChecks },
    { href: '/configuracion/desarrollo-tecnico', label: 'Desarrollo técnico', icon: FileCode },
  ];

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      <ConfigRoleGuard />
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">
          Administración de usuarios, catálogos y desarrollo técnico.
        </p>
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
      {children}
    </div>
  );
}
