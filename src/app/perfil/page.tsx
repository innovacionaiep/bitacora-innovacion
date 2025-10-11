'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PREDEFINED_AVATARS, type PredefinedAvatar } from '@/lib/avatars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowLeft, Check, X, Pencil } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, updateProfile, loading: authLoading } = useAuth();

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
    if (profile) {
      setFullName(profile.full_name || '');
      setTempFullName(profile.full_name || '');
      
      // Buscar el avatar actual en la lista de avatares predefinidos
      if (profile.avatar_url) {
        const currentAvatar = PREDEFINED_AVATARS.find(avatar => avatar.url === profile.avatar_url);
        setSelectedAvatar(currentAvatar || null);
      }
    }
  }, [profile]);

  const handleAvatarChange = async (avatar: PredefinedAvatar) => {
    setError('');
    setSuccess('');

    try {
      const { error } = await updateProfile({
        avatar_url: avatar.url,
      });

      if (error) {
        setError(error.message || 'Error al actualizar el avatar');
      } else {
        setSelectedAvatar(avatar);
        setShowAvatarSelector(false);
        setTempSelectedAvatar(null);
        setSuccess('Avatar actualizado correctamente');
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

  const handleAvatarCancel = () => {
    setTempSelectedAvatar(selectedAvatar);
    setShowAvatarSelector(false);
  };


  const handleCancel = () => {
    router.push('/');
  };

  const handleNameEditStart = () => {
    setTempFullName(fullName);
    setIsEditingName(true);
  };

  const handleNameEditCancel = () => {
    setTempFullName(fullName);
    setIsEditingName(false);
  };

  const handleNameSave = async () => {
    if (tempFullName.trim() === fullName) {
      setIsEditingName(false);
      return;
    }

    setIsLoadingName(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await updateProfile({
        full_name: tempFullName.trim(),
      });

      if (error) {
        setError(error.message || 'Error al actualizar el nombre');
      } else {
        setFullName(tempFullName.trim());
        setIsEditingName(false);
        setSuccess('Nombre actualizado correctamente');
        // Limpiar mensaje de éxito después de 2 segundos
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError('Error inesperado al actualizar el nombre');
    } finally {
      setIsLoadingName(false);
    }
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-muted-foreground">No se pudo cargar el perfil</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="mb-4 p-0 h-auto text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al dashboard
        </Button>
      </div>

      <div className="flex justify-center">
        <div className="max-w-4xl w-full">

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-gray-500 mb-6">
              <User className="h-5 w-5 mr-2 text-gray-500" />
              Información del Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Sección superior: Avatar y nombre */}
            <div className="flex items-start space-x-6">
              {/* Avatar actual grande */}
              <div className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={handleAvatarSelectorToggle}
                  className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-gray-200 bg-gray-100 group transition-all hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  {tempSelectedAvatar ? (
                    <img
                      src={tempSelectedAvatar.url}
                      alt={tempSelectedAvatar.name}
                      className="w-full h-full object-cover"
                    />
                  ) : selectedAvatar ? (
                    <img
                      src={selectedAvatar.url}
                      alt={selectedAvatar.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <User className="h-16 w-16" />
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 rounded-full pointer-events-none transition-all duration-200">
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 rounded-full transition-colors duration-200"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-white text-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Pencil className="h-8 w-8 mx-auto mb-1" />
                        <span className="text-sm font-medium">Cambiar avatar</span>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              
              {/* Información del usuario */}
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {isEditingName ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="text"
                        placeholder="Tu nombre completo"
                        value={tempFullName}
                        onChange={(e) => setTempFullName(e.target.value)}
                        disabled={isLoadingName}
                        className="text-3xl font-bold h-auto py-2 border-gray-300"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        onClick={handleNameSave}
                        disabled={isLoadingName}
                        className="h-8"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleNameEditCancel}
                        disabled={isLoadingName}
                        className="h-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-3xl font-bold text-gray-900">
                        {fullName || 'Sin nombre'}
                      </h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleNameEditStart}
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-gray-600 text-lg">
                  {profile?.email}
                </p>
              </div>
            </div>

            {/* Mensajes de estado */}
            {error && (
              <div className="flex items-center p-3 text-sm text-red-600 bg-red-50 rounded-md">
                <X className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center p-3 text-sm text-green-600 bg-green-50 rounded-md">
                <Check className="h-4 w-4 mr-2" />
                {success}
              </div>
            )}

            {/* Sección de avatares disponibles */}
            {showAvatarSelector && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Seleccionar Avatar
                </h3>
                <div className="grid grid-cols-10 gap-3 mb-6">
                  {PREDEFINED_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => handleAvatarPreview(avatar)}
                      className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                        tempSelectedAvatar?.id === avatar.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                      />
                      {tempSelectedAvatar?.id === avatar.id && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <Check className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                
                {/* Botones de acción */}
                <div className="flex justify-end space-x-3">
                  <Button
                    variant="outline"
                    onClick={handleAvatarCancel}
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleAvatarSave}
                    disabled={!tempSelectedAvatar || tempSelectedAvatar.id === selectedAvatar?.id}
                  >
                    Guardar Avatar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}