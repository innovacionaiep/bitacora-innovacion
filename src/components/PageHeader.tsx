'use client';

import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu';
import { UserAvatar } from '@/components/UserAvatar';

export default function PageHeader() {
  return (
    <header className="border-b shadow-sm">
      <div className="px-4 py-2 flex justify-between items-center">
        {/* Menú centrado */}
        <div className="flex-1 flex justify-center">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Inicio</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuLink href="/">Dashboard</NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Proyectos</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuLink href="/proyectos">
                    Ver proyectos
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Configuración</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuLink href="/configuracion">
                    Preferencias
                  </NavigationMenuLink>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>

            <NavigationMenuIndicator />
            <NavigationMenuViewport />
          </NavigationMenu>
        </div>

        {/* Avatar de usuario en el extremo derecho */}
        <div className="flex-shrink-0">
          <UserAvatar />
        </div>
      </div>
    </header>
  );
}
