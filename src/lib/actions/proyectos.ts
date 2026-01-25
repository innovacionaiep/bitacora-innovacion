'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Proyecto } from '@prisma/client';
import { ProyectoFormData, ProyectoWithRelations, CatalogoResponse } from '@/types/proyecto';
import { getMesAnteriorInfo } from '@/lib/utils/fecha';

export type ProyectoData = Omit<Proyecto, 'id' | 'createdAt' | 'updatedAt'>;

// Tipo extendido para proyectos con variaciones
export type ProyectoConVariaciones = ProyectoWithRelations & {
  variacionGantt: number;
  variacionObjetivos: number;
};

/**
 * Obtener todos los proyectos con relaciones y variaciones mensuales
 */
export async function getProyectos() {
  try {
    console.log('🔍 [getProyectos] Iniciando consulta a la base de datos...');
    
    // Obtener información del mes anterior para calcular variaciones
    const { mesAnterior, anioMesAnterior } = getMesAnteriorInfo();
    
    const proyectos = await prisma.proyecto.findMany({
      include: {
        activities: {
          include: {
            tasks: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        participantes_rel: {
          include: {
            user: true,
            socioComunitario: true,
          },
        },
        escuelas: {
          include: {
            escuela: true,
          },
        },
        carreras: {
          include: {
            carrera: true,
          },
        },
        comunas: {
          include: {
            comuna: true,
          },
        },
        gruposInteres: {
          include: {
            grupoInteres: true,
          },
        },
        sociosComunitarios: {
          include: {
            socioComunitario: true,
          },
        },
        objetivos_rel: {
          orderBy: {
            orden: 'asc',
          },
        },
        desarrolloTecnico: true,
        snapshotsMensuales: {
          where: {
            mes: mesAnterior,
            anio: anioMesAnterior,
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    console.log(`✅ [getProyectos] Encontrados ${proyectos.length} proyectos`);
    console.log('📊 [getProyectos] Primer proyecto:', proyectos[0] ? {
      id: proyectos[0].id,
      proyecto: proyectos[0].proyecto,
      escuelas: proyectos[0].escuelas?.length || 0,
      carreras: proyectos[0].carreras?.length || 0,
      objetivos: proyectos[0].objetivos_rel?.length || 0,
      desarrolloTecnico: proyectos[0].desarrolloTecnico ? 'Sí' : 'No',
    } : 'No hay proyectos');
    
    // Log detallado sobre desarrollo técnico
    const proyectosConDesarrolloTecnico = proyectos.filter(p => p.desarrolloTecnico !== null);
    console.log(`📈 [getProyectos] Proyectos con desarrollo técnico: ${proyectosConDesarrolloTecnico.length} de ${proyectos.length}`);
    
    // Calcular variaciones para cada proyecto
    const proyectosConVariaciones: ProyectoConVariaciones[] = proyectos.map(proyecto => {
      const snapshotMesAnterior = proyecto.snapshotsMensuales[0];
      
      // Si hay snapshot del mes anterior, calcular la diferencia
      // Si no hay snapshot, la variación es 0 (sin datos de comparación)
      const variacionGantt = snapshotMesAnterior 
        ? proyecto.avanceGantt - snapshotMesAnterior.avanceGantt
        : 0;
      
      const variacionObjetivos = snapshotMesAnterior
        ? proyecto.objetivos - snapshotMesAnterior.objetivos
        : 0;
      
      // Remover snapshotsMensuales del objeto final (no necesario en frontend)
      const { snapshotsMensuales, ...proyectoSinSnapshots } = proyecto;
      
      return {
        ...proyectoSinSnapshots,
        variacionGantt,
        variacionObjetivos,
      } as ProyectoConVariaciones;
    });
    
    return { success: true, data: proyectosConVariaciones };
  } catch (error) {
    console.error('❌ [getProyectos] Error:', error);
    return { success: false, error: 'Error al obtener proyectos' };
  }
}

/**
 * Obtener un proyecto por ID con todas las relaciones
 */
export async function getProyecto(id: string) {
  try {
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      include: {
        activities: {
          include: {
            tasks: true,
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        participantes_rel: {
          include: {
            user: true,
            socioComunitario: true,
          },
        },
        escuelas: {
          include: {
            escuela: true,
          },
        },
        carreras: {
          include: {
            carrera: true,
          },
        },
        comunas: {
          include: {
            comuna: true,
          },
        },
        gruposInteres: {
          include: {
            grupoInteres: true,
          },
        },
        sociosComunitarios: {
          include: {
            socioComunitario: true,
          },
        },
        objetivos_rel: {
          orderBy: {
            orden: 'asc',
          },
        },
        desarrolloTecnico: true,
      },
    });

    if (!proyecto) {
      return { success: false, error: 'Proyecto no encontrado' };
    }

    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error getting proyecto:', error);
    return { success: false, error: 'Error al obtener proyecto' };
  }
}

/**
 * Crear un nuevo proyecto con todas las relaciones
 */
export async function createProyecto(data: ProyectoFormData) {
  try {
    const proyecto = await prisma.proyecto.create({
      data: {
        proyecto: data.proyecto,
        fondo: data.fondo,
        sede: data.sede,
        focalizacion: data.focalizacion,
        avanceGantt: data.avanceGantt || 0,
        objetivos: data.objetivos || 0,
        presupuestoUsado: data.presupuestoUsado || 0,
        presupuestoTotal: data.presupuestoTotal,
        reunionesHechas: data.reunionesHechas || 0,
        reunionesTotales: data.reunionesTotales || 0,
        participantes: data.participantes,
        
        // Crear relaciones
        escuelas: {
          create: data.escuelasIds.map(escuelaId => ({
            escuelaId,
          })),
        },
        carreras: {
          create: data.carrerasIds.map(carreraId => ({
            carreraId,
          })),
        },
        comunas: {
          create: data.comunasIds.map(comunaId => ({
            comunaId,
          })),
        },
        gruposInteres: {
          create: data.gruposInteresIds.map(grupoId => ({
            grupoInteresId: grupoId,
          })),
        },
        sociosComunitarios: {
          create: data.sociosComunitariosIds.map(socioId => ({
            socioComunitarioId: socioId,
          })),
        },
        participantes_rel: {
          create: data.participantes_rel.map(participante => ({
            userId: participante.userId,
            rol: participante.rol,
          })),
        },
        objetivos_rel: {
          create: [
            {
              tipo: 'General',
              descripcion: data.objetivoGeneral,
              orden: 0,
            },
            ...data.objetivosEspecificos.map((objetivo, index) => ({
              tipo: 'Especifico' as const,
              descripcion: objetivo,
              orden: index + 1,
            })),
          ],
        },
      },
      include: {
        participantes_rel: {
          include: {
            user: true,
            socioComunitario: true,
          },
        },
        escuelas: {
          include: {
            escuela: true,
          },
        },
        carreras: {
          include: {
            carrera: true,
          },
        },
        comunas: {
          include: {
            comuna: true,
          },
        },
        gruposInteres: {
          include: {
            grupoInteres: true,
          },
        },
        sociosComunitarios: {
          include: {
            socioComunitario: true,
          },
        },
        objetivos_rel: {
          orderBy: {
            orden: 'asc',
          },
        },
      },
    });

    revalidatePath('/proyectos');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error creating proyecto:', error);
    return { success: false, error: 'Error al crear proyecto' };
  }
}

/**
 * Actualizar un proyecto
 */
export async function updateProyecto(
  id: string,
  data: Partial<ProyectoData>
) {
  try {
    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: {
        ...(data.proyecto !== undefined && { proyecto: data.proyecto }),
        ...(data.fondo !== undefined && { fondo: data.fondo }),
        ...(data.sede !== undefined && { sede: data.sede }),
        ...(data.escuela !== undefined && { escuela: data.escuela }),
        ...(data.avanceGantt !== undefined && { avanceGantt: data.avanceGantt }),
        ...(data.objetivos !== undefined && { objetivos: data.objetivos }),
        ...(data.presupuestoUsado !== undefined && {
          presupuestoUsado: data.presupuestoUsado,
        }),
        ...(data.presupuestoTotal !== undefined && {
          presupuestoTotal: data.presupuestoTotal,
        }),
        ...(data.reunionesHechas !== undefined && {
          reunionesHechas: data.reunionesHechas,
        }),
        ...(data.reunionesTotales !== undefined && {
          reunionesTotales: data.reunionesTotales,
        }),
        ...(data.participantes !== undefined && {
          participantes: data.participantes,
        }),
      },
    });

    revalidatePath('/proyectos');
    revalidatePath(`/gantt`);
    return { success: true, data: proyecto };
  } catch (error) {
    console.error('Error updating proyecto:', error);
    return { success: false, error: 'Error al actualizar proyecto' };
  }
}

/**
 * Eliminar un proyecto
 */
export async function deleteProyecto(id: string) {
  try {
    await prisma.proyecto.delete({
      where: { id },
    });

    revalidatePath('/proyectos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting proyecto:', error);
    return { success: false, error: 'Error al eliminar proyecto' };
  }
}

// ===== FUNCIONES PARA CATÁLOGOS =====

/**
 * Obtener todas las escuelas
 */
export async function getEscuelas(): Promise<CatalogoResponse<any>> {
  try {
    const escuelas = await prisma.escuela.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: escuelas };
  } catch (error) {
    console.error('Error getting escuelas:', error);
    return { success: false, error: 'Error al obtener escuelas' };
  }
}

/**
 * Obtener todas las carreras
 */
export async function getCarreras(): Promise<CatalogoResponse<any>> {
  try {
    const carreras = await prisma.carrera.findMany({
      include: {
        escuela: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: carreras };
  } catch (error) {
    console.error('Error getting carreras:', error);
    return { success: false, error: 'Error al obtener carreras' };
  }
}

/**
 * Obtener todas las comunas
 */
export async function getComunas(): Promise<CatalogoResponse<any>> {
  try {
    const comunas = await prisma.comuna.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: comunas };
  } catch (error) {
    console.error('Error getting comunas:', error);
    return { success: false, error: 'Error al obtener comunas' };
  }
}

/**
 * Obtener todos los grupos de interés
 */
export async function getGruposInteres(): Promise<CatalogoResponse<any>> {
  try {
    const grupos = await prisma.grupoInteres.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: grupos };
  } catch (error) {
    console.error('Error getting grupos interes:', error);
    return { success: false, error: 'Error al obtener grupos de interés' };
  }
}

/**
 * Obtener todos los socios comunitarios
 */
export async function getSociosComunitarios(): Promise<CatalogoResponse<any>> {
  try {
    const socios = await prisma.socioComunitario.findMany({
      orderBy: { nombre: 'asc' },
    });
    return { success: true, data: socios };
  } catch (error) {
    console.error('Error getting socios comunitarios:', error);
    return { success: false, error: 'Error al obtener socios comunitarios' };
  }
}

/**
 * Crear un nuevo socio comunitario
 */
export async function createSocioComunitario(nombre: string, descripcion?: string) {
  try {
    const socio = await prisma.socioComunitario.create({
      data: {
        nombre,
        descripcion,
      },
    });
    return { success: true, data: socio };
  } catch (error) {
    console.error('Error creating socio comunitario:', error);
    return { success: false, error: 'Error al crear socio comunitario' };
  }
}

