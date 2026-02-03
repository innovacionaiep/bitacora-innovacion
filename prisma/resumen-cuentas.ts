import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generarResumenCuentas() {
  try {
    console.log('🔍 Consultando usuarios con roles y proyectos...\n');

    // Obtener todos los usuarios con sus roles y participaciones en proyectos
    const users = await prisma.user.findMany({
      include: {
        roles: {
          orderBy: {
            createdAt: 'asc',
          },
        },
        proyectos: {
          include: {
            proyecto: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Total de cuentas encontradas: ${users.length}\n`);
    console.log('═'.repeat(80));
    console.log('');

    if (users.length === 0) {
      console.log('⚠️  No se encontraron cuentas en la base de datos.');
      return;
    }

    // Procesar cada usuario
    users.forEach((user, index) => {
      console.log(`\n👤 CUENTA #${index + 1}`);
      console.log('─'.repeat(80));
      console.log(`   ID: ${user.id}`);
      console.log(`   Nombre: ${user.name || '(Sin nombre)'}`);
      console.log(`   Email: ${user.email}`);
      console.log(
        `   Fecha de creación: ${user.createdAt.toLocaleString('es-CL')}`
      );
      console.log('');

      // Rol activo
      console.log(`   🎭 Rol Activo: ${user.activeRole || '(No asignado)'}`);
      console.log('');

      // Roles habilitados
      const roles = user.roles.map((r) => r.role);
      if (roles.length > 0) {
        console.log(`   ✅ Roles Habilitados (${roles.length}):`);
        roles.forEach((role) => {
          console.log(`      • ${role}`);
        });
      } else {
        console.log('   ⚠️  Roles Habilitados: Ninguno');
      }
      console.log('');

      // Proyectos donde es miembro
      const participaciones = user.proyectos.filter(
        (p) => p.userId === user.id
      );
      if (participaciones.length > 0) {
        console.log(
          `   📁 Proyectos donde es miembro (${participaciones.length}):`
        );
        participaciones.forEach((participacion) => {
          const proyectoNombre = participacion.proyecto.proyecto;
          const rolEnProyecto = participacion.rol;
          const cargo = participacion.cargo
            ? ` - Cargo: ${participacion.cargo}`
            : '';
          console.log(
            `      • ${proyectoNombre} (Rol: ${rolEnProyecto})${cargo}`
          );
        });
      } else {
        console.log('   ⚠️  Proyectos donde es miembro: Ninguno');
      }

      console.log('');
      console.log('═'.repeat(80));
    });

    // Resumen estadístico
    console.log('\n\n📈 RESUMEN ESTADÍSTICO');
    console.log('═'.repeat(80));
    console.log(`   Total de cuentas: ${users.length}`);
    console.log(
      `   Cuentas con roles asignados: ${users.filter((u) => u.roles.length > 0).length}`
    );
    console.log(
      `   Cuentas sin roles: ${users.filter((u) => u.roles.length === 0).length}`
    );
    console.log(
      `   Cuentas en proyectos: ${users.filter((u) => u.proyectos.length > 0).length}`
    );
    console.log(
      `   Cuentas sin proyectos: ${users.filter((u) => u.proyectos.length === 0).length}`
    );

    // Distribución de roles
    const todosLosRoles: string[] = [];
    users.forEach((user) => {
      user.roles.forEach((role) => {
        todosLosRoles.push(role.role);
      });
    });

    const distribucionRoles: Record<string, number> = {};
    todosLosRoles.forEach((role) => {
      distribucionRoles[role] = (distribucionRoles[role] || 0) + 1;
    });

    if (Object.keys(distribucionRoles).length > 0) {
      console.log('\n   📊 Distribución de roles:');
      Object.entries(distribucionRoles)
        .sort((a, b) => b[1] - a[1])
        .forEach(([role, count]) => {
          console.log(`      • ${role}: ${count} cuenta(s)`);
        });
    }

    // Distribución de roles en proyectos
    const rolesEnProyectos: Record<string, number> = {};
    users.forEach((user) => {
      user.proyectos.forEach((participacion) => {
        const rol = participacion.rol;
        rolesEnProyectos[rol] = (rolesEnProyectos[rol] || 0) + 1;
      });
    });

    if (Object.keys(rolesEnProyectos).length > 0) {
      console.log('\n   📊 Distribución de roles en proyectos:');
      Object.entries(rolesEnProyectos)
        .sort((a, b) => b[1] - a[1])
        .forEach(([rol, count]) => {
          console.log(`      • ${rol}: ${count} participación(es)`);
        });
    }

    console.log('\n');
    console.log('═'.repeat(80));

    // Generar tabla resumen
    console.log('\n\n📋 TABLA RESUMEN DE CUENTAS');
    console.log('═'.repeat(80));
    console.log('');

    // Encabezado de la tabla
    console.log(
      '| # | Nombre | Email | Rol Activo | Roles Habilitados | Proyectos (Rol) |'
    );
    console.log(
      '|---|--------|-------|------------|-------------------|-----------------|'
    );

    // Filas de la tabla
    users.forEach((user, index) => {
      const nombre = (user.name || '(Sin nombre)').replace(/\|/g, '\\|');
      const email = user.email.replace(/\|/g, '\\|');
      const rolActivo = (user.activeRole || '(No asignado)').replace(
        /\|/g,
        '\\|'
      );

      // Roles habilitados como lista separada por comas
      const roles = user.roles.map((r) => r.role).join(', ');

      // Proyectos con su rol
      const participaciones = user.proyectos.filter(
        (p) => p.userId === user.id
      );
      const proyectos =
        participaciones.length > 0
          ? participaciones
              .map((p) => {
                const nombreProyecto =
                  p.proyecto.proyecto.length > 40
                    ? p.proyecto.proyecto.substring(0, 37) + '...'
                    : p.proyecto.proyecto;
                return `${nombreProyecto} (${p.rol})`;
              })
              .join('; ')
          : 'Ninguno';

      // Limpiar caracteres especiales para markdown
      const proyectosLimpio = proyectos.replace(/\|/g, '\\|');

      console.log(
        `| ${index + 1} | ${nombre} | ${email} | ${rolActivo} | ${roles} | ${proyectosLimpio} |`
      );
    });

    console.log('');
    console.log('═'.repeat(80));
    console.log('✅ Resumen generado exitosamente');
  } catch (error) {
    console.error('❌ Error al generar el resumen:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  generarResumenCuentas().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

export { generarResumenCuentas };
