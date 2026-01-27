'use client';

import { useState } from 'react';
import { MessageCircle, MoreHorizontal, Trash2, FolderKanban, MapPin, GraduationCap, ThumbsUp, PartyPopper, Heart } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { PostWithRelations, setPostReaction, deletePost, type PostReactionType } from '@/lib/actions/posts';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

interface PostCardProps {
  post: PostWithRelations;
  onPostDeleted?: (postId: string) => void;
}

export function PostCard({ post, onPostDeleted }: PostCardProps) {
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
  const imageCount = post.imagenes.length;
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
          <div className="flex items-center gap-1 pt-2 pb-0.5">
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

          {/* Sección de comentarios */}
          {showComments && (
            <div className="mt-2">
              <CommentSection postId={post.id} commentsCount={commentsCount} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proyectos flotantes en el espacio vacío a la derecha */}
      {post.proyectos.length > 0 && (() => {
        const { 
          proyectosMostrar, 
          proyectosRestantes, 
          sedesMostrar, 
          sedesRestantes,
          escuelasMostrar,
          escuelasRestantes 
        } = procesarProyectos();
        
        return (
          <div 
            className="absolute left-full top-4 ml-6 w-96"
          >
            <div className="sticky top-4 space-y-2">
              {/* Nombre del proyecto */}
              <div className="flex items-center gap-2 relative">
                {/* Línea horizontal desde el post hasta el icono */}
                <div className="absolute -left-6 top-1/2 w-6 h-px bg-gray-300 -translate-y-1/2"></div>
                <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow flex-shrink-0 relative z-10">
                  <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
                </div>
                  <div className="flex items-center gap-1 flex-nowrap min-w-0 flex-1">
                    {proyectosMostrar.map((proyecto, index) => (
                      <span key={proyecto.id} className="text-xs font-medium text-gray-900 whitespace-nowrap">
                        {index > 0 && <span className="text-gray-400 mx-1">|</span>}
                        {post.proyectos.length === 1 ? proyecto.proyecto : truncateText(proyecto.proyecto)}
                      </span>
                    ))}
                  {proyectosRestantes.length > 0 && (
                    <>
                      <Popover open={hoveredPopover === 'proyectos'} onOpenChange={(open) => setHoveredPopover(open ? 'proyectos' : null)}>
                        <PopoverTrigger asChild>
                          <div 
                            className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-400 hover:bg-gray-500 transition-colors cursor-pointer text-white text-[10px] font-medium aspect-square"
                            onMouseEnter={() => setHoveredPopover('proyectos')}
                            onMouseLeave={() => setHoveredPopover(null)}
                          >
                            +{proyectosRestantes.length}
                          </div>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-auto p-2" 
                          align="start"
                          onMouseEnter={() => setHoveredPopover('proyectos')}
                          onMouseLeave={() => setHoveredPopover(null)}
                        >
                          <div className="space-y-1">
                            <p className="text-xs font-semibold mb-1">Todos los proyectos:</p>
                            {post.proyectos.map(({ proyecto }) => (
                              <p key={proyecto.id} className="text-xs text-gray-700">
                                {proyecto.proyecto}
                              </p>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </div>
              </div>
              
              {/* Sede */}
              {sedesMostrar.length > 0 && (
                <div className="flex items-center gap-2 relative">
                  {/* Línea horizontal desde el post hasta el icono */}
                  <div className="absolute -left-6 top-1/2 w-6 h-px bg-gray-300 -translate-y-1/2"></div>
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow flex-shrink-0 relative z-10">
                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div className="flex items-center gap-1 flex-nowrap min-w-0 flex-1">
                    {sedesMostrar.map((sede, index) => (
                      <span key={sede} className="text-xs font-medium text-gray-900 whitespace-nowrap">
                        {index > 0 && <span className="text-gray-400 mx-1">|</span>}
                        {sede}
                      </span>
                    ))}
                    {sedesRestantes.length > 0 && (
                      <>
                        <Popover open={hoveredPopover === 'sedes'} onOpenChange={(open) => setHoveredPopover(open ? 'sedes' : null)}>
                          <PopoverTrigger asChild>
                            <div 
                              className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-400 hover:bg-gray-500 transition-colors cursor-pointer text-white text-[10px] font-medium aspect-square"
                              onMouseEnter={() => setHoveredPopover('sedes')}
                              onMouseLeave={() => setHoveredPopover(null)}
                            >
                              +{sedesRestantes.length}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-2" 
                            align="start"
                            onMouseEnter={() => setHoveredPopover('sedes')}
                            onMouseLeave={() => setHoveredPopover(null)}
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-semibold mb-1">Todas las sedes:</p>
                              {Array.from(new Set(post.proyectos.map(({ proyecto }) => proyecto.sede))).map((sede) => (
                                <p key={sede} className="text-xs text-gray-700">
                                  {sede}
                                </p>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </>
                    )}
                  </div>
                </div>
              )}
              
              {/* Escuela */}
              {escuelasMostrar.length > 0 && (
                <div className="flex items-center gap-2 relative">
                  {/* Línea horizontal desde el post hasta el icono */}
                  <div className="absolute -left-6 top-1/2 w-6 h-px bg-gray-300 -translate-y-1/2"></div>
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-white shadow-lg hover:shadow-xl transition-shadow flex-shrink-0 relative z-10">
                    <GraduationCap className="h-3.5 w-3.5 text-purple-600" />
                  </div>
                  <div className="flex items-center gap-1 flex-nowrap min-w-0 flex-1">
                    {escuelasMostrar.map((escuela, index) => (
                      <span key={escuela} className="text-xs font-medium text-gray-900 whitespace-nowrap">
                        {index > 0 && <span className="text-gray-400 mx-1">|</span>}
                        {escuela}
                      </span>
                    ))}
                    {escuelasRestantes.length > 0 && (
                      <>
                        <Popover open={hoveredPopover === 'escuelas'} onOpenChange={(open) => setHoveredPopover(open ? 'escuelas' : null)}>
                          <PopoverTrigger asChild>
                            <div 
                              className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-400 hover:bg-gray-500 transition-colors cursor-pointer text-white text-[10px] font-medium aspect-square"
                              onMouseEnter={() => setHoveredPopover('escuelas')}
                              onMouseLeave={() => setHoveredPopover(null)}
                            >
                              +{escuelasRestantes.length}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-2" 
                            align="start"
                            onMouseEnter={() => setHoveredPopover('escuelas')}
                            onMouseLeave={() => setHoveredPopover(null)}
                          >
                            <div className="space-y-1">
                              <p className="text-xs font-semibold mb-1">Todas las escuelas:</p>
                              {Array.from(
                                new Set(
                                  post.proyectos
                                    .flatMap(({ proyecto }) => proyecto.escuelas?.map(e => e.escuela.nombre) || [])
                                    .filter(Boolean)
                                )
                              ).map((escuela) => (
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
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
