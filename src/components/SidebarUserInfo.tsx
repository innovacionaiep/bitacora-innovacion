'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, Bell } from 'lucide-react';
import { updateUserProfile } from '@/lib/auth-actions';
import { ProfileSidebar } from '@/components/ProfileSidebar';
import { useSidebar } from '@/components/ui/sidebar';

export function SidebarUserInfo() {
  const { data: session, status, update } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);
  const [optimisticRole, setOptimisticRole] = useState<string | null>(null);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const { state } = useSidebar();
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const isCollapsed = state === 'collapsed';

  // Track if we have initial user data to prevent loading state during updates
  useEffect(() => {
    if (session?.user && !hasInitialData) {
      setHasInitialData(true);
    }
  }, [session?.user, hasInitialData]);

  // Clear optimistic state when session catches up
  useEffect(() => {
    if (optimisticRole && session?.user?.activeRole === optimisticRole) {
      setOptimisticRole(null);
    }
  }, [session?.user?.activeRole, optimisticRole]);

  // Get the current role (optimistic or from session)
  const currentRole = optimisticRole || session?.user?.activeRole || 'Sin rol';

  // Only show loading skeleton on initial mount, not during session updates
  if (status === 'loading' && !hasInitialData) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
        <div className="h-3 w-16 bg-gray-200 rounded animate-pulse group-data-[collapsible=icon]:hidden" />
        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse group-data-[collapsible=icon]:hidden" />
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

  // Get first word of name
  const firstName = user.name
    ? user.name.split(' ')[0]
    : user.email.split('@')[0];

  // Función para obtener colores de rol
  const getRoleColors = (role: string) => {
    switch (role.toLowerCase()) {
      case 'evaluador':
        return 'bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200 hover:text-purple-800 hover:border-purple-400';
      case 'coordinador':
        return 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200 hover:text-blue-800 hover:border-blue-400';
      case 'encargado':
        return 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200 hover:text-orange-800 hover:border-orange-400';
      case 'participante':
        return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200 hover:text-green-800 hover:border-green-400';
      case 'admin':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200 hover:text-yellow-800 hover:border-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 hover:text-gray-800 hover:border-gray-400';
    }
  };

  // Get just the background color for collapsed state
  const getRoleBackgroundColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'evaluador':
        return 'bg-purple-500';
      case 'coordinador':
        return 'bg-blue-500';
      case 'encargado':
        return 'bg-orange-500';
      case 'participante':
        return 'bg-green-500';
      case 'admin':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get circle color for role indicators
  const getRoleCircleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'evaluador':
        return 'bg-purple-500';
      case 'coordinador':
        return 'bg-blue-500';
      case 'encargado':
        return 'bg-orange-500';
      case 'participante':
        return 'bg-green-500';
      case 'admin':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handlePointerEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setRoleDropdownOpen(true);
  };

  const handlePointerLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(() => {
      setRoleDropdownOpen(false);
    }, 200);
  };

  const handleOpenChange = (open: boolean) => {
    // Only allow programmatic changes from our hover handlers
    // Ignore attempts to close from Radix internal logic
    if (!open && closeTimeoutRef.current) {
      return;
    }
    setRoleDropdownOpen(open);
  };

  const handleRoleChange = async (newRole: string) => {
    if (!session?.user?.id) {
      console.error('No hay sesión de usuario disponible');
      return;
    }

    const previousRole = session.user.activeRole;
    
    console.log('Cambiando rol de', previousRole, 'a', newRole);
    console.log('Roles disponibles:', session.user.availableRoles);
    
    // INSTANT UI update - update optimistic state immediately
    setOptimisticRole(newRole);

    try {
      // Update database first
      const result = await updateUserProfile(session.user.id, {
        activeRole: newRole,
      });

      if (!result.success) {
        throw new Error(result.error || 'Error al actualizar el rol');
      }

      // Update session after successful database update
      await update({ activeRole: newRole });
      
      // Force session refresh to get updated availableRoles
      setTimeout(() => {
        update();
      }, 100);
      
      console.log('Rol cambiado exitosamente');
    } catch (err) {
      // Revert optimistic state on error
      setOptimisticRole(null);
      await update({ activeRole: previousRole });
      console.error('Error al cambiar el rol:', err);
      alert('Error al cambiar el rol: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-1 py-0">
        {/* Notification icon */}
        <Button
          variant="outline"
          size="sm"
          className="h-10 w-10 rounded-full p-0 relative transition-all duration-200 mb-3"
          onClick={() => console.log('Notificaciones clicked')}
        >
          <Bell className="h-4 w-4" />
          {/* Badge de notificaciones - actualmente estático para visualización */}
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full">
            <span className="absolute text-white text-[10px] font-medium" style={{ 
              top: '50%', 
              left: '50%', 
              transform: isCollapsed ? 'translate(-48%, -50%)' : 'translate(-50%, -50%)',
              lineHeight: '1'
            }}>
              10
            </span>
          </span>
        </Button>

        {/* User name - first word only, hidden when collapsed */}
        {!isCollapsed && (
          <span className="text-sm font-medium text-gray-700 text-center px-2 mb-1">
            {firstName}
          </span>
        )}

        {/* Avatar with hover dropdown for role selection */}
        <DropdownMenu open={roleDropdownOpen} onOpenChange={handleOpenChange} modal={false}>
          <DropdownMenuTrigger asChild>
            <div
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
            >
              <Button
                variant="ghost"
                className={`rounded-full p-0 hover:bg-gray-100 focus:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all ${
                  isCollapsed ? 'h-[45px] w-[45px]' : 'h-[100px] w-[100px]'
                }`}
                onClick={() => setProfileOpen(true)}
              >
                <div className={`rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium shadow-md hover:shadow-lg transition-shadow ${
                  isCollapsed ? 'h-[45px] w-[45px] text-sm' : 'h-[100px] w-[100px] text-3xl'
                }`}>
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
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center" 
            side="right"
            sideOffset={5}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            {user.availableRoles && user.availableRoles.length > 0 ? (
              Array.from(new Set(user.availableRoles)).map((role) => {
                const isActive = role === currentRole;
                return (
                  <DropdownMenuItem
                    key={role}
                    className={`cursor-pointer flex items-center gap-2 ${isActive ? 'bg-accent font-semibold' : ''}`}
                    onClick={() => handleRoleChange(role)}
                  >
                    <div className={`w-3 h-3 rounded-full ${getRoleCircleColor(role)}`} />
                    <span className="flex-1">{role}</span>
                    {isActive && <Check className="h-4 w-4 ml-2" />}
                  </DropdownMenuItem>
                );
              })
            ) : (
              <DropdownMenuItem disabled className="text-gray-500">
                No hay roles disponibles
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ProfileSidebar */}
      <ProfileSidebar open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
}

