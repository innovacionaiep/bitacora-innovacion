'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateUserProfile } from '@/lib/auth-actions';
import { ProfileSidebar } from '@/components/ProfileSidebar';

export function UserAvatar() {
  const { data: session, status, update } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  // Track if we have initial user data to prevent loading state during updates
  useEffect(() => {
    if (session?.user && !hasInitialData) {
      setHasInitialData(true);
    }
  }, [session?.user, hasInitialData]);

  // Only show loading skeleton on initial mount, not during session updates
  if (status === 'loading' && !hasInitialData) {
    return (
      <div className="flex items-center space-x-2">
        <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse border-2 border-white shadow-sm" />
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

  // Función para obtener colores de rol
  const getRoleColors = (role: string) => {
    switch (role.toLowerCase()) {
      case 'evaluador':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'coordinador':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'encargado':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 'participante':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'admin':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!session?.user?.id) return;

    try {
      const result = await updateUserProfile(session.user.id, {
        activeRole: newRole,
      });

      if (result.success) {
        // Actualizar la sesión
        await update({ activeRole: newRole });
      }
    } catch (err) {
      console.error('Error al cambiar el rol:', err);
    }
  };

  return (
    <>
      <div className="flex items-center mr-2">
        {/* Tag de rol con dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={`h-6 px-2 text-xs font-medium border w-24 ${getRoleColors(user.activeRole || '')} hover:opacity-80`}
            >
              {user.activeRole || 'Sin rol'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {user.availableRoles?.map((role) => (
              <DropdownMenuItem
                key={role}
                className="cursor-pointer"
                onClick={() => handleRoleChange(role)}
              >
                {role}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Nombre de usuario */}
        <span className="text-sm font-medium text-gray-700 ml-4">
          {user.name || user.email.split('@')[0]}
        </span>

        {/* Avatar clickeable */}
        <Button
          variant="ghost"
          className="relative h-8 w-8 rounded-full p-0 hover:bg-gray-100 focus:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ml-5"
          onClick={() => setProfileOpen(true)}
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
      </div>

      {/* ProfileSidebar */}
      <ProfileSidebar open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}
