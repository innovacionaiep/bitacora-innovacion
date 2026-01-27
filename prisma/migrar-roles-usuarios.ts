/**
 * Script de migración de roles de usuario
 * 
 * Este script migra los roles antiguos a los nuevos roles según docs/SISTEMA-ROLES.md
 * 
 * Migraciones:
 * - 'Evaluador' -> 'Coordinador' (rol más similar en permisos)
 * - 'Participante' -> 'Estudiante' (rol por defecto para participantes)
 * 
 * Ejecutar con: npx ts-node prisma/migrar-roles-usuarios.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrarRolesUsuarios() {
  console.log('🔄 Iniciando migración de roles de usuario...');
  console.log('📖 Ver docs/SISTEMA-ROLES.md para documentación de roles\n');

  try {
    // 1. Migrar roles de cuenta (UserRole) - Evaluador -> Coordinador
    console.log('1️⃣ Migrando roles de cuenta: Evaluador -> Coordinador');
    const evaluadoresActualizados = await prisma.userRole.updateMany({
      where: { role: 'Evaluador' },
      data: { role: 'Coordinador' }
    });
    console.log(`   ✅ ${evaluadoresActualizados.count} roles "Evaluador" migrados a "Coordinador"`);

    // 2. Migrar roles de cuenta (UserRole) - Participante -> Estudiante
    console.log('\n2️⃣ Migrando roles de cuenta: Participante -> Estudiante');
    const participantesActualizados = await prisma.userRole.updateMany({
      where: { role: 'Participante' },
      data: { role: 'Estudiante' }
    });
    console.log(`   ✅ ${participantesActualizados.count} roles "Participante" migrados a "Estudiante"`);

    // 3. Actualizar activeRole de usuarios con Evaluador
    console.log('\n3️⃣ Actualizando activeRole de usuarios con Evaluador');
    const usuariosEvaluador = await prisma.user.updateMany({
      where: { activeRole: 'Evaluador' },
      data: { activeRole: 'Coordinador' }
    });
    console.log(`   ✅ ${usuariosEvaluador.count} usuarios con activeRole "Evaluador" actualizados a "Coordinador"`);

    // 4. Actualizar activeRole de usuarios con Participante
    console.log('\n4️⃣ Actualizando activeRole de usuarios con Participante');
    const usuariosParticipante = await prisma.user.updateMany({
      where: { activeRole: 'Participante' },
      data: { activeRole: 'Estudiante' }
    });
    console.log(`   ✅ ${usuariosParticipante.count} usuarios con activeRole "Participante" actualizados a "Estudiante"`);

    // 5. Migrar roles de proyecto (ProyectoParticipante) - Participante -> Estudiante
    console.log('\n5️⃣ Migrando roles de proyecto: Participante -> Estudiante');
    const participantesProyecto = await prisma.proyectoParticipante.updateMany({
      where: { rol: 'Participante' },
      data: { rol: 'Estudiante' }
    });
    console.log(`   ✅ ${participantesProyecto.count} participantes de proyecto con rol "Participante" migrados a "Estudiante"`);

    // 6. Eliminar duplicados de roles (si existen)
    console.log('\n6️⃣ Verificando y eliminando duplicados de roles...');
    
    // Obtener todos los usuarios con sus roles
    const usuariosConRoles = await prisma.user.findMany({
      include: { roles: true }
    });

    let duplicadosEliminados = 0;
    for (const usuario of usuariosConRoles) {
      const rolesUnicos = new Set<string>();
      const rolesAEliminar: string[] = [];

      for (const userRole of usuario.roles) {
        if (rolesUnicos.has(userRole.role)) {
          rolesAEliminar.push(userRole.id);
        } else {
          rolesUnicos.add(userRole.role);
        }
      }

      if (rolesAEliminar.length > 0) {
        await prisma.userRole.deleteMany({
          where: { id: { in: rolesAEliminar } }
        });
        duplicadosEliminados += rolesAEliminar.length;
      }
    }
    console.log(`   ✅ ${duplicadosEliminados} roles duplicados eliminados`);

    // Resumen
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`Roles de cuenta migrados:`);
    console.log(`  - Evaluador -> Coordinador: ${evaluadoresActualizados.count}`);
    console.log(`  - Participante -> Estudiante: ${participantesActualizados.count}`);
    console.log(`Usuarios actualizados (activeRole):`);
    console.log(`  - Evaluador -> Coordinador: ${usuariosEvaluador.count}`);
    console.log(`  - Participante -> Estudiante: ${usuariosParticipante.count}`);
    console.log(`Participantes de proyecto migrados:`);
    console.log(`  - Participante -> Estudiante: ${participantesProyecto.count}`);
    console.log(`Duplicados eliminados: ${duplicadosEliminados}`);
    console.log('='.repeat(60));
    console.log('\n✅ Migración completada exitosamente');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrarRolesUsuarios()
  .then(() => {
    console.log('\n🎉 Script finalizado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
