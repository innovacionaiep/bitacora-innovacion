'use server';

import prisma from '@/lib/prisma';
import { unstable_cache, revalidateTag } from 'next/cache';

// Tipos para las respuestas
export interface RandomParticipant {
  id: string;
  nombre: string | null;
  email: string | null;
  image: string | null;
  rol: string;
  proyecto: {
    id: string;
    nombre: string;
  };
}

export interface RandomProject {
  id: string;
  nombre: string;
  sede: string;
  fondo: string;
  focalizacion: string | null;
  avanceGantt: number;
  participantesCount: number;
}

export interface TrendingItem {
  id: string;
  nombre: string;
  postCount: number;
  image?: string | null;
  /** Rol activo actual del usuario (solo en tendencias de personas) */
  rol?: string | null;
}

export interface TrendingSede {
  sede: string;
  postCount: number;
}

export interface MonthlyTrends {
  proyectos: TrendingItem[];
  escuelas: TrendingItem[];
  sedes: TrendingSede[];
  personas: TrendingItem[];
}

/**
 * Función interna para obtener participantes (una sola query)
 */
async function _fetchRandomParticipants(
  limit: number
): Promise<RandomParticipant[]> {
  // Obtener todos los participantes válidos en una sola query y mezclar en memoria
  const participants = await prisma.proyectoParticipante.findMany({
    where: {
      userId: { not: null },
      user: { name: { not: null } },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
      proyecto: {
        select: { id: true, proyecto: true },
      },
    },
    take: 50, // Limitar para no traer demasiados
  });

  // Mezclar y tomar los primeros 'limit'
  const shuffled = participants.sort(() => Math.random() - 0.5).slice(0, limit);

  return shuffled
    .filter((p) => p.user)
    .map((p) => ({
      id: p.id,
      nombre: p.user!.name,
      email: p.user!.email,
      image: p.user!.image,
      rol: p.rol,
      proyecto: { id: p.proyecto.id, nombre: p.proyecto.proyecto },
    }));
}

/**
 * Obtener participantes aleatorios de proyectos
 * @param limit - Número de participantes a obtener
 * @param forceRefresh - Si es true, bypasea el caché y obtiene datos frescos
 */
export async function getRandomParticipants(
  limit: number = 4,
  forceRefresh: boolean = false
): Promise<{
  success: boolean;
  data?: RandomParticipant[];
  error?: string;
}> {
  try {
    // Si se fuerza refresh, obtener directamente sin caché
    if (forceRefresh) {
      const data = await _fetchRandomParticipants(limit);
      return { success: true, data };
    }

    // Para carga inicial, usar caché
    const cachedFetch = unstable_cache(
      async () => _fetchRandomParticipants(limit),
      ['random-participants', String(limit)],
      { revalidate: 60, tags: ['discovery'] }
    );
    const data = await cachedFetch();
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching random participants:', error);
    return {
      success: false,
      error: 'Error al obtener participantes aleatorios',
    };
  }
}

/**
 * Función interna para obtener proyectos (una sola query)
 */
async function _fetchRandomProjects(limit: number): Promise<RandomProject[]> {
  // Obtener proyectos en una sola query
  const proyectos = await prisma.proyecto.findMany({
    include: {
      _count: { select: { participantes_rel: true } },
    },
    take: 30, // Limitar para no traer demasiados
  });

  // Mezclar y tomar los primeros 'limit'
  const shuffled = proyectos.sort(() => Math.random() - 0.5).slice(0, limit);

  return shuffled.map((p) => ({
    id: p.id,
    nombre: p.proyecto,
    sede: p.sede,
    fondo: p.fondo,
    focalizacion: p.focalizacion,
    avanceGantt: p.avanceGantt,
    participantesCount: p._count.participantes_rel,
  }));
}

/**
 * Obtener proyectos aleatorios en ejecución
 * @param limit - Número de proyectos a obtener
 * @param forceRefresh - Si es true, bypasea el caché y obtiene datos frescos
 */
export async function getRandomProjects(
  limit: number = 3,
  forceRefresh: boolean = false
): Promise<{
  success: boolean;
  data?: RandomProject[];
  error?: string;
}> {
  try {
    // Si se fuerza refresh, obtener directamente sin caché
    if (forceRefresh) {
      const data = await _fetchRandomProjects(limit);
      return { success: true, data };
    }

    // Para carga inicial, usar caché
    const cachedFetch = unstable_cache(
      async () => _fetchRandomProjects(limit),
      ['random-projects', String(limit)],
      { revalidate: 60, tags: ['discovery'] }
    );
    const data = await cachedFetch();
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching random projects:', error);
    return { success: false, error: 'Error al obtener proyectos aleatorios' };
  }
}

/**
 * Función interna para obtener tendencias (queries consolidadas)
 */
async function _fetchMonthlyTrends(): Promise<MonthlyTrends> {
  // Calcular inicio del mes actual
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Ejecutar queries en paralelo para mejorar rendimiento
  const [proyectosTrending, personasTrending, postsDelMes] = await Promise.all([
    // 1. Proyectos más posteados
    prisma.postProyecto.groupBy({
      by: ['proyectoId'],
      where: { post: { createdAt: { gte: startOfMonth } } },
      _count: { postId: true },
      orderBy: { _count: { postId: 'desc' } },
      take: 10,
    }),
    // 2. Personas que más han posteado
    prisma.post.groupBy({
      by: ['authorId'],
      where: { createdAt: { gte: startOfMonth } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    // 3. Posts con proyectos, escuelas y sedes (una sola query para escuelas y sedes)
    prisma.post.findMany({
      where: { createdAt: { gte: startOfMonth } },
      select: {
        id: true,
        proyectos: {
          select: {
            proyecto: {
              select: {
                sede: true,
                escuelas: {
                  select: { escuela: { select: { id: true, nombre: true } } },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  // Obtener detalles de proyectos y usuarios en paralelo
  const proyectosIds = proyectosTrending.map((p) => p.proyectoId);
  const userIds = personasTrending.map((p) => p.authorId);

  const [proyectosDetails, usersDetails] = await Promise.all([
    prisma.proyecto.findMany({
      where: { id: { in: proyectosIds } },
      select: { id: true, proyecto: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true, activeRole: true },
    }),
  ]);

  // Mapear proyectos
  const proyectosMap = new Map(proyectosDetails.map((p) => [p.id, p.proyecto]));
  const proyectos: TrendingItem[] = proyectosTrending.map((p) => ({
    id: p.proyectoId,
    nombre: proyectosMap.get(p.proyectoId) || 'Proyecto desconocido',
    postCount: p._count.postId,
  }));

  // Mapear usuarios (incluye rol activo para mostrar en tendencias de personas)
  const usersMap = new Map(
    usersDetails.map((u) => [
      u.id,
      { name: u.name, image: u.image, activeRole: u.activeRole },
    ])
  );
  const personas: TrendingItem[] = personasTrending.map((p) => ({
    id: p.authorId,
    nombre: usersMap.get(p.authorId)?.name || 'Usuario desconocido',
    image: usersMap.get(p.authorId)?.image,
    postCount: p._count.id,
    rol: usersMap.get(p.authorId)?.activeRole ?? null,
  }));

  // Procesar escuelas y sedes del resultado consolidado
  const escuelasCount = new Map<string, { nombre: string; count: number }>();
  const sedesCount = new Map<string, number>();

  for (const post of postsDelMes) {
    const escuelasVistas = new Set<string>();
    const sedesVistas = new Set<string>();

    for (const postProyecto of post.proyectos) {
      // Sedes
      const sede = postProyecto.proyecto.sede;
      if (sede && !sedesVistas.has(sede)) {
        sedesVistas.add(sede);
        sedesCount.set(sede, (sedesCount.get(sede) || 0) + 1);
      }
      // Escuelas
      for (const proyectoEscuela of postProyecto.proyecto.escuelas) {
        const escuela = proyectoEscuela.escuela;
        if (!escuelasVistas.has(escuela.id)) {
          escuelasVistas.add(escuela.id);
          const current = escuelasCount.get(escuela.id) || {
            nombre: escuela.nombre,
            count: 0,
          };
          current.count++;
          escuelasCount.set(escuela.id, current);
        }
      }
    }
  }

  const escuelas: TrendingItem[] = Array.from(escuelasCount.entries())
    .map(([id, data]) => ({ id, nombre: data.nombre, postCount: data.count }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 10);

  const sedes: TrendingSede[] = Array.from(sedesCount.entries())
    .map(([sede, count]) => ({ sede, postCount: count }))
    .sort((a, b) => b.postCount - a.postCount)
    .slice(0, 10);

  return { proyectos, escuelas, sedes, personas };
}

/**
 * Obtener tendencias del mes actual (con caché de 5 minutos)
 */
export async function getMonthlyTrends(): Promise<{
  success: boolean;
  data?: MonthlyTrends;
  error?: string;
}> {
  try {
    const cachedFetch = unstable_cache(
      async () => _fetchMonthlyTrends(),
      ['monthly-trends'],
      { revalidate: 300, tags: ['discovery', 'posts'] } // 5 minutos
    );
    const data = await cachedFetch();
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    return { success: false, error: 'Error al obtener tendencias del mes' };
  }
}
