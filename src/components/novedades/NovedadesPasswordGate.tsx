'use client';

import { useState } from 'react';
import { verifyNovedadesPassword } from '@/lib/actions/novedades-auth';
import { getNovedadesPageData } from '@/lib/actions/novedades-data';
import { NovedadesPageWrapper } from '@/components/novedades/NovedadesPageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';
import { usePageTopLoader } from '@/hooks/usePageTopLoader';

export function NovedadesPasswordGate() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageData, setPageData] = useState<Awaited<ReturnType<typeof getNovedadesPageData>> | null>(null);

  usePageTopLoader(loading);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await verifyNovedadesPassword(password);
    if (!result.success) {
      setLoading(false);
      setError(result.error === 'Contraseña incorrecta' ? 'Contraseña incorrecta' : 'No se pudo verificar. Intenta de nuevo.');
      return;
    }
    const dataResult = await getNovedadesPageData();
    setLoading(false);
    if (!dataResult.success) {
      setError(dataResult.error ?? 'Error al cargar la página');
      return;
    }
    setPageData({ success: true, data: dataResult.data });
  }

  if (pageData?.success && pageData.data) {
    return (
      <NovedadesPageWrapper
        initialPosts={pageData.data.initialPosts}
        initialHasMore={pageData.data.initialHasMore}
        initialCursor={pageData.data.initialCursor}
        initialEventos={pageData.data.initialEventos}
        initialProjects={pageData.data.initialProjects}
        initialTrends={pageData.data.initialTrends}
        initialProyectosParaFiltro={pageData.data.initialProyectosParaFiltro}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-lg border border-gray-200 p-8">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-gray-100 p-4">
            <Lock className="h-8 w-8 text-gray-600" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-center text-gray-900 mb-1">
          Acceso a Novedades
        </h1>
        <p className="text-sm text-center text-gray-500 mb-6">
          Introduce la contraseña para ver esta sección
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="novedades-password">Contraseña</Label>
            <Input
              id="novedades-password"
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
