'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateUserProfile } from '@/lib/auth-actions';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { Check, ChevronDown, LogOut, Pencil, X } from 'lucide-react';

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
  onRoleChange?: (newRole: string) => void;
}

export function PortalWelcomeHeader({ onRoleChange }: PortalWelcomeHeaderProps) {
  const { data: session, update } = useSession();
  const [optimisticRole, setOptimisticRole] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [tempFullName, setTempFullName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const sessionRefreshedRef = useRef(false);

  const availableRoles = session?.user?.availableRoles ?? [];
  const currentRole =
    optimisticRole ?? session?.user?.activeRole ?? availableRoles[0] ?? 'Sin rol';

  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.name || '');
      setTempFullName(session.user.name || '');
    }
  }, [session?.user?.name, session?.user]);

  useEffect(() => {
    if (optimisticRole && session?.user?.activeRole === optimisticRole) {
      setOptimisticRole(null);
    }
  }, [session?.user?.activeRole, optimisticRole]);

  // Al montar Inicio, refrescar sesión para sincronizar availableRoles desde BD
  useEffect(() => {
    if (!session?.user?.id || sessionRefreshedRef.current) return;
    sessionRefreshedRef.current = true;
    update({ activeRole: session.user.activeRole ?? undefined });
  }, [session?.user?.id, session?.user?.activeRole, update]);

  const handleRoleChange = async (newRole: string) => {
    if (!session?.user?.id) return;
    const previousRole = session.user.activeRole ?? null;
    setOptimisticRole(newRole);
    onRoleChange?.(newRole);
    try {
      const result = await updateUserProfile(session.user.id, {
        activeRole: newRole,
      });
      if (!result.success) throw new Error(result.error);
      await update({ activeRole: newRole });
      setTimeout(() => update(), 100);
    } catch {
      setOptimisticRole(previousRole);
      await update({ activeRole: previousRole });
      if (typeof previousRole === 'string') {
        onRoleChange?.(previousRole);
      }
    }
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
    setTempFullName(fullName);
    setNameError('');
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setTempFullName(fullName);
    setNameError('');
  };

  const handleNameSave = async () => {
    if (!tempFullName.trim()) {
      setNameError('El nombre no puede estar vacío');
      return;
    }
    if (!session?.user?.id) return;

    const previousName = fullName;
    setFullName(tempFullName);
    setIsEditingName(false);
    setNameError('');

    try {
      const result = await updateUserProfile(session.user.id, {
        name: tempFullName,
      });
      if (!result.success) {
        setFullName(previousName);
        setIsEditingName(true);
        setNameError(result.error || 'Error al actualizar el nombre');
      } else {
        update({ name: tempFullName }).catch(console.error);
      }
    } catch {
      setFullName(previousName);
      setIsEditingName(true);
      setNameError('Error inesperado al actualizar el nombre');
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  if (!session?.user) return null;

  const displayName = fullName || session.user.email || 'Usuario';

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 w-full">
      <div className="flex items-center gap-4 min-w-0">
        <Avatar className="h-16 w-16 border-2 border-muted shrink-0">
          <AvatarImage src={DEFAULT_AVATAR} alt={displayName} />
          <AvatarFallback className="text-lg">
            {(displayName.charAt(0) || 'U').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {!isEditingName ? (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-2xl font-bold tracking-tight truncate">
                Bienvenido, {displayName}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNameEdit}
                className="p-1 shrink-0"
                aria-label="Editar nombre"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={tempFullName}
                onChange={(e) => setTempFullName(e.target.value)}
                placeholder="Tu nombre completo"
                className="text-xl font-bold h-10 max-w-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleNameSave();
                  if (e.key === 'Escape') handleNameCancel();
                }}
                autoFocus
              />
              <Button onClick={() => void handleNameSave()} size="sm">
                <Check className="h-4 w-4" />
              </Button>
              <Button onClick={handleNameCancel} variant="outline" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <p className="text-muted-foreground text-sm mt-0.5 truncate">
            {session.user.email}
          </p>
          {nameError && (
            <p className="text-red-600 text-xs mt-1">{nameError}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {availableRoles.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`min-w-[140px] justify-between shrink-0 ${getRoleColors(currentRole)}`}
              >
                {currentRole}
                <ChevronDown className="h-4 w-4 ml-1 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px]">
              {availableRoles.map((role) => {
                const isActive = role === currentRole;
                return (
                  <DropdownMenuItem
                    key={role}
                    className={`cursor-pointer flex items-center gap-2 ${isActive ? 'bg-accent font-semibold' : ''}`}
                    onClick={() => void handleRoleChange(role)}
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
        )}

        <Button
          onClick={() => void handleSignOut()}
          size="sm"
          className="bg-red-500 hover:bg-red-600 text-white"
        >
          <LogOut className="h-3 w-3 mr-1" />
          Cerrar Sesión
        </Button>
      </div>
    </header>
  );
}
