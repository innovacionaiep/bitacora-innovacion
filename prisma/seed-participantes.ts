import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generar nombres y emails únicos para participantes sin cuenta
function generarNombre(
  index: number,
  tipo: 'colaborador' | 'docente' | 'estudiante' | 'beneficiario'
): string {
  const nombres = {
    colaborador: [
      'Juan Pérez',
      'María González',
      'Carlos Rodríguez',
      'Ana Martínez',
      'Luis Sánchez',
    ],
    docente: [
      'Prof. Patricia López',
      'Prof. Roberto Díaz',
      'Prof. Carmen Ruiz',
      'Prof. Fernando Torres',
      'Prof. Laura Vega',
    ],
    estudiante: [
      'Estudiante 1',
      'Estudiante 2',
      'Estudiante 3',
      'Estudiante 4',
      'Estudiante 5',
      'Estudiante 6',
      'Estudiante 7',
      'Estudiante 8',
      'Estudiante 9',
      'Estudiante 10',
      'Estudiante 11',
      'Estudiante 12',
      'Estudiante 13',
      'Estudiante 14',
      'Estudiante 15',
    ],
    beneficiario: [
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
    ],
  };
  return nombres[tipo][index] || `${tipo}-${index + 1}`;
}

function generarEmail(
  proyectoId: string,
  index: number,
  tipo: 'colaborador' | 'docente' | 'estudiante' | 'beneficiario'
): string {
  return `${tipo}-${proyectoId.slice(0, 8)}-${index + 1}@proyecto.local`;
}

async function asignarParticipantes() {
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

      // Asignar 5 Colaboradores
      const colaboradores = [];
      for (let i = 0; i < 5; i++) {
        colaboradores.push({
          proyectoId: proyecto.id,
          userId: null,
          rol: 'Colaborador',
          nombre: generarNombre(i, 'colaborador'),
          email: generarEmail(proyecto.id, i, 'colaborador'),
        });
      }

      // Asignar 5 Docentes
      const docentes = [];
      for (let i = 0; i < 5; i++) {
        docentes.push({
          proyectoId: proyecto.id,
          userId: null,
          rol: 'Docente',
          nombre: generarNombre(i, 'docente'),
          email: generarEmail(proyecto.id, i, 'docente'),
        });
      }

      // Asignar 15 Estudiantes
      const estudiantes = [];
      for (let i = 0; i < 15; i++) {
        estudiantes.push({
          proyectoId: proyecto.id,
          userId: null,
          rol: 'Estudiante',
          nombre: generarNombre(i, 'estudiante'),
          email: generarEmail(proyecto.id, i, 'estudiante'),
        });
      }

      // Asignar 10 Beneficiarios
      const beneficiarios = [];
      for (let i = 0; i < 10; i++) {
        beneficiarios.push({
          proyectoId: proyecto.id,
          userId: null,
          rol: 'Beneficiario',
          nombre: generarNombre(i, 'beneficiario'),
          email: generarEmail(proyecto.id, i, 'beneficiario'),
        });
      }

      // Crear todos los participantes
      const participantes = [
        ...colaboradores,
        ...docentes,
        ...estudiantes,
        ...beneficiarios,
      ];

      await prisma.proyectoParticipante.createMany({
        data: participantes,
        skipDuplicates: true,
      });

      console.log(
        `  ✅ Asignados: 5 Colaboradores, 5 Docentes, 15 Estudiantes, 10 Beneficiarios`
      );
    }

    console.log('\n✨ ¡Proceso completado exitosamente!');
  } catch (error) {
    console.error('❌ Error al asignar participantes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
asignarParticipantes().catch((error) => {
  console.error(error);
  process.exit(1);
});
