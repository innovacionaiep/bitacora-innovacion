'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PREDEFINED_AVATARS, type PredefinedAvatar } from '@/lib/avatars';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, ArrowLeft, Check, X } from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { profile, updateProfile, loading: authLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<PredefinedAvatar | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Inicializar valores del perfil
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      
      // Buscar el avatar actual en la lista de avatares predefinidos
      if (profile.avatar_url) {
        const currentAvatar = PREDEFINED_AVATARS.find(avatar => avatar.url === profile.avatar_url);
        setSelectedAvatar(currentAvatar || null);
      }
    }
  }, [profile]);

  const handleAvatarSelect = (avatar: PredefinedAvatar) => {
    setSelectedAvatar(avatar);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Actualizar el perfil
      const { error } = await updateProfile({
        full_name: fullName.trim(),
        avatar_url: selectedAvatar?.url || undefined,
      });

      if (error) {
        setError(error.message || 'Error al actualizar el perfil');
      } else {
        setSuccess('Perfil actualizado correctamente');
      }
    } catch (err) {
      setError('Error inesperado al actualizar el perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/');
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
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="mb-4 p-0 h-auto text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="text-gray-600 mt-2">
            Actualiza tu información personal y selecciona tu avatar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Información del Perfil
            </CardTitle>
            <CardDescription>
              Mantén tu información actualizada para una mejor experiencia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email (readonly) */}
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                  className="bg-gray-50 text-gray-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  El email no se puede modificar
                </p>
              </div>

              {/* Nombre completo */}
              <div>
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Tu nombre completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Galería de Avatares */}
              <div>
                <Label>Seleccionar Avatar</Label>
                
                {/* Preview del avatar seleccionado */}
                <div className="mt-2 mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100">
                    {selectedAvatar ? (
                      <img
                        src={selectedAvatar.url}
                        alt={selectedAvatar.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedAvatar ? selectedAvatar.name : 'Ningún avatar seleccionado'}
                  </p>
                </div>

                {/* Grid de avatares */}
                <div className="grid grid-cols-5 gap-3">
                  {PREDEFINED_AVATARS.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      onClick={() => handleAvatarSelect(avatar)}
                      className={`relative w-16 h-16 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                        selectedAvatar?.id === avatar.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      <img
                        src={avatar.url}
                        alt={avatar.name}
                        className="w-full h-full object-cover"
                      />
                      {selectedAvatar?.id === avatar.id && (
                        <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                          <Check className="h-5 w-5 text-blue-600" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Haz clic en un avatar para seleccionarlo
                </p>
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

              {/* Botones */}
              <div className="flex space-x-4 pt-4">
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}