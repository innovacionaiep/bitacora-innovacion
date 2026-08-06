'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateUserProfile } from '@/lib/auth-actions';
import { DEFAULT_AVATAR } from '@/lib/avatars';
import { Check, CircleHelp, LogOut, Pencil, X } from 'lucide-react';

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

export interface PortalWelcomeHeaderProps {
  onStartTour?: () => void;
}

export function PortalWelcomeHeader({ onStartTour }: PortalWelcomeHeaderProps) {
  const { data: session, update } = useSession();
  const [fullName, setFullName] = useState('');
  const [tempFullName, setTempFullName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const availableRoles = session?.user?.availableRoles ?? [];

  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.name || '');
      setTempFullName(session.user.name || '');
    }
  }, [session?.user?.name, session?.user]);

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
          {availableRoles.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-gray-500 shrink-0">
                Roles habilitados:
              </span>
              {availableRoles.map((role) => (
                <span
                  key={role}
                  className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${getRoleColors(role)}`}
                >
                  {role}
                </span>
              ))}
            </div>
          )}
          {nameError && (
            <p className="text-red-600 text-[11px] mt-1">{nameError}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-auto">
        {onStartTour && (
          <Button
            type="button"
            onClick={onStartTour}
            size="sm"
            variant="outline"
            className="h-8 px-2.5 gap-1.5 text-[13px] font-medium tracking-wide text-gray-600 border-gray-200 bg-white shadow-none hover:bg-gray-50 hover:text-emerald-700"
          >
            <CircleHelp className="h-3.5 w-3.5" strokeWidth={1.75} />
            Ver tutorial
          </Button>
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
