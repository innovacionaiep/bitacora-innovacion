'use client';

import { useState } from 'react';
import { NovedadesContent } from './NovedadesContent';
import { EventosWall } from './EventosWall';
import { EventoDetallesModal } from './EventoDetallesModal';
import { DiscoverySidebar } from './DiscoverySidebar';
import { PostWithRelations } from '@/lib/actions/posts';

interface NovedadesPageWrapperProps {
  initialPosts?: PostWithRelations[];
  initialHasMore?: boolean;
  initialCursor?: string;
}

export function NovedadesPageWrapper({
  initialPosts = [],
  initialHasMore = true,
  initialCursor,
}: NovedadesPageWrapperProps) {
  const [eventosKey, setEventosKey] = useState(0);
  const [attendanceKey, setAttendanceKey] = useState(0);
  const [eventoModalOpen, setEventoModalOpen] = useState(false);
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null);

  const handlePostCreated = (post: PostWithRelations) => {
    // Si el post es un evento, recargar el muro de eventos
    if (post.eventoFecha && post.eventoNombre && post.eventoDescripcion) {
      setEventosKey((prev) => prev + 1);
    }
  };

  const handleOpenEvento = (postId: string) => {
    setSelectedEventoId(postId);
    setEventoModalOpen(true);
  };

  const handleAttendanceChanged = () => {
    setAttendanceKey((prev) => prev + 1);
    // también fuerza recarga del muro (por conteo)
    setEventosKey((prev) => prev + 1);
  };

  return (
    <div className="h-full w-full overflow-y-auto scrollbar-gray">
      <div className="flex min-h-full">
        {/* Sidebar izquierda: sticky */}
        <div className="flex-shrink-0 w-[500px]">
          <div className="sticky top-0 h-screen bg-gray-100 border-r border-gray-200 px-8 pt-6 pb-6">
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Novedades</h1>
                <p className="text-muted-foreground mt-1">
                  Descubre las últimas actualizaciones de los proyectos
                </p>
              </div>
              
              {/* Muro de eventos */}
              <div className="flex-1 overflow-hidden">
                <EventosWall
                  refreshTrigger={eventosKey}
                  onOpenEvento={handleOpenEvento}
                  onAttendanceChanged={handleAttendanceChanged}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columna del feed central */}
        <div className="flex-1 bg-white pt-6 pb-6">
          <div 
            className="w-full px-8 mx-auto"
            style={{ maxWidth: '743px' }}
          >
            <NovedadesContent
              initialPosts={initialPosts}
              initialHasMore={initialHasMore}
              initialCursor={initialCursor}
              onPostCreated={handlePostCreated}
              onOpenEvento={handleOpenEvento}
              refreshTrigger={attendanceKey}
              onAttendanceChanged={handleAttendanceChanged}
            />
          </div>
        </div>

        {/* Sidebar derecha: sticky */}
        <div className="flex-shrink-0 w-[480px]">
          <div className="sticky top-0 h-screen bg-white border-l border-gray-200 p-6">
            <DiscoverySidebar />
          </div>
        </div>
      </div>

      <EventoDetallesModal
        open={eventoModalOpen}
        onOpenChange={(open) => {
          setEventoModalOpen(open);
          if (!open) setSelectedEventoId(null);
        }}
        postId={selectedEventoId}
        onAttendanceChanged={handleAttendanceChanged}
      />
    </div>
  );
}
