'use server';

import prisma from '@/lib/prisma';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import {
  Proyecto,
  Escuela,
  Carrera,
  Comuna,
  GrupoInteres,
  SocioComunitario,
} from '@prisma/client';
import {
  ProyectoFormData,
  ProyectoWithRelations,
  CatalogoResponse,
} from '@/types/proyecto';
import { getMesAnteriorInfo } from '@/lib/utils/fecha';

export type ProyectoData = Omit<Proyecto, 'id' | 'createdAt' | 'updatedAt'>;

// Tipo extendido para proyectos con variaciones
export type ProyectoConVariaciones = ProyectoWithRelations & {
  variacionGantt: number;
  variacionObjetivos: number;
};

export type GeneralTabUpdateData = {
  proyectoId: string;
  proyecto?: string;
  sede?: string;
  objetivoGeneral?: {
    id?: string;
    descripcion: string;
  };
  objetivosEspecificos?: Array<{
    id: string;
    descripcion: string;
    orden: number;
  }>;
  escuelasIds?: string[];
  carrerasIds?: string[];
  comunasIds?: string[];
  gruposInteresIds?: string[];
  sociosComunitariosIds?: string[];
  desarrolloTecnico?: {
    continuidadFasesAnteriores?: string | null;
    pertinenciaLocal?: string | null;
    pertinenciaDisciplinar?: string | null;
    necesidadProblema?: string | null;
    publicoObjetivo?: string | null;
    solucionAvance?: string | null;
    perspectiveGenero?: string | null;
    resultadosContribucion?: string | null;
    metodologiaMedicion?: string | null;
    ejesImpacto?: string | null;
    factorInnovador?: string | null;
    escalabilidad?: string | null;
  };
};

/**
 * Función interna para obtener proyectos de la BD (sin caché)
 */
async function _getProyectosFromDB() {
  // Obtener información del mes anterior para calcular variaciones
  const { mesAnterior, anioMesAnterior } = getMesAnteriorInfo();

  // NOTA: Incluimos activities con tasks completas para compatibilidad de tipos
  const proyectos = await prisma.proyecto.findMany({
    include: {
      activities: {
        include: {
          tasks: {
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
      participantes_rel: {
        include: {
          user: true,
          socioComunitario: true,
          sede: true,
          escuela: true,
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
      desarrolloTecnicoValores: {
        include: { subcategoria: true },
      },
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

  // Calcular variaciones para cada proyecto
  const proyectosConVariaciones: ProyectoConVariaciones[] = proyectos.map(
    (proyecto) => {
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
    }
  );

  return proyectosConVariaciones;
}

/**
 * Obtener todos los proyectos con relaciones y variaciones mensuales
 * Con caché de 30 segundos para mejorar rendimiento
 */
export async function getProyectos() {
  try {
    console.log('🔍 [getProyectos] Iniciando consulta a la base de datos...');

    // Usar caché con revalidación cada 30 segundos
    const cachedGetProyectos = unstable_cache(
      async () => {
        return await _getProyectosFromDB();
      },
      ['proyectos-list'],
      {
        revalidate: 30, // Revalidar cada 30 segundos
        tags: ['proyectos'],
      }
    );

    const proyectosConVariaciones = await cachedGetProyectos();

    console.log(
      `✅ [getProyectos] Encontrados ${proyectosConVariaciones.length} proyectos`
    );

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
        desarrolloTecnicoValores: {
          include: { subcategoria: true },
        },
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
          create: data.escuelasIds.map((escuelaId) => ({
            escuelaId,
          })),
        },
        carreras: {
          create: data.carrerasIds.map((carreraId) => ({
            carreraId,
          })),
        },
        comunas: {
          create: data.comunasIds.map((comunaId) => ({
            comunaId,
          })),
        },
        gruposInteres: {
          create: data.gruposInteresIds.map((grupoId) => ({
            grupoInteresId: grupoId,
          })),
        },
        sociosComunitarios: {
          create: data.sociosComunitariosIds.map((socioId) => ({
            socioComunitarioId: socioId,
          })),
        },
        participantes_rel: {
          create: data.participantes_rel.map((participante) => ({
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
    revalidateTag('proyectos');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error creating proyecto:', error);
    return { success: false, error: 'Error al crear proyecto' };
  }
}

/**
 * Actualizar un proyecto
 */
export async function updateProyecto(id: string, data: Partial<ProyectoData>) {
  try {
    const proyecto = await prisma.proyecto.update({
      where: { id },
      data: {
        ...(data.proyecto !== undefined && { proyecto: data.proyecto }),
        ...(data.fondo !== undefined && { fondo: data.fondo }),
        ...(data.sede !== undefined && { sede: data.sede }),
        ...(data.focalizacion !== undefined && {
          focalizacion: data.focalizacion,
        }),
        ...(data.avanceGantt !== undefined && {
          avanceGantt: data.avanceGantt,
        }),
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
    revalidateTag('proyectos');
    revalidatePath(`/gantt`);
    return { success: true, data: proyecto };
  } catch (error) {
    console.error('Error updating proyecto:', error);
    return { success: false, error: 'Error al actualizar proyecto' };
  }
}

/**
 * Actualizar datos del tab General (objetivos, info básica, desarrollo técnico)
 */
export async function updateProyectoGeneralTab(data: GeneralTabUpdateData) {
  try {
    await prisma.$transaction(async (tx) => {
      if (data.proyecto !== undefined || data.sede !== undefined) {
        await tx.proyecto.update({
          where: { id: data.proyectoId },
          data: {
            ...(data.proyecto !== undefined && { proyecto: data.proyecto }),
            ...(data.sede !== undefined && { sede: data.sede }),
          },
        });
      }

      if (data.escuelasIds) {
        await tx.proyectoEscuela.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.escuelasIds.length > 0) {
          await tx.proyectoEscuela.createMany({
            data: data.escuelasIds.map((escuelaId) => ({
              proyectoId: data.proyectoId,
              escuelaId,
            })),
          });
        }
      }

      if (data.carrerasIds) {
        await tx.proyectoCarrera.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.carrerasIds.length > 0) {
          await tx.proyectoCarrera.createMany({
            data: data.carrerasIds.map((carreraId) => ({
              proyectoId: data.proyectoId,
              carreraId,
            })),
          });
        }
      }

      if (data.comunasIds) {
        await tx.proyectoComuna.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.comunasIds.length > 0) {
          await tx.proyectoComuna.createMany({
            data: data.comunasIds.map((comunaId) => ({
              proyectoId: data.proyectoId,
              comunaId,
            })),
          });
        }
      }

      if (data.gruposInteresIds) {
        await tx.proyectoGrupoInteres.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.gruposInteresIds.length > 0) {
          await tx.proyectoGrupoInteres.createMany({
            data: data.gruposInteresIds.map((grupoInteresId) => ({
              proyectoId: data.proyectoId,
              grupoInteresId,
            })),
          });
        }
      }

      if (data.sociosComunitariosIds) {
        await tx.proyectoSocioComunitario.deleteMany({
          where: { proyectoId: data.proyectoId },
        });
        if (data.sociosComunitariosIds.length > 0) {
          await tx.proyectoSocioComunitario.createMany({
            data: data.sociosComunitariosIds.map((socioComunitarioId) => ({
              proyectoId: data.proyectoId,
              socioComunitarioId,
            })),
          });
        }
      }

      if (data.objetivoGeneral) {
        if (data.objetivoGeneral.id) {
          await tx.objetivoProyecto.update({
            where: { id: data.objetivoGeneral.id },
            data: { descripcion: data.objetivoGeneral.descripcion },
          });
        } else if (data.objetivoGeneral.descripcion.trim()) {
          await tx.objetivoProyecto.create({
            data: {
              proyectoId: data.proyectoId,
              tipo: 'General',
              descripcion: data.objetivoGeneral.descripcion.trim(),
              orden: 0,
            },
          });
        }
      }

      if (data.objetivosEspecificos) {
        for (const objetivo of data.objetivosEspecificos) {
          await tx.objetivoProyecto.update({
            where: { id: objetivo.id },
            data: {
              descripcion: objetivo.descripcion,
              orden: objetivo.orden,
            },
          });
        }
      }

      if (data.desarrolloTecnico) {
        await tx.desarrolloTecnico.upsert({
          where: { proyectoId: data.proyectoId },
          update: {
            continuidadFasesAnteriores:
              data.desarrolloTecnico.continuidadFasesAnteriores ?? null,
            pertinenciaLocal: data.desarrolloTecnico.pertinenciaLocal ?? null,
            pertinenciaDisciplinar:
              data.desarrolloTecnico.pertinenciaDisciplinar ?? null,
            necesidadProblema: data.desarrolloTecnico.necesidadProblema ?? null,
            publicoObjetivo: data.desarrolloTecnico.publicoObjetivo ?? null,
            solucionAvance: data.desarrolloTecnico.solucionAvance ?? null,
            perspectiveGenero: data.desarrolloTecnico.perspectiveGenero ?? null,
            resultadosContribucion:
              data.desarrolloTecnico.resultadosContribucion ?? null,
            metodologiaMedicion:
              data.desarrolloTecnico.metodologiaMedicion ?? null,
            ejesImpacto: data.desarrolloTecnico.ejesImpacto ?? null,
            factorInnovador: data.desarrolloTecnico.factorInnovador ?? null,
            escalabilidad: data.desarrolloTecnico.escalabilidad ?? null,
          },
          create: {
            proyectoId: data.proyectoId,
            continuidadFasesAnteriores:
              data.desarrolloTecnico.continuidadFasesAnteriores ?? null,
            pertinenciaLocal: data.desarrolloTecnico.pertinenciaLocal ?? null,
            pertinenciaDisciplinar:
              data.desarrolloTecnico.pertinenciaDisciplinar ?? null,
            necesidadProblema: data.desarrolloTecnico.necesidadProblema ?? null,
            publicoObjetivo: data.desarrolloTecnico.publicoObjetivo ?? null,
            solucionAvance: data.desarrolloTecnico.solucionAvance ?? null,
            perspectiveGenero: data.desarrolloTecnico.perspectiveGenero ?? null,
            resultadosContribucion:
              data.desarrolloTecnico.resultadosContribucion ?? null,
            metodologiaMedicion:
              data.desarrolloTecnico.metodologiaMedicion ?? null,
            ejesImpacto: data.desarrolloTecnico.ejesImpacto ?? null,
            factorInnovador: data.desarrolloTecnico.factorInnovador ?? null,
            escalabilidad: data.desarrolloTecnico.escalabilidad ?? null,
          },
        });
        // Sincronizar también a DesarrolloTecnicoValor (modelo flexible)
        const subcategorias = await tx.desarrolloTecnicoSubcategoria.findMany({
          where: { campoKey: { not: null } },
          select: { id: true, campoKey: true },
        });
        const dt = data.desarrolloTecnico as Record<string, string | null | undefined>;
        for (const sub of subcategorias) {
          const key = sub.campoKey as string;
          const valor = dt[key];
          if (valor != null && String(valor).trim() !== '') {
            await tx.desarrolloTecnicoValor.upsert({
              where: {
                proyectoId_subcategoriaId: {
                  proyectoId: data.proyectoId,
                  subcategoriaId: sub.id,
                },
              },
              create: {
                proyectoId: data.proyectoId,
                subcategoriaId: sub.id,
                valor: String(valor),
              },
              update: { valor: String(valor) },
            });
          }
        }
      }
    });

    const proyectoActualizado = await prisma.proyecto.findUnique({
      where: { id: data.proyectoId },
      include: {
        activities: {
          include: {
            tasks: {
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
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
        desarrolloTecnicoValores: {
          include: { subcategoria: true },
        },
      },
    });

    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    return { success: true, data: proyectoActualizado as ProyectoWithRelations };
  } catch (error) {
    console.error('Error updating general tab:', error);
    return { success: false, error: 'Error al actualizar el proyecto' };
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
    revalidateTag('proyectos');
    return { success: true };
  } catch (error) {
    console.error('Error deleting proyecto:', error);
    return { success: false, error: 'Error al eliminar proyecto' };
  }
}

// ===== FUNCIONES PARA PARTICIPANTES =====

const proyectoIncludeForParticipante = {
  participantes_rel: {
    include: {
      user: true,
      socioComunitario: true,
      sede: true,
      escuela: true,
    },
  },
  escuelas: { include: { escuela: true } },
  carreras: { include: { carrera: true } },
  comunas: { include: { comuna: true } },
  gruposInteres: { include: { grupoInteres: true } },
  sociosComunitarios: { include: { socioComunitario: true } },
  objetivos_rel: { orderBy: { orden: 'asc' as const } },
  desarrolloTecnico: true,
  desarrolloTecnicoValores: { include: { subcategoria: true } },
} as const;

export type AddParticipanteData = {
  rol: string;
  nombre?: string;
  email?: string;
  cargo?: string;
  socioComunitarioId?: string;
  sedeId?: string;
  escuelaId?: string;
};

export async function addParticipanteProyecto(
  proyectoId: string,
  data: AddParticipanteData
) {
  try {
    const participante = await prisma.proyectoParticipante.create({
      data: {
        proyectoId,
        userId: null,
        rol: data.rol,
        nombre: data.nombre ?? null,
        email: data.email ?? null,
        cargo: data.cargo ?? null,
        socioComunitarioId:
          data.rol === 'Beneficiario' ? data.socioComunitarioId ?? null : null,
        sedeId: data.sedeId ?? null,
        escuelaId: data.escuelaId ?? null,
      },
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error adding participante:', error);
    return {
      success: false,
      error: 'Error al agregar participante',
    };
  }
}

export type UpdateParticipanteData = {
  rol?: string;
  nombre?: string;
  email?: string;
  cargo?: string;
  socioComunitarioId?: string;
  sedeId?: string;
  escuelaId?: string;
};

export async function updateParticipanteProyecto(
  participanteId: string,
  data: UpdateParticipanteData
) {
  try {
    const existing = await prisma.proyectoParticipante.findUnique({
      where: { id: participanteId },
    });
    if (!existing) {
      return { success: false, error: 'Participante no encontrado' };
    }
    const finalRol = data.rol ?? existing.rol;
    await prisma.proyectoParticipante.update({
      where: { id: participanteId },
      data: {
        ...(data.rol !== undefined && { rol: data.rol }),
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.cargo !== undefined && { cargo: data.cargo }),
        ...(data.socioComunitarioId !== undefined && {
          socioComunitarioId:
            finalRol === 'Beneficiario' ? data.socioComunitarioId : null,
        }),
        ...(data.sedeId !== undefined && { sedeId: data.sedeId || null }),
        ...(data.escuelaId !== undefined && { escuelaId: data.escuelaId || null }),
      },
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: existing.proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error updating participante:', error);
    return {
      success: false,
      error: 'Error al actualizar participante',
    };
  }
}

export async function deleteParticipanteProyecto(participanteId: string) {
  try {
    const existing = await prisma.proyectoParticipante.findUnique({
      where: { id: participanteId },
    });
    if (!existing) {
      return { success: false, error: 'Participante no encontrado' };
    }
    await prisma.proyectoParticipante.delete({
      where: { id: participanteId },
    });
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: existing.proyectoId },
      include: proyectoIncludeForParticipante,
    });
    revalidatePath('/proyectos');
    revalidateTag('proyectos');
    return { success: true, data: proyecto as ProyectoWithRelations };
  } catch (error) {
    console.error('Error deleting participante:', error);
    return {
      success: false,
      error: 'Error al eliminar participante',
    };
  }
}

// ===== FUNCIONES PARA CATÁLOGOS =====

/**
 * Obtener todas las escuelas
 */
export async function getEscuelas(): Promise<CatalogoResponse<Escuela>> {
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
export async function getCarreras(): Promise<CatalogoResponse<Carrera>> {
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
export async function getComunas(): Promise<CatalogoResponse<Comuna>> {
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
export async function getGruposInteres(): Promise<
  CatalogoResponse<GrupoInteres>
> {
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
export async function getSociosComunitarios(): Promise<
  CatalogoResponse<SocioComunitario>
> {
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
export async function createSocioComunitario(
  nombre: string,
  descripcion?: string
) {
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
