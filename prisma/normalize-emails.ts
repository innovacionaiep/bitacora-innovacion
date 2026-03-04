/**
 * Script para normalizar todos los emails de usuarios a minúsculas.
 * Ejecutar con: pnpm run prisma:normalize-emails
 *
 * Detecta y reporta conflictos cuando dos cuentas diferirían solo por mayúsculas
 * (ej. User@Test.com y user@test.com no pueden colapsar en uno).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true },
  });

  if (users.length === 0) {
    console.log('No hay usuarios en la base de datos.');
    return;
  }

  // Agrupar por email en minúsculas para detectar conflictos
  const byLower = new Map<string, typeof users>();
  for (const u of users) {
    const lower = u.email.trim().toLowerCase();
    if (!byLower.has(lower)) byLower.set(lower, []);
    byLower.get(lower)!.push(u);
  }

  const conflicts: Array<{ canonical: string; users: typeof users }> = [];
  const toUpdate: Array<{ id: string; oldEmail: string; newEmail: string }> = [];

  for (const [lower, list] of byLower) {
    if (list.length > 1) {
      conflicts.push({ canonical: lower, users: list });
    } else {
      const u = list[0]!;
      if (u.email !== lower) {
        toUpdate.push({ id: u.id, oldEmail: u.email, newEmail: lower });
      }
    }
  }

  if (conflicts.length > 0) {
    console.log('\n⚠️  Conflictos (dos o más cuentas con el mismo email en distinta capitalización):\n');
    for (const { canonical, users: list } of conflicts) {
      console.log(`   Email normalizado: ${canonical}`);
      for (const u of list) {
        console.log(`      - id: ${u.id}, nombre: ${u.name ?? '(sin nombre)'}, email actual: ${u.email}`);
      }
      console.log('');
    }
    console.log('   No se puede normalizar automáticamente. Resuelve manualmente (fusiona o elimina cuentas) y vuelve a ejecutar.\n');
    process.exit(1);
  }

  if (toUpdate.length === 0) {
    console.log('✅ Todos los emails ya están en minúsculas. No hay nada que actualizar.');
    return;
  }

  console.log(`\n📧 Normalizando ${toUpdate.length} email(s) a minúsculas:\n`);
  for (const { id, oldEmail, newEmail } of toUpdate) {
    console.log(`   ${oldEmail}  →  ${newEmail}`);
    await prisma.user.update({
      where: { id },
      data: { email: newEmail },
    });
  }
  console.log('\n✅ Normalización completada.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
