'use client';

import { useAuth } from '@/contexts/AuthContext';
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
  const { profile, signOut, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-9 w-9 rounded-full bg-gray-200 animate-pulse border-2 border-white shadow-sm" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // Obtener iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const initials = profile.full_name 
    ? getInitials(profile.full_name)
    : profile.email.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-9 w-9 rounded-full p-0 hover:bg-gray-100 focus:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium shadow-sm border-2 border-white">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name || profile.email}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {profile.full_name || 'Usuario'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {profile.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
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
  );
}
