'use client';

import { useState } from 'react';
import { RefreshCw, User, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  getRandomParticipants,
  RandomParticipant,
} from '@/lib/actions/discovery';
import { cn } from '@/lib/utils';

interface DiscoveryParticipantsProps {
  initialParticipants?: RandomParticipant[];
}

export function DiscoveryParticipants({
  initialParticipants = [],
}: DiscoveryParticipantsProps) {
  // Usar datos iniciales directamente - sin carga en useEffect
  const [participants, setParticipants] =
    useState<RandomParticipant[]>(initialParticipants);
  const [loading, setLoading] = useState(false); // No loading si hay datos iniciales
  const [refreshing, setRefreshing] = useState(false);

  const loadParticipants = async () => {
    // forceRefresh: true para obtener datos frescos sin caché
    const result = await getRandomParticipants(4, true);
    if (result.success && result.data) {
      setParticipants(result.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  // NO useEffect para carga inicial - los datos vienen del servidor

  const handleRefresh = () => {
    setRefreshing(true);
    loadParticipants();
  };

  const getInitials = (name: string | null): string => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRolColor = (rol: string): string => {
    const colors: Record<string, string> = {
      Encargado: 'bg-purple-100 text-purple-700',
      Coordinador: 'bg-blue-100 text-blue-700',
      Colaborador: 'bg-green-100 text-green-700',
      Docente: 'bg-amber-100 text-amber-700',
      Estudiante: 'bg-cyan-100 text-cyan-700',
      Beneficiario: 'bg-rose-100 text-rose-700',
    };
    return colors[rol] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-24 mb-1" />
              <div className="h-3 bg-gray-100 rounded w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="text-center py-4">
        <User className="h-8 w-8 mx-auto text-gray-300 mb-2" />
        <p className="text-xs text-muted-foreground">
          No hay participantes para mostrar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5 mr-1', refreshing && 'animate-spin')}
          />
          Actualizar
        </Button>
      </div>

      <div className="space-y-2">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <Avatar className="h-10 w-10 border border-gray-200">
              <AvatarImage src={participant.image || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                {getInitials(participant.nombre)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {participant.nombre || 'Usuario'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-medium',
                    getRolColor(participant.rol)
                  )}
                >
                  {participant.rol}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {participant.proyecto.nombre}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
