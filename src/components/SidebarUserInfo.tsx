'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { ProfileSidebar } from '@/components/ProfileSidebar';
import { useSidebar } from '@/components/ui/sidebar';

export function SidebarUserInfo() {
  const { data: session, status } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);
  const { state } = useSidebar();

  const isCollapsed = state === 'collapsed';

  // Track if we have initial user data to prevent loading state during updates
  useEffect(() => {
    if (session?.user && !hasInitialData) {
      setHasInitialData(true);
    }
  }, [session?.user, hasInitialData]);

  // Only show loading skeleton on initial mount, not during session updates
  if (status === 'loading' && !hasInitialData) {
    return (
      <div className="flex flex-col items-center gap-2 py-2 -translate-y-2">
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

  return (
    <>
      <div className="flex flex-col items-center gap-1 py-0 -translate-y-2">
        {/* Notification icon - temporalmente oculto en la UI */}
        {false && (
          <Button
            variant="outline"
            size="sm"
            className="group/notification h-10 w-10 rounded-full p-0 relative transition-all duration-200 mb-3 bg-sidebar border border-white hover:!bg-white hover:!text-accent-foreground"
            onClick={() => console.log('Notificaciones clicked')}
          >
            <Bell className="h-4 w-4 text-white group-hover/notification:!text-black transition-colors duration-200" />
            {/* Badge de notificaciones - actualmente estático para visualización */}
            <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full">
              <span
                className="absolute text-white text-[10px] font-medium"
                style={{
                  top: '50%',
                  left: '50%',
                  transform: isCollapsed
                    ? 'translate(-48%, -50%)'
                    : 'translate(-50%, -50%)',
                  lineHeight: '1',
                }}
              >
                10
              </span>
            </span>
          </Button>
        )}

        {/* User name - first word only, hidden when collapsed */}
        {!isCollapsed && (
          <span className="text-sm font-medium text-white text-center px-2 mb-1">
            {firstName}
          </span>
        )}

        {/* Avatar */}
        <Button
          variant="ghost"
          className={`rounded-full p-0 hover:bg-gray-100 focus:bg-gray-100 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all ${
            isCollapsed ? 'h-[45px] w-[45px]' : 'h-[100px] w-[100px]'
          }`}
          onClick={() => setProfileOpen(true)}
        >
          <div
            className={`rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium shadow-md hover:shadow-lg transition-shadow ${
              isCollapsed
                ? 'h-[45px] w-[45px] text-sm'
                : 'h-[100px] w-[100px] text-3xl'
            }`}
          >
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
