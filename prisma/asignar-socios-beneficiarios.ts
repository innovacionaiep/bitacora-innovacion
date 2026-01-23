import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script para asignar socios comunitarios a todos los beneficiarios existentes
 * Si un proyecto tiene socios comunitarios, se asignará uno aleatorio a cada beneficiario
 */
async function asignarSociosABeneficiarios() {
  try {
    console.log('🔄 Obteniendo todos los beneficiarios...');
    
    // Obtener todos los beneficiarios con sus proyectos
    const beneficiarios = await prisma.proyectoParticipante.findMany({
      where: {
        rol: 'Beneficiario',
      },
      include: {
        proyecto: {
          include: {
            sociosComunitarios: {
              include: {
                socioComunitario: true,
              },
            },
          },
        },
      },
    });

    if (beneficiarios.length === 0) {
      console.log('⚠️  No hay beneficiarios en la base de datos');
      return;
    }

    console.log(`📋 Encontrados ${beneficiarios.length} beneficiarios`);

    let asignados = 0;
    let sinSocio = 0;

    for (const beneficiario of beneficiarios) {
      const sociosDelProyecto = beneficiario.proyecto.sociosComunitarios;

      if (sociosDelProyecto.length === 0) {
        console.log(`⚠️  El proyecto "${beneficiario.proyecto.proyecto}" no tiene socios comunitarios asignados. Beneficiario "${beneficiario.nombre || beneficiario.id}" sin socio.`);
        sinSocio++;
        continue;
      }

      // Si ya tiene un socio asignado, lo saltamos
      if (beneficiario.socioComunitarioId) {
        console.log(`⏭️  Beneficiario "${beneficiario.nombre || beneficiario.id}" ya tiene socio asignado.`);
        continue;
      }

      // Asignar un socio aleatorio del proyecto
      const socioAleatorio = sociosDelProyecto[Math.floor(Math.random() * sociosDelProyecto.length)];
      
      await prisma.proyectoParticipante.update({
        where: {
          id: beneficiario.id,
        },
        data: {
          socioComunitarioId: socioAleatorio.socioComunitarioId,
        },
      });

      asignados++;
      console.log(`  ✅ Asignado socio "${socioAleatorio.socioComunitario.nombre}" a beneficiario "${beneficiario.nombre || beneficiario.id}"`);
    }

    console.log('\n✨ ¡Proceso completado exitosamente!');
    console.log(`📊 Resumen:`);
    console.log(`   - Beneficiarios con socio asignado: ${asignados}`);
    console.log(`   - Beneficiarios sin socio (proyecto sin socios): ${sinSocio}`);
    console.log(`   - Beneficiarios que ya tenían socio: ${beneficiarios.length - asignados - sinSocio}`);
  } catch (error) {
    console.error('❌ Error al asignar socios a beneficiarios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
asignarSociosABeneficiarios()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
