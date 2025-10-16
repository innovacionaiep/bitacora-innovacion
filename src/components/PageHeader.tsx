'use client';

import { useState } from 'react';
import { Home, Bell, HelpCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/UserAvatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function PageHeader() {
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const pathname = usePathname();

  return (
    <header className="border-b shadow-sm bg-sidebar">
      <div className="px-4 py-2.5 flex justify-between items-center">
        {/* Left side: Action icons */}
        <TooltipProvider>
          <div className="flex items-center gap-4 pl-5">
            {/* Home Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 w-8 p-0 ${
                      pathname === '/'
                        ? 'bg-black text-white hover:!bg-black pointer-events-none'
                        : 'text-gray-700 hover:!bg-gray-200 hover:text-black active:bg-gray-300'
                    }`}
                  >
                    <Home className="h-6 w-6" />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Ir al inicio</p>
              </TooltipContent>
            </Tooltip>

            {/* Notifications Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 relative text-gray-700 hover:!bg-gray-200 hover:text-black active:bg-gray-300"
                  onClick={() => {
                    // Placeholder for notifications functionality
                    console.log('Notificaciones clicked');
                  }}
                >
                  <Bell className="h-6 w-6" />
                  {/* Uncomment to show notification badge */}
                  {/* <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    3
                  </span> */}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Notificaciones</p>
              </TooltipContent>
            </Tooltip>

            {/* Help Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-700 hover:!bg-gray-200 hover:text-black active:bg-gray-300"
                  onClick={() => {
                    // Placeholder for help functionality
                    console.log('Ayuda clicked');
                  }}
                >
                  <HelpCircle className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Ayuda</p>
              </TooltipContent>
            </Tooltip>

            {/* Search Button with expandable input */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-gray-700 hover:!bg-gray-200 hover:text-black active:bg-gray-300"
                  onClick={() => setSearchExpanded(!searchExpanded)}
                >
                  <Search className="h-6 w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Buscar</p>
              </TooltipContent>
            </Tooltip>

            {/* Expandable Search Input */}
            {searchExpanded && (
              <Input
                type="text"
                placeholder="Buscar proyectos, tareas..."
                className="h-8 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                onBlur={() => {
                  // Close search if empty after a delay
                  setTimeout(() => {
                    if (!searchQuery) {
                      setSearchExpanded(false);
                    }
                  }, 200);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSearchExpanded(false);
                    setSearchQuery('');
                  }
                  if (e.key === 'Enter') {
                    console.log('Searching for:', searchQuery);
                    // Implement search functionality here
                  }
                }}
              />
            )}
          </div>
        </TooltipProvider>

        {/* Right side: User Avatar */}
        <div className="flex-shrink-0">
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}
