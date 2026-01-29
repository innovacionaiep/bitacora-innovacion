'use client';

import { useState } from 'react';
import { Compass } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiscoveryParticipants } from './DiscoveryParticipants';
import { DiscoveryProjects } from './DiscoveryProjects';
import { TrendingSection } from './TrendingSection';
import { RandomParticipant, RandomProject, MonthlyTrends } from '@/lib/actions/discovery';

type DiscoveryTab = 'personas' | 'proyectos';

interface DiscoverySidebarProps {
  initialParticipants?: RandomParticipant[];
  initialProjects?: RandomProject[];
  initialTrends?: MonthlyTrends | null;
}

export function DiscoverySidebar({
  initialParticipants = [],
  initialProjects = [],
  initialTrends = null,
}: DiscoverySidebarProps) {
  const [activeTab, setActiveTab] = useState<DiscoveryTab>('personas');

  return (
    <div className="space-y-6">
      {/* Sección de Descubrimientos con Tabs */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Compass className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-bold text-gray-900">Descubre</h2>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as DiscoveryTab)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-9 bg-gray-100">
            <TabsTrigger value="personas" className="text-sm">
              Personas
            </TabsTrigger>
            <TabsTrigger value="proyectos" className="text-sm">
              Proyectos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personas" className="mt-4">
            <DiscoveryParticipants initialParticipants={initialParticipants} />
          </TabsContent>

          <TabsContent value="proyectos" className="mt-4">
            <DiscoveryProjects initialProjects={initialProjects} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Separador principal */}
      <div className="border-t border-gray-200" />

      {/* Sección de Tendencias */}
      <TrendingSection initialTrends={initialTrends} />
    </div>
  );
}
