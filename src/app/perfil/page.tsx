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

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tu información personal y preferencias
        </p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjeta de Avatar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Avatar</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              {/* Avatar actual */}
              <div className="relative">
                <img
                  src={currentAvatar?.url || '/avatars/avatar-1.png'}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full border-4 border-gray-200"
                />
              </div>

              {/* Botón para cambiar avatar */}
              {!showAvatarSelector && (
                <Button onClick={handleAvatarSelectorToggle} variant="outline">
                  <Pencil className="h-4 w-4 mr-2" />
                  Cambiar Avatar
                </Button>
              )}

              {/* Selector de avatares */}
              {showAvatarSelector && (
                <div className="w-full space-y-4">
                  <div className="grid grid-cols-4 gap-3">
                    {PREDEFINED_AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => handleAvatarPreview(avatar)}
                        className={`relative rounded-full border-2 transition-all ${
                          tempSelectedAvatar?.id === avatar.id
                            ? 'border-blue-500 ring-2 ring-blue-300'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <img
                          src={avatar.url}
                          alt={avatar.name}
                          className="w-full h-full rounded-full"
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta de Información Personal */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Información Personal</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Email (solo lectura) */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Email
              </label>
              <Input value={session.user.email} disabled className="bg-gray-50" />
              <p className="text-xs text-gray-500 mt-1">
                El email no se puede modificar
              </p>
            </div>

            {/* Nombre completo */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Nombre Completo
              </label>
              {!isEditingName ? (
                <div className="flex items-center space-x-2">
                  <Input value={fullName} disabled className="bg-gray-50 flex-1" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNameEdit}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={tempFullName}
                    onChange={(e) => setTempFullName(e.target.value)}
                    placeholder="Tu nombre completo"
                  />
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleNameSave}
                      size="sm"
                      className="flex-1"
                      disabled={isLoadingName}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {isLoadingName ? 'Guardando...' : 'Guardar'}
                    </Button>
                    <Button
                      onClick={handleNameCancel}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={isLoadingName}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta de Roles */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Gestión de Roles</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Rol Activo
              </label>
              <Select
                value={session.user.activeRole || ''}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {session.user.availableRoles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                El rol activo determina tus permisos en la plataforma
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Roles Disponibles
              </label>
              <div className="flex flex-wrap gap-2">
                {session.user.availableRoles.map((role) => (
                  <span
                    key={role}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      role === session.user.activeRole
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {role}
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tienes acceso a {session.user.availableRoles.length} rol(es)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
