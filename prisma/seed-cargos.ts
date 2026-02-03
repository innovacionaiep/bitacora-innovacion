import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Cargos predefinidos por rol
const cargosPorRol = {
  Encargado: [
    'Director Académico',
    'Directora Académica',
    'Docente',
    'Estudiante',
    'Jefe de Escuela',
    'Jefa de Escuela',
  ],
  Coordinador: [
    'Subdirector de Innovación',
    'Subdirectora de Emprendimiento',
    'Coordinador de Innovación',
    'Coordinadora de Innovación',
    'Coordinador de Proyectos I+E',
    'Coordinadora de Emprendimiento',
    'Jefe de Ecosistemas y Transferencia',
    'Coordinadora Ecosistema de Innovación',
    'Subdirector de Centros de Negocios SERCOTEC',
    'Jefa de Proyectos Centros de Negocios SERCOTEC',
    'Jefe de Proyectos Centros de Negocios SERCOTEC',
    'Consultor Externo',
  ],
  Colaborador: [
    'Jefe de Escuela',
    'Jefa de Escuela',
    'Director de Sede',
    'Directora de Sede',
    'Jefe Administrativo',
    'Jefa Administrativa',
    'Director Administrativo',
    'Directora Administrativa',
    'Director Académico',
    'Directora Académica',
    'Subdirector Académico',
    'Subdirectora Académica',
    'Jefe Académico',
    'Jefa Académica',
    'Coordinador de Especialidad',
    'Coordinadora de Especialidad',
  ],
  Docente: [
    'Mentor',
    'Acompañante',
    'Coordinador',
    'Relator',
    'Guía',
    'Diseñador',
    'Facilitador',
    'Asesor',
    'Consultor',
    'Instructor',
  ],
  Estudiante: [
    'Diseñador',
    'Consultor',
    'Encargado de encuestas',
    'Ilustrador',
    'Desarrollador',
    'Investigador',
    'Asistente',
    'Colaborador',
    'Analista',
    'Técnico',
  ],
  Beneficiario: [
    'Docente',
    'Estudiante',
    'Estilista',
    'Emprendedor',
    'Emprendedora',
    'Madre',
    'Padre',
    'Deportista',
    'Artista',
    'Comerciante',
    'Agricultor',
    'Agricultora',
    'Técnico',
    'Profesional',
  ],
};

function obtenerCargoAleatorio(rol: string): string {
  const cargos = cargosPorRol[rol as keyof typeof cargosPorRol];
  if (!cargos || cargos.length === 0) {
    return '';
  }
  return cargos[Math.floor(Math.random() * cargos.length)];
}

async function asignarCargos() {
  try {
    console.log('🔄 Obteniendo todos los participantes...');
    const participantes = await prisma.proyectoParticipante.findMany({
      where: {
        cargo: null,
      },
    });

    if (participantes.length === 0) {
      console.log('⚠️  No hay participantes sin cargo en la base de datos');
      return;
    }

    console.log(
      `📋 Encontrados ${participantes.length} participantes sin cargo`
    );

    let actualizados = 0;
    for (const participante of participantes) {
      const cargo = obtenerCargoAleatorio(participante.rol);

      if (cargo) {
        await prisma.proyectoParticipante.update({
          where: { id: participante.id },
          data: { cargo },
        });
        actualizados++;
      }
    }

    console.log(`\n✅ ${actualizados} participantes actualizados con cargo`);
    console.log('✨ ¡Proceso completado exitosamente!');
  } catch (error) {
    console.error('❌ Error al asignar cargos:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
asignarCargos().catch((error) => {
  console.error(error);
  process.exit(1);
});
