'use server';

import prisma from '@/lib/prisma';

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
  escuela: string | null;
  avanceGantt: number;
  participantesCount: number;
}

export interface TrendingItem {
  id: string;
  nombre: string;
  postCount: number;
  image?: string | null;
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
 * Obtener participantes aleatorios de proyectos
 */
export async function getRandomParticipants(limit: number = 4): Promise<{
  success: boolean;
  data?: RandomParticipant[];
  error?: string;
}> {
  try {
    // Obtener participantes que tienen usuario asociado (con cuenta activa)
    const totalParticipants = await prisma.proyectoParticipante.count({
      where: {
        userId: { not: null },
        user: { 
          name: { not: null }
        }
      },
    });

    if (totalParticipants === 0) {
      return { success: true, data: [] };
    }

    // Generar offsets aleatorios únicos
    const randomOffsets = new Set<number>();
    const maxToFetch = Math.min(limit, totalParticipants);
    
    while (randomOffsets.size < maxToFetch) {
      randomOffsets.add(Math.floor(Math.random() * totalParticipants));
    }

    // Obtener participantes en los offsets aleatorios
    const participants: RandomParticipant[] = [];
    
    for (const offset of randomOffsets) {
      const participant = await prisma.proyectoParticipante.findFirst({
        where: {
          userId: { not: null },
          user: { 
            name: { not: null }
          }
        },
        skip: offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          proyecto: {
            select: {
              id: true,
              proyecto: true,
            },
          },
        },
      });

      if (participant && participant.user) {
        participants.push({
          id: participant.id,
          nombre: participant.user.name,
          email: participant.user.email,
          image: participant.user.image,
          rol: participant.rol,
          proyecto: {
            id: participant.proyecto.id,
            nombre: participant.proyecto.proyecto,
          },
        });
      }
    }

    return { success: true, data: participants };
  } catch (error) {
    console.error('Error fetching random participants:', error);
    return { success: false, error: 'Error al obtener participantes aleatorios' };
  }
}

/**
 * Obtener proyectos aleatorios en ejecución
 */
export async function getRandomProjects(limit: number = 3): Promise<{
  success: boolean;
  data?: RandomProject[];
  error?: string;
}> {
  try {
    // Obtener total de proyectos
    const totalProjects = await prisma.proyecto.count();

    if (totalProjects === 0) {
      return { success: true, data: [] };
    }

    // Generar offsets aleatorios únicos
    const randomOffsets = new Set<number>();
    const maxToFetch = Math.min(limit, totalProjects);
    
    while (randomOffsets.size < maxToFetch) {
      randomOffsets.add(Math.floor(Math.random() * totalProjects));
    }

    // Obtener proyectos en los offsets aleatorios
    const projects: RandomProject[] = [];
    
    for (const offset of randomOffsets) {
      const proyecto = await prisma.proyecto.findFirst({
        skip: offset,
        include: {
          escuelas: {
            include: {
              escuela: {
                select: {
                  nombre: true,
                },
              },
            },
            take: 1,
          },
          _count: {
            select: {
              participantes_rel: true,
            },
          },
        },
      });

      if (proyecto) {
        projects.push({
          id: proyecto.id,
          nombre: proyecto.proyecto,
          sede: proyecto.sede,
          escuela: proyecto.escuelas[0]?.escuela.nombre || null,
          avanceGantt: proyecto.avanceGantt,
          participantesCount: proyecto._count.participantes_rel,
        });
      }
    }

    return { success: true, data: projects };
  } catch (error) {
    console.error('Error fetching random projects:', error);
    return { success: false, error: 'Error al obtener proyectos aleatorios' };
  }
}

/**
 * Obtener tendencias del mes actual
 */
export async function getMonthlyTrends(): Promise<{
  success: boolean;
  data?: MonthlyTrends;
  error?: string;
}> {
  try {
    // Calcular inicio del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Proyectos más posteados del mes
    const proyectosTrending = await prisma.postProyecto.groupBy({
      by: ['proyectoId'],
      where: {
        post: {
          createdAt: { gte: startOfMonth },
        },
      },
      _count: {
        postId: true,
      },
      orderBy: {
        _count: {
          postId: 'desc',
        },
      },
      take: 5,
    });

    // Obtener detalles de los proyectos
    const proyectosIds = proyectosTrending.map((p) => p.proyectoId);
    const proyectosDetails = await prisma.proyecto.findMany({
      where: { id: { in: proyectosIds } },
      select: { id: true, proyecto: true },
    });

    const proyectosMap = new Map(proyectosDetails.map((p) => [p.id, p.proyecto]));
    const proyectos: TrendingItem[] = proyectosTrending.map((p) => ({
      id: p.proyectoId,
      nombre: proyectosMap.get(p.proyectoId) || 'Proyecto desconocido',
      postCount: p._count.postId,
    }));

    // 2. Escuelas más posteadas del mes
    // Primero obtenemos los posts del mes con sus proyectos y escuelas
    const postsDelMes = await prisma.post.findMany({
      where: {
        createdAt: { gte: startOfMonth },
      },
      select: {
        id: true,
        proyectos: {
          select: {
            proyecto: {
              select: {
                escuelas: {
                  select: {
                    escuela: {
                      select: {
                        id: true,
                        nombre: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Contar posts por escuela
    const escuelasCount = new Map<string, { nombre: string; count: number }>();
    for (const post of postsDelMes) {
      const escuelasVistas = new Set<string>();
      for (const postProyecto of post.proyectos) {
        for (const proyectoEscuela of postProyecto.proyecto.escuelas) {
          const escuela = proyectoEscuela.escuela;
          if (!escuelasVistas.has(escuela.id)) {
            escuelasVistas.add(escuela.id);
            const current = escuelasCount.get(escuela.id) || { nombre: escuela.nombre, count: 0 };
            current.count++;
            escuelasCount.set(escuela.id, current);
          }
        }
      }
    }

    const escuelas: TrendingItem[] = Array.from(escuelasCount.entries())
      .map(([id, data]) => ({
        id,
        nombre: data.nombre,
        postCount: data.count,
      }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5);

    // 3. Sedes más posteadas del mes
    const sedesCount = new Map<string, number>();
    const postsConSedes = await prisma.post.findMany({
      where: {
        createdAt: { gte: startOfMonth },
      },
      select: {
        id: true,
        proyectos: {
          select: {
            proyecto: {
              select: {
                sede: true,
              },
            },
          },
        },
      },
    });

    for (const post of postsConSedes) {
      const sedesVistas = new Set<string>();
      for (const postProyecto of post.proyectos) {
        const sede = postProyecto.proyecto.sede;
        if (sede && !sedesVistas.has(sede)) {
          sedesVistas.add(sede);
          sedesCount.set(sede, (sedesCount.get(sede) || 0) + 1);
        }
      }
    }

    const sedes: TrendingSede[] = Array.from(sedesCount.entries())
      .map(([sede, count]) => ({
        sede,
        postCount: count,
      }))
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 5);

    // 4. Personas que más han posteado del mes
    const personasTrending = await prisma.post.groupBy({
      by: ['authorId'],
      where: {
        createdAt: { gte: startOfMonth },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    // Obtener detalles de los usuarios
    const userIds = personasTrending.map((p) => p.authorId);
    const usersDetails = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    });

    const usersMap = new Map(usersDetails.map((u) => [u.id, { name: u.name, image: u.image }]));
    const personas: TrendingItem[] = personasTrending.map((p) => ({
      id: p.authorId,
      nombre: usersMap.get(p.authorId)?.name || 'Usuario desconocido',
      image: usersMap.get(p.authorId)?.image,
      postCount: p._count.id,
    }));

    return {
      success: true,
      data: {
        proyectos,
        escuelas,
        sedes,
        personas,
      },
    };
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    return { success: false, error: 'Error al obtener tendencias del mes' };
  }
}
