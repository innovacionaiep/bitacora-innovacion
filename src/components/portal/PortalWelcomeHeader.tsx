'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateUserProfile } from '@/lib/auth-actions';
import { Check, ChevronDown } from 'lucide-react';

function getRoleColors(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200';
    case 'coordinador':
      return 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200';
    case 'colaborador':
      return 'bg-violet-100 text-violet-700 border-violet-300 hover:bg-violet-200';
    case 'encargado':
      return 'bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200';
    case 'docente':
      return 'bg-green-100 text-green-700 border-green-300 hover:bg-green-200';
    case 'estudiante':
      return 'bg-red-100 text-red-700 border-red-300 hover:bg-red-200';
    case 'beneficiario':
      return 'bg-cyan-100 text-cyan-700 border-cyan-300 hover:bg-cyan-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200';
  }
}

function getRoleCircleColor(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return 'bg-yellow-500';
    case 'coordinador':
      return 'bg-blue-500';
    case 'colaborador':
      return 'bg-violet-500';
    case 'encargado':
      return 'bg-orange-500';
    case 'docente':
      return 'bg-green-500';
    case 'estudiante':
      return 'bg-red-500';
    case 'beneficiario':
      return 'bg-cyan-500';
    default:
      return 'bg-gray-500';
  }
}

export interface PortalWelcomeHeaderProps {
  rolesVigentes: string[];
  onRoleChange?: () => void;
}

export function PortalWelcomeHeader({
  rolesVigentes,
  onRoleChange,
}: PortalWelcomeHeaderProps) {
  const { data: session, update } = useSession();
  const [optimisticRole, setOptimisticRole] = useState<string | null>(null);

  const currentRole =
    optimisticRole ?? session?.user?.activeRole ?? rolesVigentes[0] ?? 'Sin rol';

  const handleRoleChange = async (newRole: string) => {
    if (!session?.user?.id) return;
    const previousRole = session.user.activeRole ?? null;
    setOptimisticRole(newRole);
    try {
      const result = await updateUserProfile(session.user.id, {
        activeRole: newRole,
      });
      if (!result.success) throw new Error(result.error);
      await update({ activeRole: newRole });
      setTimeout(() => update(), 100);
      onRoleChange?.();
    } catch {
      setOptimisticRole(null);
      await update({ activeRole: previousRole });
    }
  };

  if (!session?.user) return null;

  const name = session.user.name || session.user.email || 'Usuario';
  const image = session.user.image;

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
      <div className="flex items-center gap-4">
        <Avatar className="h-14 w-14 border-2 border-muted">
          <AvatarImage src={image ?? undefined} alt={name} />
          <AvatarFallback className="text-lg">
            {(name.charAt(0) || 'U').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bienvenido, {name}
          </h1>
          <p className="text-muted-foreground text-sm">
            Selecciona tu rol para ver el contenido asociado
          </p>
        </div>
      </div>

      {rolesVigentes.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Rol activo:
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`min-w-[140px] justify-between ${getRoleColors(currentRole)}`}
              >
                {currentRole}
                <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {rolesVigentes.map((role) => {
                const isActive = role === currentRole;
                return (
                  <DropdownMenuItem
                    key={role}
                    className={`cursor-pointer flex items-center gap-2 ${isActive ? 'bg-accent font-semibold' : ''}`}
                    onClick={() => handleRoleChange(role)}
                  >
                    <div
                      className={`w-3 h-3 rounded-full shrink-0 ${getRoleCircleColor(role)}`}
                    />
                    <span className="flex-1">{role}</span>
                    {isActive && <Check className="h-4 w-4" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}
