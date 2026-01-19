'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export interface IndicadorData {
  id: string;
  nombre: string;
  descripcion: string;
  formaCalculo: string;
  resultadoEsperado: string;
  resultadoAlcanzado: string;
  porcentajeCumplimiento: number;
  porcentajeAvance: number;
  objetivoEspecifico: {
    id: string;
    descripcion: string;
    orden: number;
    objetivoGeneral?: {
      id: string;
      descripcion: string;
    };
  };
}

export interface ObjetivoGeneralData {
  id: string;
  descripcion: string;
  objetivosEspecificos: {
    id: string;
    descripcion: string;
    orden: number;
    indicadores: IndicadorData[];
  }[];
}

export interface IndicadoresProyectoData {
  objetivosGenerales: ObjetivoGeneralData[];
  progresoGeneral: number;
}

export async function getIndicadoresByProyecto(proyectoId: string): Promise<{
  success: boolean;
  data?: IndicadoresProyectoData;
  error?: string;
}> {
  try {
    // Get all objectives for the project
    const objetivos = await prisma.objetivoProyecto.findMany({
      where: { proyectoId },
      include: {
        indicadores: {
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { orden: 'asc' }
    });

    if (objetivos.length === 0) {
      return {
        success: true,
        data: {
          objetivosGenerales: [],
          progresoGeneral: 0
        }
      };
    }

    // Group objectives by type (General/Especifico)
    const objetivosGenerales = objetivos.filter(obj => obj.tipo === 'General');
    const objetivosEspecificos = objetivos.filter(obj => obj.tipo === 'Especifico');

    // Create the structure: General -> Specific -> Indicators
    const objetivosGeneralesData: ObjetivoGeneralData[] = [];

    for (const objetivoGeneral of objetivosGenerales) {
      // Find specific objectives that belong to this general objective
      // For now, we'll assume they're related by order or we'll create a simple mapping
      const objetivosEspecificosRelacionados = objetivosEspecificos.filter(obj => 
        obj.orden >= objetivoGeneral.orden && 
        obj.orden < (objetivosGenerales.find(og => og.orden > objetivoGeneral.orden)?.orden || Infinity)
      );

      const objetivosEspecificosData = objetivosEspecificosRelacionados.map(obj => ({
        id: obj.id,
        descripcion: obj.descripcion,
        orden: obj.orden,
        indicadores: obj.indicadores.map(ind => ({
          id: ind.id,
          nombre: ind.nombre,
          descripcion: ind.descripcion,
          formaCalculo: ind.formaCalculo,
          resultadoEsperado: ind.resultadoEsperado,
          resultadoAlcanzado: ind.resultadoAlcanzado,
          porcentajeCumplimiento: ind.porcentajeCumplimiento,
          porcentajeAvance: ind.porcentajeAvance,
          objetivoEspecifico: {
            id: obj.id,
            descripcion: obj.descripcion,
            orden: obj.orden,
            objetivoGeneral: {
              id: objetivoGeneral.id,
              descripcion: objetivoGeneral.descripcion
            }
          }
        }))
      }));

      objetivosGeneralesData.push({
        id: objetivoGeneral.id,
        descripcion: objetivoGeneral.descripcion,
        objetivosEspecificos: objetivosEspecificosData
      });
    }

    // Calculate overall progress from all indicators' % Avance
    const todosLosIndicadores = objetivosEspecificos.flatMap(obj => obj.indicadores);
    const progresoGeneral = todosLosIndicadores.length > 0 
      ? Math.round(todosLosIndicadores.reduce((sum, ind) => sum + ind.porcentajeAvance, 0) / todosLosIndicadores.length)
      : 0;

    return {
      success: true,
      data: {
        objetivosGenerales: objetivosGeneralesData,
        progresoGeneral
      }
    };

  } catch (error) {
    console.error('Error fetching indicadores:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

export async function updateIndicadorResultado(
  indicadorId: string,
  resultadoAlcanzado: string,
  porcentajeCumplimiento: number,
  porcentajeAvance: number
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.indicador.update({
      where: { id: indicadorId },
      data: {
        resultadoAlcanzado,
        porcentajeCumplimiento,
        porcentajeAvance
      }
    });

    revalidatePath('/proyectos');
    return { success: true };

  } catch (error) {
    console.error('Error updating indicador:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    };
  }
}

