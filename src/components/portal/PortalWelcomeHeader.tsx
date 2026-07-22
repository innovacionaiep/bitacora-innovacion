'use client';

import { useState, useEffect } from 'react';
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
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'coordinador':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'colaborador':
      return 'bg-violet-100 text-violet-800 border-violet-200';
    case 'encargado':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'docente':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'estudiante':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'beneficiario':
      return 'bg-cyan-100 text-cyan-800 border-cyan-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
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

/** Sobrevive a remounts del header; evita update() en bucle tras login. */
const sessionSyncedUserIds = new Set<string>();

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

  // Una sola sync por usuario y sesión de pestaña (no por remount del componente)
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || sessionSyncedUserIds.has(userId)) return;
    sessionSyncedUserIds.add(userId);
    update({ activeRole: session.user.activeRole ?? undefined });
  }, [session?.user?.id, session?.user?.activeRole, session?.user, update]);

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
        <Avatar className="h-16 w-16 border border-gray-200 shrink-0 shadow-none">
          <AvatarImage src={DEFAULT_AVATAR} alt={displayName} />
          <AvatarFallback className="text-lg text-gray-700 bg-gray-50">
            {(displayName.charAt(0) || 'U').toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          {!isEditingName ? (
            <div className="group/title flex items-center gap-2 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 truncate leading-tight">
                Bienvenido, {displayName}
              </h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNameEdit}
                className="h-7 w-7 p-0 shrink-0 rounded-sm opacity-0 group-hover/title:opacity-100 transition-opacity duration-150 text-gray-400 hover:text-gray-700 hover:bg-transparent"
                aria-label="Editar nombre"
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                value={tempFullName}
                onChange={(e) => setTempFullName(e.target.value)}
                placeholder="Tu nombre completo"
                className="text-xl font-bold h-10 max-w-xs border-0 border-b border-gray-200 rounded-none shadow-none bg-transparent px-0 focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleNameSave();
                  if (e.key === 'Escape') handleNameCancel();
                }}
                autoFocus
              />
              <Button
                onClick={() => void handleNameSave()}
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-gray-900 hover:text-emerald-700 hover:bg-transparent"
              >
                <Check className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
              <Button
                onClick={handleNameCancel}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-500 hover:text-gray-900 hover:bg-transparent"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </Button>
            </div>
          )}
          <p className="text-[13px] text-gray-500 mt-0.5 truncate tracking-wide">
            {session.user.email}
          </p>
          {nameError && (
            <p className="text-red-600 text-[11px] mt-1">{nameError}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {availableRoles.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className={`min-w-[140px] h-8 justify-between shrink-0 rounded border px-2 text-[10px] font-medium shadow-none bg-white border-gray-200 hover:bg-gray-50 ${getRoleColors(currentRole)}`}
              >
                {currentRole}
                <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" strokeWidth={1.75} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[160px] border-gray-200 shadow-md">
              {availableRoles.map((role) => {
                const isActive = role === currentRole;
                return (
                  <DropdownMenuItem
                    key={role}
                    className={`cursor-pointer flex items-center gap-2 text-[13px] ${isActive ? 'bg-gray-50 font-medium text-gray-900' : 'text-gray-700'}`}
                    onClick={() => void handleRoleChange(role)}
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${getRoleCircleColor(role)}`}
                    />
                    <span className="flex-1">{role}</span>
                    {isActive && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          onClick={() => void handleSignOut()}
          size="sm"
          variant="ghost"
          className="h-7 px-2 gap-1.5 text-[13px] font-normal text-gray-500 hover:text-red-600 hover:bg-transparent"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
          Cerrar Sesión
        </Button>
      </div>
    </header>
  );
}
