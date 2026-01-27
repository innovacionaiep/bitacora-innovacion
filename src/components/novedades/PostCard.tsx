'use client';

import { useState } from 'react';
import { MessageCircle, MoreHorizontal, Trash2, FolderKanban, MapPin, GraduationCap } from 'lucide-react';
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
import { LikeButton } from './LikeButton';
import { CommentSection } from './CommentSection';
import { PostWithRelations, togglePostLike, deletePost } from '@/lib/actions/posts';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useSession } from 'next-auth/react';

interface PostCardProps {
  post: PostWithRelations;
  onPostDeleted?: (postId: string) => void;
}

export function PostCard({ post, onPostDeleted }: PostCardProps) {
  const { data: session } = useSession();
  const [showComments, setShowComments] = useState(false);
  const [likesCount, setLikesCount] = useState(post._count.likes);
  const [isLiked, setIsLiked] = useState(post.isLikedByUser || false);
  const [commentsCount, setCommentsCount] = useState(post._count.comentarios);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [hoveredPopover, setHoveredPopover] = useState<string | null>(null);

  const isAuthor = session?.user?.id === post.authorId;
  const authorName = post.author.name || post.author.email.split('@')[0];
  const authorInitials = authorName.slice(0, 2).toUpperCase();

  const handleToggleLike = async () => {
    const result = await togglePostLike(post.id);
    if (result.success) {
      setIsLiked(result.liked || false);
      setLikesCount((prev) => (result.liked ? prev + 1 : prev - 1));
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
        <CardContent className="p-4">
          {/* Header del post */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author.image || undefined} />
                <AvatarFallback>{authorInitials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{authorName}</p>
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
          <div className="mb-3">
            <p className="text-sm whitespace-pre-wrap break-words">{post.contenido}</p>
          </div>

          {/* Imágenes */}
          {imageCount > 0 && (
            <div className={`grid ${getImageGridClass()} gap-1 mb-3 rounded-lg overflow-hidden`}>
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

          {/* Contadores */}
          {(likesCount > 0 || commentsCount > 0) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 pb-2 border-b">
              {likesCount > 0 && (
                <span>{likesCount} me gusta</span>
              )}
              {commentsCount > 0 && (
                <button
                  onClick={() => setShowComments(!showComments)}
                  className=""
                >
                  {commentsCount} comentario{commentsCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex items-center gap-1 border-b pb-3">
            <LikeButton
              isLiked={isLiked}
              likesCount={0}
              onToggle={handleToggleLike}
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
            <div className="mt-3">
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
