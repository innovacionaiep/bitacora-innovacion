/**
 * Seed script para crear snapshots del mes anterior como línea base
 * Este script genera datos de diciembre 2025 para todos los proyectos existentes
 * 
 * Ejecutar con: npx ts-node prisma/seed-snapshots.ts
 * O: npx tsx prisma/seed-snapshots.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Genera un número aleatorio entre min y max
 */
function randomVariation(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  console.log('🌱 Iniciando seed de snapshots mensuales...');
  
  // Obtener todos los proyectos con sus valores actuales
  const proyectos = await prisma.proyecto.findMany({
    select: {
      id: true,
      proyecto: true,
      avanceGantt: true,
      objetivos: true,
    },
  });

  console.log(`📊 Encontrados ${proyectos.length} proyectos`);

  // Configurar el mes anterior (diciembre 2025)
  const mesAnterior = 12;
  const anioMesAnterior = 2025;

  console.log(`📅 Creando snapshots para ${mesAnterior}/${anioMesAnterior}...`);

  let creados = 0;
  let actualizados = 0;
  let errores = 0;

  for (const proyecto of proyectos) {
    try {
      // Calcular valores del mes anterior
      // Los valores serán menores que los actuales, simulando que hubo avance durante el mes
      const variacionGantt = randomVariation(5, 25);
      const variacionObjetivos = randomVariation(5, 20);
      
      const avanceGanttAnterior = Math.max(0, proyecto.avanceGantt - variacionGantt);
      const objetivosAnterior = Math.max(0, proyecto.objetivos - variacionObjetivos);

      // Crear o actualizar el snapshot
      const resultado = await prisma.snapshotMensualProyecto.upsert({
        where: {
          proyectoId_mes_anio: {
            proyectoId: proyecto.id,
            mes: mesAnterior,
            anio: anioMesAnterior,
          },
        },
        update: {
          avanceGantt: avanceGanttAnterior,
          objetivos: objetivosAnterior,
        },
        create: {
          proyectoId: proyecto.id,
          mes: mesAnterior,
          anio: anioMesAnterior,
          avanceGantt: avanceGanttAnterior,
          objetivos: objetivosAnterior,
        },
      });

      if (resultado.createdAt === resultado.createdAt) {
        // Verificar si fue creado o actualizado
        const existente = await prisma.snapshotMensualProyecto.findUnique({
          where: {
            proyectoId_mes_anio: {
              proyectoId: proyecto.id,
              mes: mesAnterior,
              anio: anioMesAnterior,
            },
          },
        });
        
        if (existente) {
          creados++;
        } else {
          actualizados++;
        }
      }

      console.log(`  ✅ ${proyecto.proyecto.substring(0, 40)}... | Gantt: ${proyecto.avanceGantt}% → ${avanceGanttAnterior}% | Obj: ${proyecto.objetivos}% → ${objetivosAnterior}%`);
    } catch (error) {
      console.error(`  ❌ Error con proyecto ${proyecto.id}:`, error);
      errores++;
    }
  }

  console.log('\n📈 Resumen:');
  console.log(`  - Snapshots procesados: ${proyectos.length}`);
  console.log(`  - Creados/Actualizados: ${creados + actualizados}`);
  console.log(`  - Errores: ${errores}`);
  console.log('\n✨ Seed de snapshots completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
