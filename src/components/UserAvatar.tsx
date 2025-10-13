'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut, Settings } from 'lucide-react';

export function UserAvatar() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse border-2 border-white shadow-sm" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = user.name
    ? getInitials(user.name)
    : user.email.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <div className="flex items-center space-x-5 mr-2">
      {/* Nombre de usuario */}
      <span className="text-sm font-medium text-gray-700">
        {user.name || user.email.split('@')[0]}
      </span>

      {/* Avatar con dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-8 w-8 rounded-full p-0 hover:bg-gray-100 focus:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="absolute top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-base font-medium shadow-sm border-2 border-white">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || user.email}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => router.push('/perfil')}
          >
            <User className="mr-2 h-4 w-4" />
            <span>Perfil</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Configuración</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-red-600 focus:text-red-600"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Cerrar sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
