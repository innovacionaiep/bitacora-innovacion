'use client';

import { useState } from 'react';
import { Compass, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscoveryProjects } from './DiscoveryProjects';
import { TrendingSection } from './TrendingSection';
import { RandomProject, MonthlyTrends, getRandomProjects } from '@/lib/actions/discovery';
import { cn } from '@/lib/utils';

interface DiscoverySidebarProps {
  initialProjects?: RandomProject[];
  initialTrends?: MonthlyTrends | null;
}

export function DiscoverySidebar({
  initialProjects = [],
  initialTrends = null,
}: DiscoverySidebarProps) {
  const [projects, setProjects] = useState<RandomProject[]>(initialProjects);
  const [refreshing, setRefreshing] = useState(false);

  const loadProjects = async () => {
    setRefreshing(true);
    const result = await getRandomProjects(6, true);
    if (result.success && result.data) {
      setProjects(result.data);
    }
    setRefreshing(false);
  };

  return (
    <div className="space-y-6">
      {/* Sección Descubre proyectos */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Compass className="h-[18px] w-[18px] text-emerald-600 shrink-0" />
            <h2 className="text-[18px] font-semibold text-emerald-600">Descubre proyectos</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadProjects}
            disabled={refreshing}
            className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <RefreshCw
              className={cn('h-3.5 w-3.5 mr-1', refreshing && 'animate-spin')}
            />
            Actualizar
          </Button>
        </div>

        <DiscoveryProjects projects={projects} />
      </div>

      {/* Separador principal */}
      <div className="border-t border-gray-200" />

      {/* Sección de Tendencias */}
      <TrendingSection initialTrends={initialTrends} />
    </div>
  );
}
