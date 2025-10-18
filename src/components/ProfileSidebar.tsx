'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { updateUserProfile } from '@/lib/auth-actions';
import { PREDEFINED_AVATARS, type PredefinedAvatar } from '@/lib/avatars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Pencil, Check, X, LogOut } from 'lucide-react';

interface ProfileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSidebar({ open, onOpenChange }: ProfileSidebarProps) {
  const { data: session, update } = useSession();

  const [fullName, setFullName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<PredefinedAvatar | null>(null);
  const [isLoadingName, setIsLoadingName] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempFullName, setTempFullName] = useState('');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [tempSelectedAvatar, setTempSelectedAvatar] = useState<PredefinedAvatar | null>(null);
  const [optimisticRole, setOptimisticRole] = useState<string | null>(null);

  // Inicializar valores del perfil
  useEffect(() => {
    if (session?.user) {
      setFullName(session.user.name || '');
      setTempFullName(session.user.name || '');

      // Buscar el avatar actual en la lista de avatares predefinidos
      if (session.user.image) {
        const currentAvatar = PREDEFINED_AVATARS.find(
          (avatar) => avatar.url === session.user.image
        );
        setSelectedAvatar(currentAvatar || null);
      }
    }
  }, [session]);

  // Clear optimistic state when session catches up
  useEffect(() => {
    if (optimisticRole && session?.user?.activeRole === optimisticRole) {
      setOptimisticRole(null);
    }
  }, [session?.user?.activeRole, optimisticRole]);

  // Get the current role (optimistic or from session)
  const currentRole = optimisticRole || session?.user?.activeRole || 'Sin rol';

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
      setError('Error al cambiar el rol: ' + (err instanceof Error ? err.message : 'Error desconocido'));
    }
  };

  const handleAvatarChange = async (avatar: PredefinedAvatar) => {
    setError('');
    setSuccess('');

    if (!session?.user?.id) return;

    // Optimistic update - update UI immediately
    setSelectedAvatar(avatar);
    setShowAvatarSelector(false);
    setTempSelectedAvatar(null);

    try {
      const result = await updateUserProfile(session.user.id, {
        image: avatar.url,
      });

      if (!result.success) {
        // Revert optimistic update on error
        setSelectedAvatar(selectedAvatar);
        setShowAvatarSelector(true);
        setTempSelectedAvatar(avatar);
        setError(result.error || 'Error al actualizar el avatar');
      } else {
        // Update session in background without awaiting
        update({ image: avatar.url }).catch(console.error);
      }
    } catch (err) {
      // Revert optimistic update on error
      setSelectedAvatar(selectedAvatar);
      setShowAvatarSelector(true);
      setTempSelectedAvatar(avatar);
      setError('Error inesperado al actualizar el avatar');
    }
  };

  const handleAvatarPreview = (avatar: PredefinedAvatar) => {
    setTempSelectedAvatar(avatar);
  };

  const handleAvatarSelectorToggle = () => {
    setShowAvatarSelector(!showAvatarSelector);
    if (!showAvatarSelector) {
      setTempSelectedAvatar(selectedAvatar);
    } else {
      setTempSelectedAvatar(null);
    }
  };

  const handleAvatarSave = async () => {
    if (tempSelectedAvatar) {
      await handleAvatarChange(tempSelectedAvatar);
    }
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
    setTempFullName(fullName);
  };

  const handleNameCancel = () => {
    setIsEditingName(false);
    setTempFullName(fullName);
  };

  const handleNameSave = async () => {
    if (!tempFullName.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }

    if (!session?.user?.id) return;

    const previousName = fullName;
    
    // Optimistic update - update UI immediately
    setFullName(tempFullName);
    setIsEditingName(false);
    setError('');

    try {
      const result = await updateUserProfile(session.user.id, {
        name: tempFullName,
      });

      if (!result.success) {
        // Revert optimistic update on error
        setFullName(previousName);
        setIsEditingName(true);
        setError(result.error || 'Error al actualizar el nombre');
      } else {
        // Update session in background without awaiting
        update({ name: tempFullName }).catch(console.error);
      }
    } catch (err) {
      // Revert optimistic update on error
      setFullName(previousName);
      setIsEditingName(true);
      setError('Error inesperado al actualizar el nombre');
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/login' });
  };

  if (!session) {
    return null;
  }

  const currentAvatar = tempSelectedAvatar || selectedAvatar;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[400px]">
        <SheetHeader>
          <SheetTitle>Mi Cuenta</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full px-6">
          {/* Mensajes de feedback */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="flex-1 space-y-6">
            {/* Role selector above avatar */}
            <div className="flex flex-col items-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={`h-8 px-4 text-sm font-medium border transition-colors duration-200 mb-4 ${getRoleColors(currentRole)}`}
                  >
                    {currentRole}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {session?.user?.availableRoles && session.user.availableRoles.length > 0 ? (
                    session.user.availableRoles.map((role) => {
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

            {/* Avatar con hover edit */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <img
                  src={currentAvatar?.url || '/avatars/avatar-1.png'}
                  alt="Avatar"
                  className="w-52 h-52 rounded-full border-4 border-gray-200"
                />
                {/* Overlay hover para editar avatar */}
                <div 
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
                  onClick={handleAvatarSelectorToggle}
                >
                  <Pencil className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>

            {/* Información del usuario */}
            <div className="space-y-4 text-center">
              {/* Nombre con edición */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-3">
                  {!isEditingName ? (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900">{fullName}</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNameEdit}
                        className="p-1"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        value={tempFullName}
                        onChange={(e) => setTempFullName(e.target.value)}
                        placeholder="Tu nombre completo"
                        className="text-2xl font-bold h-auto py-2"
                      />
                      <Button
                        onClick={handleNameSave}
                        size="sm"
                        disabled={isLoadingName}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={handleNameCancel}
                        variant="outline"
                        size="sm"
                        disabled={isLoadingName}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {/* Email (solo lectura) */}
                <p className="text-lg text-gray-600">{session.user.email}</p>
              </div>
            </div>


            {/* Grid de avatares */}
            {showAvatarSelector && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar Avatar</h3>
                <div className="grid grid-cols-5 gap-2">
                  {PREDEFINED_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      onClick={() => handleAvatarPreview(avatar)}
                      className={`w-12 h-12 p-0 rounded-full border-2 transition-all ${
                        tempSelectedAvatar?.id === avatar.id
                          ? 'border-blue-500 ring-2 ring-blue-300'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={handleAvatarSave}
                    size="sm"
                    className="flex-1 text-sm px-3"
                    disabled={!tempSelectedAvatar}
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Guardar
                  </Button>
                  <Button
                    onClick={handleAvatarSelectorToggle}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-sm px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Botón cerrar sesión posicionado en 3/4 del sidebar */}
          <div className="flex-1 flex items-end justify-center pb-12">
            <Button
              onClick={handleSignOut}
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white text-sm px-6"
            >
              <LogOut className="h-3 w-3 mr-1" />
              Cerrar Sesión
            </Button>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}

