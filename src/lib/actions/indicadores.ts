'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createHistorialEntry } from './historial';

export interface IndicadorData {
  id: string;
  nombre: string;
  descripcion: string;
  formaCalculo: string;
  resultadoEsperado: string;
  resultadoAlcanzado: string;
  formatoNumero?: string | null;
  porcentajeCumplimiento: number;
  porcentajeAvance: number;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  comentariosCount: number;
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
          orderBy: { createdAt: 'asc' },
          include: {
            _count: {
              select: {
                comentarios: true,
              },
            },
          },
        },
      },
      orderBy: { orden: 'asc' },
    });

    if (objetivos.length === 0) {
      return {
        success: true,
        data: {
          objetivosGenerales: [],
          progresoGeneral: 0,
        },
      };
    }

    // Group objectives by type (General/Especifico)
    const objetivosGenerales = objetivos.filter(
      (obj) => obj.tipo === 'General'
    );
    const objetivosEspecificos = objetivos.filter(
      (obj) => obj.tipo === 'Especifico'
    );

    // Create the structure: General -> Specific -> Indicators
    const objetivosGeneralesData: ObjetivoGeneralData[] = [];

    for (const objetivoGeneral of objetivosGenerales) {
      // Find specific objectives that belong to this general objective
      // For now, we'll assume they're related by order or we'll create a simple mapping
      const objetivosEspecificosRelacionados = objetivosEspecificos.filter(
        (obj) =>
          obj.orden >= objetivoGeneral.orden &&
          obj.orden <
            (objetivosGenerales.find((og) => og.orden > objetivoGeneral.orden)
              ?.orden || Infinity)
      );

      // Función auxiliar para parsear valores numéricos (remover % y otros símbolos)
      const parseValue = (value: string | null | undefined): number => {
        if (!value || value === '') return 0;
        const cleaned = value
          .toString()
          .replace(/%/g, '')
          .replace(/,/g, '.')
          .trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
      };

      const objetivosEspecificosData = await Promise.all(
        objetivosEspecificosRelacionados.map(async (obj) => {
          const indicadores = await Promise.all(
            obj.indicadores.map(async (ind) => {
              // Recalcular porcentajes basándose en los valores actuales
              const resultadoEsperado = parseValue(ind.resultadoEsperado);
              const resultadoAlcanzado = parseValue(ind.resultadoAlcanzado);

              // Calcular porcentaje de cumplimiento: (alcanzado / esperado) * 100
              const porcentajeCumplimiento =
                resultadoEsperado > 0
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        (resultadoAlcanzado / resultadoEsperado) * 100
                      )
                    )
                  : 0;

              // Calcular porcentaje de avance: (alcanzado / esperado) * 100
              // Si el resultado alcanzado >= resultado esperado, entonces 100%
              const porcentajeAvance =
                resultadoEsperado > 0
                  ? Math.max(
                      0,
                      Math.min(
                        100,
                        (resultadoAlcanzado / resultadoEsperado) * 100
                      )
                    )
                  : 0;

              // Actualizar en la base de datos si los valores han cambiado
              if (
                Math.abs(ind.porcentajeCumplimiento - porcentajeCumplimiento) >
                  0.01 ||
                Math.abs(ind.porcentajeAvance - porcentajeAvance) > 0.01
              ) {
                await prisma.indicador.update({
                  where: { id: ind.id },
                  data: {
                    porcentajeCumplimiento,
                    porcentajeAvance,
                  },
                });
              }

              return {
                id: ind.id,
                nombre: ind.nombre,
                descripcion: ind.descripcion,
                formaCalculo: ind.formaCalculo,
                resultadoEsperado: ind.resultadoEsperado,
                resultadoAlcanzado: ind.resultadoAlcanzado,
                formatoNumero: ind.formatoNumero,
                porcentajeCumplimiento, // Usar el valor recalculado
                porcentajeAvance, // Usar el valor recalculado
                fechaInicio: ind.fechaInicio,
                fechaFin: ind.fechaFin,
                comentariosCount: ind._count.comentarios,
                objetivoEspecifico: {
                  id: obj.id,
                  descripcion: obj.descripcion,
                  orden: obj.orden,
                  objetivoGeneral: {
                    id: objetivoGeneral.id,
                    descripcion: objetivoGeneral.descripcion,
                  },
                },
              };
            })
          );

          return {
            id: obj.id,
            descripcion: obj.descripcion,
            orden: obj.orden,
            indicadores,
          };
        })
      );

      objetivosGeneralesData.push({
        id: objetivoGeneral.id,
        descripcion: objetivoGeneral.descripcion,
        objetivosEspecificos: objetivosEspecificosData,
      });
    }

    // Calculate overall progress from specific objectives' progress
    // Each specific objective's progress is the average of its indicators' % Avance
    const progresosObjetivosEspecificos = objetivosGeneralesData.flatMap((og) =>
      og.objetivosEspecificos.map((oe) => {
        const progresoObjetivo =
          oe.indicadores.length > 0
            ? oe.indicadores.reduce(
                (sum, ind) => sum + ind.porcentajeAvance,
                0
              ) / oe.indicadores.length
            : 0;
        return progresoObjetivo;
      })
    );

    const progresoGeneral =
      progresosObjetivosEspecificos.length > 0
        ? Math.round(
            progresosObjetivosEspecificos.reduce((sum, prog) => sum + prog, 0) /
              progresosObjetivosEspecificos.length
          )
        : 0;

    return {
      success: true,
      data: {
        objetivosGenerales: objetivosGeneralesData,
        progresoGeneral,
      },
    };
  } catch (error) {
    console.error('Error fetching indicadores:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
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
    // Obtener indicador actual para el historial
    const indicadorActual = await prisma.indicador.findUnique({
      where: { id: indicadorId },
      select: {
        nombre: true,
        proyectoId: true,
        resultadoAlcanzado: true,
        porcentajeAvance: true,
      },
    });

    if (!indicadorActual) {
      return {
        success: false,
        error: 'Indicador no encontrado',
      };
    }

    await prisma.indicador.update({
      where: { id: indicadorId },
      data: {
        resultadoAlcanzado,
        porcentajeCumplimiento,
        porcentajeAvance,
      },
    });

    // Registrar en historial si hubo cambio en el resultado alcanzado
    if (indicadorActual.resultadoAlcanzado !== resultadoAlcanzado) {
      await createHistorialEntry({
        proyectoId: indicadorActual.proyectoId,
        accion: 'Actualizar avance',
        tabProyecto: 'Indicadores',
        elementoEspecifico: `Indicador "${indicadorActual.nombre}"`,
        cambioGenerado: `Resultado alcanzado: ${indicadorActual.resultadoAlcanzado} → ${resultadoAlcanzado} (${Math.round(porcentajeAvance)}%)`,
      });
    }

    // Sincronizar el campo objetivos del proyecto con el nuevo progreso
    await sincronizarObjetivosProyecto(indicadorActual.proyectoId);

    // Eliminado revalidatePath para evitar refresh completo de página
    // El estado se actualizará mediante fetchIndicadores en el cliente
    return { success: true };
  } catch (error) {
    console.error('Error updating indicador:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export async function updateIndicador(
  indicadorId: string,
  data: {
    nombre?: string;
    descripcion?: string;
    formaCalculo?: string;
    formatoNumero?: string | null;
    resultadoEsperado?: string;
    resultadoAlcanzado?: string;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Obtener el indicador actual para calcular porcentajes
    const indicadorActual = await prisma.indicador.findUnique({
      where: { id: indicadorId },
    });

    if (!indicadorActual) {
      return {
        success: false,
        error: 'Indicador no encontrado',
      };
    }

    // Función auxiliar para parsear valores numéricos (remover % y otros símbolos)
    const parseValue = (value: string | null | undefined): number => {
      if (!value || value === '') return 0;
      const cleaned = value
        .toString()
        .replace(/%/g, '')
        .replace(/,/g, '.')
        .trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Usar los valores actualizados o los existentes
    const resultadoEsperado = parseValue(
      data.resultadoEsperado ?? indicadorActual.resultadoEsperado
    );
    const resultadoAlcanzado = parseValue(
      data.resultadoAlcanzado ?? indicadorActual.resultadoAlcanzado
    );

    // Calcular porcentaje de cumplimiento: (alcanzado / esperado) * 100
    const porcentajeCumplimiento =
      resultadoEsperado > 0
        ? Math.max(
            0,
            Math.min(100, (resultadoAlcanzado / resultadoEsperado) * 100)
          )
        : 0;

    // Calcular porcentaje de avance: (alcanzado / esperado) * 100
    const porcentajeAvance =
      resultadoEsperado > 0
        ? Math.max(
            0,
            Math.min(100, (resultadoAlcanzado / resultadoEsperado) * 100)
          )
        : 0;

    // Preparar los datos de actualización incluyendo los porcentajes calculados
    const updateData: Parameters<typeof prisma.indicador.update>[0]['data'] = {
      ...data,
    };
    updateData.porcentajeCumplimiento = porcentajeCumplimiento;
    updateData.porcentajeAvance = porcentajeAvance;

    await prisma.indicador.update({
      where: { id: indicadorId },
      data: updateData,
    });

    // Registrar en historial si hay cambios en valores
    const cambios: string[] = [];
    if (
      data.resultadoEsperado !== undefined &&
      data.resultadoEsperado !== indicadorActual.resultadoEsperado
    ) {
      cambios.push(
        `Resultado esperado: ${indicadorActual.resultadoEsperado} → ${data.resultadoEsperado}`
      );
    }
    if (
      data.resultadoAlcanzado !== undefined &&
      data.resultadoAlcanzado !== indicadorActual.resultadoAlcanzado
    ) {
      cambios.push(
        `Resultado alcanzado: ${indicadorActual.resultadoAlcanzado} → ${data.resultadoAlcanzado}`
      );
    }

    if (cambios.length > 0) {
      await createHistorialEntry({
        proyectoId: indicadorActual.proyectoId,
        accion: 'Actualizar',
        tabProyecto: 'Indicadores',
        elementoEspecifico: `Indicador "${indicadorActual.nombre}"`,
        cambioGenerado: cambios.join('; '),
      });
    }

    // Sincronizar el campo objetivos del proyecto si cambiaron los resultados
    if (
      data.resultadoAlcanzado !== undefined ||
      data.resultadoEsperado !== undefined
    ) {
      await sincronizarObjetivosProyecto(indicadorActual.proyectoId);
    }

    // Eliminado revalidatePath para evitar refresh completo de página
    // El estado se actualizará mediante onUpdate callback y fetchIndicadores
    return { success: true };
  } catch (error) {
    console.error('Error updating indicador:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export async function createIndicador(
  proyectoId: string,
  objetivoEspecificoId: string,
  data: {
    nombre: string;
    descripcion: string;
    formaCalculo: string;
    resultadoEsperado: string;
    formatoNumero?: string | null;
    fechaInicio?: string | null;
    fechaFin?: string | null;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const parseValue = (value: string | null | undefined): number => {
      if (!value || value === '') return 0;
      const cleaned = value
        .toString()
        .replace(/%/g, '')
        .replace(/,/g, '.')
        .trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const resultadoEsperado = parseValue(data.resultadoEsperado);
    const resultadoAlcanzado = 0;
    const porcentajeCumplimiento = 0;
    const porcentajeAvance = 0;

    const indicador = await prisma.indicador.create({
      data: {
        proyectoId,
        objetivoEspecificoId,
        nombre: data.nombre,
        descripcion: data.descripcion,
        formaCalculo: data.formaCalculo,
        resultadoEsperado: data.resultadoEsperado,
        resultadoAlcanzado: '0',
        formatoNumero: data.formatoNumero ?? 'Porcentaje',
        porcentajeCumplimiento,
        porcentajeAvance,
        fechaInicio: data.fechaInicio ?? null,
        fechaFin: data.fechaFin ?? null,
      },
    });

    await createHistorialEntry({
      proyectoId,
      accion: 'Crear',
      tabProyecto: 'Indicadores',
      elementoEspecifico: `Indicador "${data.nombre}"`,
      cambioGenerado: `Indicador creado (objetivo específico seleccionado)`,
    });

    await sincronizarObjetivosProyecto(proyectoId);

    return { success: true, id: indicador.id };
  } catch (error) {
    console.error('Error creating indicador:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

export async function deleteIndicador(
  indicadorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const indicador = await prisma.indicador.findUnique({
      where: { id: indicadorId },
    });

    if (!indicador) {
      return {
        success: false,
        error: 'Indicador no encontrado',
      };
    }

    const proyectoId = indicador.proyectoId;
    const nombre = indicador.nombre;

    await prisma.indicador.delete({
      where: { id: indicadorId },
    });

    await createHistorialEntry({
      proyectoId,
      accion: 'Eliminar',
      tabProyecto: 'Indicadores',
      elementoEspecifico: `Indicador "${nombre}"`,
      cambioGenerado: 'Indicador eliminado',
    });

    await sincronizarObjetivosProyecto(proyectoId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting indicador:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

// Función para recalcular y actualizar porcentajes de todos los indicadores de un proyecto
export async function recalcularPorcentajesProyecto(
  proyectoId: string
): Promise<{ success: boolean; error?: string; updated?: number }> {
  try {
    // Obtener todos los indicadores del proyecto
    const indicadores = await prisma.indicador.findMany({
      where: { proyectoId },
    });

    // Función auxiliar para parsear valores numéricos
    const parseValue = (value: string | null | undefined): number => {
      if (!value || value === '') return 0;
      const cleaned = value
        .toString()
        .replace(/%/g, '')
        .replace(/,/g, '.')
        .trim();
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    let updatedCount = 0;

    // Actualizar cada indicador con sus porcentajes recalculados
    for (const ind of indicadores) {
      const resultadoEsperado = parseValue(ind.resultadoEsperado);
      const resultadoAlcanzado = parseValue(ind.resultadoAlcanzado);

      // Calcular porcentajes
      const porcentajeCumplimiento =
        resultadoEsperado > 0
          ? Math.max(
              0,
              Math.min(100, (resultadoAlcanzado / resultadoEsperado) * 100)
            )
          : 0;

      // Calcular porcentaje de avance: (alcanzado / esperado) * 100
      const porcentajeAvance =
        resultadoEsperado > 0
          ? Math.max(
              0,
              Math.min(100, (resultadoAlcanzado / resultadoEsperado) * 100)
            )
          : 0;

      // Actualizar solo si los valores han cambiado
      if (
        ind.porcentajeCumplimiento !== porcentajeCumplimiento ||
        ind.porcentajeAvance !== porcentajeAvance
      ) {
        await prisma.indicador.update({
          where: { id: ind.id },
          data: {
            porcentajeCumplimiento,
            porcentajeAvance,
          },
        });
        updatedCount++;
      }
    }

    revalidatePath(`/proyectos/[id]`, 'page');
    return { success: true, updated: updatedCount };
  } catch (error) {
    console.error('Error recalculating porcentajes:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Sincronizar el campo objetivos del proyecto con el progreso general de indicadores
 * Esta función calcula el promedio de avance de todos los indicadores y actualiza el proyecto
 */
export async function sincronizarObjetivosProyecto(
  proyectoId: string
): Promise<{
  success: boolean;
  progresoGeneral?: number;
  error?: string;
}> {
  try {
    const result = await getIndicadoresByProyecto(proyectoId);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Error al obtener indicadores',
      };
    }

    const progresoGeneral = result.data.progresoGeneral;

    await prisma.proyecto.update({
      where: { id: proyectoId },
      data: { objetivos: progresoGeneral },
    });

    return {
      success: true,
      progresoGeneral,
    };
  } catch (error) {
    console.error('Error al sincronizar objetivos del proyecto:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}
