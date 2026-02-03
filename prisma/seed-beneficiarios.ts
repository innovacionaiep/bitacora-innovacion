import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generar nombres y emails únicos para beneficiarios
function generarNombreBeneficiario(index: number): string {
  const nombres = [
    'Beneficiario 1',
    'Beneficiario 2',
    'Beneficiario 3',
    'Beneficiario 4',
    'Beneficiario 5',
    'Beneficiario 6',
    'Beneficiario 7',
    'Beneficiario 8',
    'Beneficiario 9',
    'Beneficiario 10',
  ];
  return nombres[index] || `Beneficiario ${index + 1}`;
}

function generarEmailBeneficiario(proyectoId: string, index: number): string {
  return `beneficiario-${proyectoId.slice(0, 8)}-${index + 1}@proyecto.local`;
}

async function asignarBeneficiarios() {
  try {
    console.log('🔄 Obteniendo todos los proyectos...');
    const proyectos = await prisma.proyecto.findMany();

    if (proyectos.length === 0) {
      console.log('⚠️  No hay proyectos en la base de datos');
      return;
    }

    console.log(`📋 Encontrados ${proyectos.length} proyectos`);

    for (const proyecto of proyectos) {
      console.log(`\n📦 Procesando proyecto: ${proyecto.proyecto}`);

      // Verificar si ya tiene beneficiarios
      const beneficiariosExistentes = await prisma.proyectoParticipante.count({
        where: {
          proyectoId: proyecto.id,
          rol: 'Beneficiario',
        },
      });

      if (beneficiariosExistentes >= 10) {
        console.log(
          `  ⏭️  Ya tiene ${beneficiariosExistentes} beneficiarios, saltando...`
        );
        continue;
      }

      // Asignar 10 Beneficiarios
      const beneficiarios = [];
      for (let i = 0; i < 10; i++) {
        beneficiarios.push({
          proyectoId: proyecto.id,
          userId: null,
          rol: 'Beneficiario',
          nombre: generarNombreBeneficiario(i),
          email: generarEmailBeneficiario(proyecto.id, i),
        });
      }

      await prisma.proyectoParticipante.createMany({
        data: beneficiarios,
        skipDuplicates: true,
      });

      console.log(`  ✅ Asignados: 10 Beneficiarios`);
    }

    console.log('\n✨ ¡Proceso completado exitosamente!');
  } catch (error) {
    console.error('❌ Error al asignar beneficiarios:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
asignarBeneficiarios().catch((error) => {
  console.error(error);
  process.exit(1);
});
