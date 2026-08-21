import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth-utils';
import Link from 'next/link';
import {
  Users,
  FolderKanban,
  Handshake,
  ListChecks,
  FileCode,
  Shield,
  FileSignature,
  TrendingUp,
  Wrench,
  GitBranch,
} from 'lucide-react';
import { ConfigRoleGuard } from '@/components/config/ConfigRoleGuard';
import { userHasPermission } from '@/lib/permissions/check';

export default async function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect('/auth/login');
  }
  const canAjustes = await userHasPermission(
    session.user.availableRoles ?? [],
    'view.ajustes'
  );
  if (!canAjustes) {
    redirect('/inicio');
  }

  const navItems = [
    { href: '/configuracion/usuarios', label: 'Usuarios', icon: Users },
    { href: '/configuracion/proyectos', label: 'Proyectos', icon: FolderKanban },
    {
      href: '/configuracion/socios-comunitarios',
      label: 'Socios comunitarios',
      icon: Handshake,
    },
    { href: '/configuracion/roles', label: 'Roles', icon: Shield },
    {
      href: '/configuracion/validacion',
      label: 'Validación de datos',
      icon: ListChecks,
    },
    {
      href: '/configuracion/lineas',
      label: 'Líneas',
      icon: GitBranch,
    },
    {
      href: '/configuracion/desarrollo-tecnico',
      label: 'Desarrollo técnico',
      icon: FileCode,
    },
    {
      href: '/configuracion/convenios',
      label: 'Convenios',
      icon: FileSignature,
    },
    {
      href: '/configuracion/escalamiento',
      label: 'Escalamiento',
      icon: TrendingUp,
    },
    {
      href: '/configuracion/mantenimiento',
      label: 'Mantenimiento',
      icon: Wrench,
    },
  ];

  return (
    <div className="flex flex-col w-full h-full min-h-0 overflow-hidden pt-6 pb-6">
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
