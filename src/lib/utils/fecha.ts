/**
 * Utilidades de fecha para el proyecto
 */

/**
 * Obtener datos del mes anterior para calcular variaciones
 * Retorna el mes y año del período anterior
 */
export function getMesAnteriorInfo(): { mesAnterior: number; anioMesAnterior: number } {
  const ahora = new Date();
  let mesAnterior = ahora.getMonth(); // 0-11, así que 0 es enero
  let anioMesAnterior = ahora.getFullYear();

  // Si estamos en enero (0), el mes anterior es diciembre (12) del año pasado
  if (mesAnterior === 0) {
    mesAnterior = 12;
    anioMesAnterior = anioMesAnterior - 1;
  }

  return { mesAnterior, anioMesAnterior };
}
