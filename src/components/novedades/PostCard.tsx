'use client';

import { useState } from 'react';
import { MessageCircle, MoreHorizontal, Trash2, FolderKanban, MapPin, GraduationCap, ThumbsUp, PartyPopper, Heart, Calendar as CalendarIcon, Users, X as XIcon } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ReactionButton } from './ReactionButton';
import { CommentSection } from './CommentSection';
import { PostWithRelations, setPostReaction, deletePost, toggleEventoAsistencia, type PostReactionType } from '@/lib/actions/posts';
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: PostWithRelations;
  onPostDeleted?: (postId: string) => void;
  onOpenEvento?: (postId: string) => void;
  onAttendanceChanged?: () => void;
}

export function PostCard({ post, onPostDeleted, onOpenEvento, onAttendanceChanged }: PostCardProps) {
  const { data: session } = useSession();
  const defaultCounts = { Recomendar: 0, Celebrar: 0, Encantar: 0 };
  const [reactionCounts, setReactionCounts] = useState<{
    Recomendar: number;
    Celebrar: number;
    Encantar: number;
  }>(post.reactionCounts ?? defaultCounts);
  const [reactionsCount, setReactionsCount] = useState(post._count.likes);
  const [userReaction, setUserReaction] = useState<PostReactionType | null>(
    post.userReactionType ?? null
  );
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(post._count.comentarios);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [hoveredPopover, setHoveredPopover] = useState<string | null>(null);

  const isAuthor = session?.user?.id === post.authorId;
  const authorName = post.author.name || post.author.email.split('@')[0];
  const authorInitials = authorName.slice(0, 2).toUpperCase();
  
  // Detectar si es un evento
  const isEvento = !!(post.eventoFecha && post.eventoNombre && post.eventoDescripcion);

  const [asistiendoEvento, setAsistiendoEvento] = useState<boolean>(post.isAsistiendo ?? false);
  const [asistentesEventoCount, setAsistentesEventoCount] = useState<number>(post.asistentesCount ?? 0);
  
  // Formatear fecha del evento
  const formatEventDate = (date: Date | null): string => {
    if (!date) return '';
    const fechaEvento = new Date(date);
    if (isToday(fechaEvento)) return 'Hoy';
    if (isTomorrow(fechaEvento)) return 'Mañana';
    return format(fechaEvento, 'd MMM yyyy', { locale: es });
  };

  const handleToggleAsistenciaEvento = async () => {
    const prevIs = asistiendoEvento;
    const prevCount = asistentesEventoCount;
    const nextIs = !prevIs;
    setAsistiendoEvento(nextIs);
    setAsistentesEventoCount(Math.max(0, prevCount + (nextIs ? 1 : -1)));

    const result = await toggleEventoAsistencia(post.id);
    if (!result.success || !result.data) {
      setAsistiendoEvento(prevIs);
      setAsistentesEventoCount(prevCount);
      return;
    }
    setAsistiendoEvento(result.data.isAsistiendo);
    setAsistentesEventoCount(result.data.asistentesCount);
    onAttendanceChanged?.();
  };

  const handleSetReaction = async (type: PostReactionType) => {
    const hadReaction = !!userReaction;
    const sameReaction = userReaction === type;
    const prevReaction = userReaction;
    const prevCount = reactionsCount;
    const prevCounts = { ...reactionCounts };

    if (sameReaction) {
      setUserReaction(null);
      setReactionsCount((c) => Math.max(0, c - 1));
      setReactionCounts((rc) => ({
        ...rc,
        [type]: Math.max(0, (rc[type] ?? 0) - 1),
      }));
    } else {
      setUserReaction(type);
      setReactionsCount((c) => (hadReaction ? c : c + 1));
      setReactionCounts((rc) => {
        const next = { ...rc };
        if (hadReaction && prevReaction) next[prevReaction] = Math.max(0, (next[prevReaction] ?? 0) - 1);
        next[type] = (next[type] ?? 0) + 1;
        return next;
      });
    }

    const result = await setPostReaction(post.id, type);
    if (!result.success) {
      setUserReaction(prevReaction);
      setReactionsCount(prevCount);
      setReactionCounts(prevCounts);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    
    if (!confirm('¿Estás seguro de eliminar esta publicación?')) return;

    setIsDeleting(true);
    const result = await deletePost(post.id);
    
    if (result.success) {
      onPostDeleted?.(post.id);
    }
    setIsDeleting(false);
  };

  // Determinar layout de imágenes
  // Si es un evento, las imágenes se muestran dentro del badge del evento
  const imageCount = isEvento ? 0 : post.imagenes.length;
  const getImageGridClass = () => {
    if (imageCount === 1) return 'grid-cols-1';
    if (imageCount === 2) return 'grid-cols-2';
    if (imageCount === 3) return 'grid-cols-2';
    return 'grid-cols-2';
  };

  // Función helper para truncar texto a 30 caracteres
  const truncateText = (text: string, maxLength: number = 30): string => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // Color de texto por rol (sin fondo ni borde) - Ver docs/SISTEMA-ROLES.md
  const getRoleTextClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'text-yellow-600';
      case 'coordinador':
        return 'text-blue-600';
      case 'colaborador':
        return 'text-violet-600';
      case 'encargado':
        return 'text-orange-600';
      case 'docente':
        return 'text-green-600';
      case 'estudiante':
        return 'text-red-600';
      case 'beneficiario':
        return 'text-cyan-600';
      default:
        return 'text-gray-600';
    }
  };

  // Procesar proyectos, sedes y escuelas para visualización optimizada
  const procesarProyectos = () => {
    const proyectos = post.proyectos.map(({ proyecto }) => proyecto);
    
    // Proyectos: mostrar máximo 2
    const proyectosMostrar = proyectos.slice(0, 2);
    const proyectosRestantes = proyectos.slice(2);
    
    // Sedes únicas: mostrar máximo 4
    const sedesUnicas = Array.from(new Set(proyectos.map(p => p.sede)));
    const sedesMostrar = sedesUnicas.slice(0, 4);
    const sedesRestantes = sedesUnicas.slice(4);
    
    // Escuelas únicas: mostrar máximo 2
    const escuelasUnicas = Array.from(
      new Set(
        proyectos
          .flatMap(p => p.escuelas?.map(e => e.escuela.nombre) || [])
          .filter(Boolean)
      )
    );
    const escuelasMostrar = escuelasUnicas.slice(0, 2);
    const escuelasRestantes = escuelasUnicas.slice(2);
    
    return {
      proyectosMostrar,
      proyectosRestantes,
      sedesMostrar,
      sedesRestantes,
      escuelasMostrar,
      escuelasRestantes,
    };
  };

  return (
    <div className="relative">
      {/* Tarjeta del post - mantiene su ancho completo */}
      <Card className="overflow-hidden shadow-lg hover:shadow-lg">
        <CardContent className="px-4 pt-4 pb-2">
          {/* Header del post */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.image || undefined} />
                <AvatarFallback>{authorInitials}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{authorName}</p>
                  {post.authorRoleAtPost && (
                    <span
                      className={`text-xs font-medium shrink-0 ${getRoleTextClass(post.authorRoleAtPost)}`}
                    >
                      #{post.authorRoleAtPost}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
            </div>

            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {isDeleting ? 'Eliminando...' : 'Eliminar publicación'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Contenido del post */}
          <div className="mb-2">
            <p className="text-sm whitespace-pre-wrap break-words">{post.contenido}</p>
          </div>

          {/* Información del evento */}
          {isEvento && post.eventoFecha && post.eventoNombre && (
            <div
              className="mb-3 p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-50/70 transition-colors"
              onClick={() => onOpenEvento?.(post.id)}
              role="button"
            >
              <div className="flex items-start gap-3">
                <CalendarIcon className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-orange-700 uppercase tracking-wide">
                      Evento
                    </span>
                    <span className="text-xs text-orange-600 font-medium">
                      {formatEventDate(post.eventoFecha)}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-1">
                    {post.eventoNombre}
                  </h4>
                  {post.eventoDescripcion && (
                    <p className="text-xs text-gray-700 line-clamp-2">
                      {post.eventoDescripcion}
                    </p>
                  )}

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-orange-700">
                      <Users className="h-3.5 w-3.5" />
                      <span>{asistentesEventoCount}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={asistiendoEvento ? 'default' : 'outline'}
                        size="sm"
                        disabled={asistiendoEvento}
                        className={cn(
                          'h-8 px-2.5',
                          asistiendoEvento && 'bg-emerald-600 hover:bg-emerald-600 cursor-not-allowed'
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!asistiendoEvento) {
                            handleToggleAsistenciaEvento();
                          }
                        }}
                      >
                        Asistiré
                      </Button>
                      {asistiendoEvento && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleAsistenciaEvento();
                              }}
                              className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-red-50 transition-colors"
                            >
                              <XIcon className="h-4 w-4 text-red-600" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent variant="light" sideOffset={6}>
                            Cancelar asistencia
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
                {/* Imagen del evento - pequeña a la derecha */}
                {post.imagenes && post.imagenes.length > 0 && (
                  <div className="shrink-0">
                    {post.imagenes.slice(0, 1).map((imagen) => (
                      <div
                        key={imagen.id}
                        className="relative w-32 h-20 rounded-lg overflow-hidden bg-muted cursor-pointer border border-orange-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImageIndex(post.imagenes.findIndex(img => img.id === imagen.id));
                        }}
                      >
                        <Image
                          src={imagen.url}
                          alt={post.eventoNombre || 'Imagen del evento'}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Videos de YouTube */}
          {post.videos && post.videos.length > 0 && (
            <div className="space-y-2 mb-2">
              {post.videos.map((v) => (
                <div
                  key={v.id}
                  className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted"
                >
                  <iframe
                    src={`https://www.youtube.com/embed/${v.youtubeVideoId}`}
                    title="Video de YouTube"
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ))}
            </div>
          )}

          {/* Imágenes */}
          {imageCount > 0 && (
            <div className={`grid ${getImageGridClass()} gap-1 mb-2 rounded-lg overflow-hidden`}>
              {post.imagenes.slice(0, 4).map((imagen, index) => (
                <div
                  key={imagen.id}
                  className={`relative cursor-pointer bg-muted ${
                    imageCount === 3 && index === 0 ? 'row-span-2' : ''
                  } ${imageCount === 1 ? 'aspect-video' : 'aspect-square'}`}
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <Image
                    src={imagen.url}
                    alt={`Imagen ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {imageCount > 4 && index === 3 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-xl font-bold">
                        +{imageCount - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Contadores (solo cuando hay reacciones o comentarios); la línea va aquí */}
          {(reactionsCount > 0 || commentsCount > 0) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 pb-1 border-b">
              {reactionsCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center [&>*:not(:first-child)]:-ml-1.5">
                    {(['Recomendar', 'Celebrar', 'Encantar'] as const).map((t) =>
                      (reactionCounts[t] ?? 0) > 0 ? (
                        <div
                          key={t}
                          className="flex items-center justify-center w-5 h-5 rounded-full bg-background border border-border shrink-0 overflow-hidden"
                          title={t}
                        >
                          {t === 'Recomendar' && (
                            <ThumbsUp className="h-3 w-3 text-blue-600 fill-blue-600" />
                          )}
                          {t === 'Celebrar' && (
                            <PartyPopper className="h-3 w-3 text-green-600 fill-green-600" />
                          )}
                          {t === 'Encantar' && (
                            <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                          )}
                        </div>
                      ) : null
                    )}
                  </div>
                  <span>{reactionsCount}</span>
                </div>
              )}
              {commentsCount > 0 && (
                <button
                  onClick={() => setShowComments(!showComments)}
                  className="hover:underline"
                >
                  {commentsCount} comentario{commentsCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center justify-between pt-2 pb-0.5">
            <div className="flex items-center gap-1">
              <ReactionButton
                userReaction={userReaction}
                onSelectReaction={handleSetReaction}
              />
              <Button
                variant="ghost"
                onClick={() => setShowComments(!showComments)}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Comentar
              </Button>
            </div>

            {/* Indicador de proyectos, sedes y escuelas */}
            {post.proyectos.length > 0 && (() => {
              const proyectosCount = post.proyectos.length;
              const sedesUnicas = Array.from(new Set(post.proyectos.map(({ proyecto }) => proyecto.sede)));
              const sedesCount = sedesUnicas.length;
              const escuelasUnicas = Array.from(
                new Set(
                  post.proyectos
                    .flatMap(({ proyecto }) => proyecto.escuelas?.map(e => e.escuela.nombre) || [])
                    .filter(Boolean)
                )
              );
              const escuelasCount = escuelasUnicas.length;

              return (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Popover open={hoveredPopover === 'proyectos'} onOpenChange={(open) => setHoveredPopover(open ? 'proyectos' : null)}>
                    <PopoverTrigger asChild>
                      <div 
                        className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                        onMouseEnter={() => setHoveredPopover('proyectos')}
                        onMouseLeave={() => setHoveredPopover(null)}
                      >
                        <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
                        <span>{proyectosCount} {proyectosCount === 1 ? 'proyecto' : 'proyectos'}</span>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-auto p-2" 
                      align="end"
                      onMouseEnter={() => setHoveredPopover('proyectos')}
                      onMouseLeave={() => setHoveredPopover(null)}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-semibold mb-1">Proyectos relacionados:</p>
                        {post.proyectos.map(({ proyecto }) => (
                          <p key={proyecto.id} className="text-xs text-gray-700">
                            {proyecto.proyecto}
                          </p>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {sedesCount > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <Popover open={hoveredPopover === 'sedes'} onOpenChange={(open) => setHoveredPopover(open ? 'sedes' : null)}>
                        <PopoverTrigger asChild>
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                            onMouseEnter={() => setHoveredPopover('sedes')}
                            onMouseLeave={() => setHoveredPopover(null)}
                          >
                            <MapPin className="h-3.5 w-3.5 text-green-600" />
                            <span>{sedesCount} {sedesCount === 1 ? 'sede' : 'sedes'}</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-2" 
                          align="end"
                          onMouseEnter={() => setHoveredPopover('sedes')}
                          onMouseLeave={() => setHoveredPopover(null)}
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-semibold mb-1">Sedes:</p>
                            {sedesUnicas.map((sede) => (
                              <p key={sede} className="text-xs text-gray-700">
                                {sede}
                              </p>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}

                  {escuelasCount > 0 && (
                    <>
                      <span className="text-gray-300">|</span>
                      <Popover open={hoveredPopover === 'escuelas'} onOpenChange={(open) => setHoveredPopover(open ? 'escuelas' : null)}>
                        <PopoverTrigger asChild>
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
                            onMouseEnter={() => setHoveredPopover('escuelas')}
                            onMouseLeave={() => setHoveredPopover(null)}
                          >
                            <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                            <span>{escuelasCount} {escuelasCount === 1 ? 'escuela' : 'escuelas'}</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-2" 
                          align="end"
                          onMouseEnter={() => setHoveredPopover('escuelas')}
                          onMouseLeave={() => setHoveredPopover(null)}
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-semibold mb-1">Escuelas:</p>
                            {escuelasUnicas.map((escuela) => (
                              <p key={escuela} className="text-xs text-gray-700">
                                {escuela}
                              </p>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Sección de comentarios */}
          {showComments && (
            <div className="mt-2">
              <CommentSection postId={post.id} commentsCount={commentsCount} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de imagen ampliada */}
      {selectedImageIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image
              src={post.imagenes[selectedImageIndex].url}
              alt={`Imagen ${selectedImageIndex + 1}`}
              fill
              className="object-contain"
            />
          </div>
          <button
            className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full"
            onClick={() => setSelectedImageIndex(null)}
          >
            ✕
          </button>
          
          {/* Navegación entre imágenes */}
          {imageCount > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full text-2xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev === 0 ? imageCount - 1 : (prev || 0) - 1
                  );
                }}
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white p-2 hover:bg-white/10 rounded-full text-2xl"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImageIndex((prev) =>
                    prev === imageCount - 1 ? 0 : (prev || 0) + 1
                  );
                }}
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
