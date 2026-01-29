'use client';

import { useState } from 'react';
import { TrendingUp, Loader2, FolderKanban, GraduationCap, MapPin, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MonthlyTrends, TrendingItem, TrendingSede } from '@/lib/actions/discovery';
import { cn } from '@/lib/utils';

type TrendingTab = 'proyectos' | 'escuelas' | 'sedes' | 'personas';

interface TrendingSectionProps {
  initialTrends?: MonthlyTrends | null;
}

export function TrendingSection({ initialTrends = null }: TrendingSectionProps) {
  // Usar datos iniciales directamente - sin carga en useEffect
  const [trends, setTrends] = useState<MonthlyTrends | null>(initialTrends);
  const [loading, setLoading] = useState(false); // No loading si hay datos iniciales
  const [activeTab, setActiveTab] = useState<TrendingTab>('proyectos');

  // NO useEffect para carga inicial - los datos vienen del servidor

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRankingColor = (position: number): string => {
    if (position === 0) return 'text-amber-500 font-bold';
    if (position === 1) return 'text-gray-400 font-semibold';
    if (position === 2) return 'text-amber-700 font-semibold';
    return 'text-gray-500';
  };

  const renderTrendingItem = (
    item: TrendingItem | TrendingSede,
    index: number,
    type: TrendingTab
  ) => {
    const isSede = type === 'sedes';
    const isPersona = type === 'personas';
    const nombre = isSede ? (item as TrendingSede).sede : (item as TrendingItem).nombre;
    const image = isPersona ? (item as TrendingItem).image : null;

    return (
      <div
        key={isSede ? (item as TrendingSede).sede : (item as TrendingItem).id}
        className="flex items-center gap-3 py-2 hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer"
      >
        {/* Posición */}
        <span
          className={cn(
            'w-5 text-sm tabular-nums',
            getRankingColor(index)
          )}
        >
          {index + 1}
        </span>

        {/* Avatar para personas */}
        {isPersona && (
          <Avatar className="h-8 w-8 border border-gray-200">
            <AvatarImage src={image || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
              {getInitials(nombre)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Icono para otros tipos */}
        {!isPersona && (
          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            {type === 'proyectos' && <FolderKanban className="h-4 w-4 text-emerald-600" />}
            {type === 'escuelas' && <GraduationCap className="h-4 w-4 text-blue-600" />}
            {type === 'sedes' && <MapPin className="h-4 w-4 text-purple-600" />}
          </div>
        )}

        {/* Nombre y contador */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {nombre}
          </p>
          <p className="text-xs text-muted-foreground">
            {item.postCount} {item.postCount === 1 ? 'publicación' : 'publicaciones'}
          </p>
        </div>
      </div>
    );
  };

  const renderEmptyState = (type: TrendingTab) => {
    const icons: Record<TrendingTab, React.ReactNode> = {
      proyectos: <FolderKanban className="h-6 w-6 text-gray-300" />,
      escuelas: <GraduationCap className="h-6 w-6 text-gray-300" />,
      sedes: <MapPin className="h-6 w-6 text-gray-300" />,
      personas: <User className="h-6 w-6 text-gray-300" />,
    };

    return (
      <div className="text-center py-6">
        {icons[type]}
        <p className="text-xs text-muted-foreground mt-2">
          Sin datos este mes
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!trends) {
    return (
      <div className="text-center py-6">
        <TrendingUp className="h-6 w-6 mx-auto text-gray-300 mb-2" />
        <p className="text-xs text-muted-foreground">
          No se pudieron cargar las tendencias
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-orange-600" />
        <h3 className="text-sm font-semibold text-gray-900">Tendencias del mes</h3>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TrendingTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 h-8 bg-gray-100">
          <TabsTrigger value="proyectos" className="text-xs px-1 py-1">
            Proyectos
          </TabsTrigger>
          <TabsTrigger value="escuelas" className="text-xs px-1 py-1">
            Escuelas
          </TabsTrigger>
          <TabsTrigger value="sedes" className="text-xs px-1 py-1">
            Sedes
          </TabsTrigger>
          <TabsTrigger value="personas" className="text-xs px-1 py-1">
            Personas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proyectos" className="mt-3">
          {trends.proyectos.length > 0 ? (
            <div className="space-y-1">
              {trends.proyectos.map((item, index) =>
                renderTrendingItem(item, index, 'proyectos')
              )}
            </div>
          ) : (
            renderEmptyState('proyectos')
          )}
        </TabsContent>

        <TabsContent value="escuelas" className="mt-3">
          {trends.escuelas.length > 0 ? (
            <div className="space-y-1">
              {trends.escuelas.map((item, index) =>
                renderTrendingItem(item, index, 'escuelas')
              )}
            </div>
          ) : (
            renderEmptyState('escuelas')
          )}
        </TabsContent>

        <TabsContent value="sedes" className="mt-3">
          {trends.sedes.length > 0 ? (
            <div className="space-y-1">
              {trends.sedes.map((item, index) =>
                renderTrendingItem(item, index, 'sedes')
              )}
            </div>
          ) : (
            renderEmptyState('sedes')
          )}
        </TabsContent>

        <TabsContent value="personas" className="mt-3">
          {trends.personas.length > 0 ? (
            <div className="space-y-1">
              {trends.personas.map((item, index) =>
                renderTrendingItem(item, index, 'personas')
              )}
            </div>
          ) : (
            renderEmptyState('personas')
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
