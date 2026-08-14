'use client';

import { useState } from 'react';
import { verifyNovedadesPassword } from '@/lib/actions/novedades-auth';
import { AdminChatPanel } from '@/components/support-chat/AdminChatPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

/**
 * Misma contraseña que Novedades (bitacora).
 * Al verificar, muestra el panel de chat de soporte.
 */
export function SoportePasswordGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  usePageTopLoader(loading);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await verifyNovedadesPassword(password);
    setLoading(false);
    if (!result.success) {
      if (result.error === 'Contraseña incorrecta') {
        setError('Contraseña incorrecta');
      } else if (result.error === 'Sin permisos') {
        setError('No tienes permisos para acceder al chat de soporte.');
      } else {
        setError('No se pudo verificar. Intenta de nuevo.');
      }
      return;
    }
    setUnlocked(true);
  }

  if (unlocked) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gray-100 p-4">
        <AdminChatPanel />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 items-center justify-center overflow-hidden bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-lg border border-gray-200 p-8">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-gray-100 p-4">
            <Lock className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-center text-gray-900 mb-1">
          Acceso al chat de soporte
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Introduce la contraseña para administrar los chats
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="soporte-password">Contraseña</Label>
            <Input
              id="soporte-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Contraseña"
              className="w-full"
              autoFocus
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Verificando…' : 'Acceder'}
          </Button>
        </form>
      </div>
    </div>
  );
}
