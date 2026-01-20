import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarParticipantes() {
  try {
    const participantes = await prisma.proyectoParticipante.findMany({
      where: {
        OR: [
          { cargo: null },
          { cargo: '' },
        ],
      },
    });

    console.log(`📋 Participantes sin cargo: ${participantes.length}`);
    
    participantes.forEach((p, i) => {
      console.log(`${i + 1}. ID: ${p.id}, Rol: ${p.rol}, Nombre: ${p.nombre || p.userId || 'N/A'}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verificarParticipantes();
