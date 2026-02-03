'use client';

import { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { NovedadesContent } from './NovedadesContent';
import { EventosWall } from './EventosWall';
import { EventoDetallesModal } from './EventoDetallesModal';
import {
  ConvocatoriasWall,
  type ConvocatoriaPlaceholder,
} from './ConvocatoriasWall';
import {
  ConvocatoriaDetallesModal,
  type ConvocatoriaSavedData,
} from './ConvocatoriaDetallesModal';
import { DiscoverySidebar } from './DiscoverySidebar';
import { PostWithRelations } from '@/lib/actions/posts';
import {
  RandomProject,
  MonthlyTrends,
  getMonthlyTrends,
} from '@/lib/actions/discovery';
import { Separator } from '@/components/ui/separator';

const CONVOCATORIAS_INITIAL: ConvocatoriaPlaceholder[] = [
  {
    id: 'conv-1',
    titulo: 'Beca de innovación 2025',
    fechaInicio: new Date('2025-02-01'),
    fechaFin: new Date('2025-03-15'),
    imagenUrl: null,
  },
  {
    id: 'conv-2',
    titulo: 'Convocatoria proyectos sustentables',
    fechaInicio: new Date('2025-02-10'),
    fechaFin: new Date('2025-04-30'),
    imagenUrl: null,
  },
];

interface ProyectoParaFiltro {
  id: string;
  proyecto: string;
}

interface NovedadesPageWrapperProps {
  initialPosts?: PostWithRelations[];
  initialHasMore?: boolean;
  initialCursor?: string;
  initialEventos?: PostWithRelations[];
  initialProjects?: RandomProject[];
  initialTrends?: MonthlyTrends | null;
  initialProyectosParaFiltro?: ProyectoParaFiltro[];
}

export function NovedadesPageWrapper({
  initialPosts = [],
  initialHasMore = true,
  initialCursor,
  initialEventos = [],
  initialProjects = [],
  initialTrends = null,
  initialProyectosParaFiltro = [],
}: NovedadesPageWrapperProps) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.activeRole === 'Admin';

  const [eventosKey, setEventosKey] = useState(0);
  const [attendanceKey, setAttendanceKey] = useState(0);
  const [eventoModalOpen, setEventoModalOpen] = useState(false);
  const [selectedEventoId, setSelectedEventoId] = useState<string | null>(null);
  const [trends, setTrends] = useState<MonthlyTrends | null>(
    initialTrends ?? null
  );

  const [convocatorias, setConvocatorias] = useState<ConvocatoriaPlaceholder[]>(
    CONVOCATORIAS_INITIAL
  );
  const [convocatoriaModalOpen, setConvocatoriaModalOpen] = useState(false);
  const [selectedConvocatoriaId, setSelectedConvocatoriaId] = useState<
    string | null
  >(null);
  const selectedConvocatoria = useMemo(
    () => convocatorias.find((c) => c.id === selectedConvocatoriaId) ?? null,
    [convocatorias, selectedConvocatoriaId]
  );

  const handlePostCreated = (post: PostWithRelations) => {
    // Si el post es un evento, recargar el muro de eventos
    if (post.eventoFecha && post.eventoNombre && post.eventoDescripcion) {
      setEventosKey((prev) => prev + 1);
    }
    // Actualizar tendencias del mes (caché ya invalidada por createPost con revalidateTag('posts'))
    getMonthlyTrends().then((r) => {
      if (r.success && r.data) setTrends(r.data);
    });
  };

  const handlePostDeleted = () => {
    getMonthlyTrends().then((r) => {
      if (r.success && r.data) setTrends(r.data);
    });
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

  const handlePostular = (convId: string) => {
    setSelectedConvocatoriaId(convId);
    setConvocatoriaModalOpen(true);
  };

  const handleConvocatoriaCreate = () => {
    setSelectedConvocatoriaId(null);
    setConvocatoriaModalOpen(true);
  };

  const handleConvocatoriaModalClose = (open: boolean) => {
    setConvocatoriaModalOpen(open);
    // No limpiar selectedConvocatoriaId al cerrar: evita flash del form de edición
    // (convocatoria=null durante animación de cierre → isViewMode false → se ve el form).
    // Se limpia solo al abrir "Nueva convocatoria" (handleConvocatoriaCreate).
  };

  const handleConvocatoriaSaved = (data: ConvocatoriaSavedData) => {
    if (data.id) {
      setConvocatorias((prev) =>
        prev.map((c) =>
          c.id !== data.id
            ? c
            : {
                ...c,
                titulo: data.titulo,
                fechaInicio: data.fechaInicio,
                fechaFin: data.fechaFin,
                descripcion: data.descripcion,
                imagenUrl: data.imagenUrl ?? null,
              }
        )
      );
    } else {
      setConvocatorias((prev) => [
        ...prev,
        {
          id: `conv-${Date.now()}`,
          titulo: data.titulo,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          descripcion: data.descripcion,
          imagenUrl: data.imagenUrl ?? null,
        },
      ]);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto scrollbar-gray">
      <div className="flex min-h-full">
        {/* Sidebar izquierda: sticky */}
        <div className="flex-shrink-0 w-[480px]">
          <div className="sticky top-0 h-screen bg-gray-100 border-r border-gray-200 px-8 pt-6 pb-6">
            <div className="flex flex-col h-full">
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Novedades</h1>
                <p className="text-muted-foreground mt-1">
                  Descubre las últimas actualizaciones de los proyectos
                </p>
                <Separator className="mt-4" />
              </div>

              {/* Muro de eventos y convocatorias */}
              <div className="flex-1 min-h-0 overflow-y-auto mt-2 pr-1 custom-scrollbar">
                <EventosWall
                  initialEventos={initialEventos}
                  refreshTrigger={eventosKey}
                  onOpenEvento={handleOpenEvento}
                  onAttendanceChanged={handleAttendanceChanged}
                />
                <ConvocatoriasWall
                  convocatorias={convocatorias}
                  isAdmin={!!isAdmin}
                  onPostular={handlePostular}
                  onCreate={handleConvocatoriaCreate}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Columna del feed central */}
        <div className="flex-1 bg-white pt-6 pb-6">
          <div className="w-full px-8 mx-auto" style={{ maxWidth: '743px' }}>
            <NovedadesContent
              initialPosts={initialPosts}
              initialHasMore={initialHasMore}
              initialCursor={initialCursor}
              initialProyectosParaFiltro={initialProyectosParaFiltro}
              onPostCreated={handlePostCreated}
              onPostDeleted={handlePostDeleted}
              onOpenEvento={handleOpenEvento}
              refreshTrigger={attendanceKey}
              onAttendanceChanged={handleAttendanceChanged}
            />
          </div>
        </div>

        {/* Sidebar derecha: sticky */}
        <div className="flex-shrink-0 w-[480px]">
          <div className="sticky top-0 h-screen bg-gray-100 border-l border-gray-200 px-8 py-6">
            <DiscoverySidebar
              initialProjects={initialProjects}
              initialTrends={trends}
            />
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

      <ConvocatoriaDetallesModal
        open={convocatoriaModalOpen}
        onOpenChange={handleConvocatoriaModalClose}
        convocatoriaId={selectedConvocatoriaId}
        convocatoria={selectedConvocatoria}
        isAdmin={!!isAdmin}
        onSaved={handleConvocatoriaSaved}
      />
    </div>
  );
}
