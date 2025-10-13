'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { updateUserProfile } from '@/lib/auth-actions';
import { PREDEFINED_AVATARS, type PredefinedAvatar } from '@/lib/avatars';
import { type Role } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, ArrowLeft, Check, X, Pencil, Shield } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
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

  const handleAvatarChange = async (avatar: PredefinedAvatar) => {
    setError('');
    setSuccess('');

    if (!session?.user?.id) return;

    try {
      const result = await updateUserProfile(session.user.id, {
        image: avatar.url,
      });

      if (!result.success) {
        setError(result.error || 'Error al actualizar el avatar');
      } else {
        setSelectedAvatar(avatar);
        setShowAvatarSelector(false);
        setTempSelectedAvatar(null);
        setSuccess('Avatar actualizado correctamente');

        // Actualizar la sesión
        await update({ image: avatar.url });

        // Limpiar mensaje de éxito después de 2 segundos
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
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

    setIsLoadingName(true);
    setError('');
    setSuccess('');

    try {
      const result = await updateUserProfile(session.user.id, {
        name: tempFullName,
      });

      if (!result.success) {
        setError(result.error || 'Error al actualizar el nombre');
      } else {
        setFullName(tempFullName);
        setIsEditingName(false);
        setSuccess('Nombre actualizado correctamente');

        // Actualizar la sesión
        await update({ name: tempFullName });

        // Limpiar mensaje de éxito después de 2 segundos
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError('Error inesperado al actualizar el nombre');
    } finally {
      setIsLoadingName(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!session?.user?.id) return;

    setError('');
    setSuccess('');

    try {
      const result = await updateUserProfile(session.user.id, {
        activeRole: newRole,
      });

      if (!result.success) {
        setError(result.error || 'Error al cambiar el rol activo');
      } else {
        setSuccess('Rol activo actualizado correctamente');

        // Actualizar la sesión
        await update({ activeRole: newRole });

        // Limpiar mensaje de éxito después de 2 segundos
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError('Error inesperado al cambiar el rol');
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  const currentAvatar = tempSelectedAvatar || selectedAvatar;

  // Función para obtener colores de rol
  const getRoleColors = (role: string, isActive: boolean) => {
    if (!isActive) {
      return 'bg-gray-200 text-gray-600 hover:bg-gray-300';
    }
    
    switch (role.toLowerCase()) {
      case 'evaluador':
        return 'bg-purple-500 text-white hover:bg-purple-600';
      case 'coordinador':
        return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'encargado':
        return 'bg-orange-500 text-white hover:bg-orange-600';
      case 'participante':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'admin':
        return 'bg-yellow-500 text-white hover:bg-yellow-600';
      default:
        return 'bg-gray-500 text-white hover:bg-gray-600';
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Botón Volver */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>

      {/* Mensajes de feedback */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      {/* Tarjeta principal centrada */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Avatar a la izquierda */}
            <div className="flex-shrink-0 flex justify-center lg:justify-start">
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

            {/* Información del usuario a la derecha */}
            <div className="flex-1 space-y-6 pt-8">
              {/* Nombre y email */}
              <div className="space-y-2">
                {/* Nombre con edición */}
                <div className="flex items-center gap-3">
                  {!isEditingName ? (
                    <>
                      <h2 className="text-3xl font-bold text-gray-900">{fullName}</h2>
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
                        className="text-3xl font-bold h-auto py-2"
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

              {/* Roles disponibles */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Roles Disponibles</h3>
                <div className="flex flex-wrap gap-2">
                  {session.user.availableRoles.map((role) => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${getRoleColors(role, role === session.user.activeRole)}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Grid de avatares al final de la tarjeta */}
          {showAvatarSelector && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Seleccionar Avatar</h3>
                <div className="grid grid-cols-10 gap-2">
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
                    className="flex-1"
                    disabled={!tempSelectedAvatar}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Guardar
                  </Button>
                  <Button
                    onClick={handleAvatarSelectorToggle}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
