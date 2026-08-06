'use server';

import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Role } from '@/lib/auth-utils';
import {
  hasAccount,
  updatePersonaProfile,
  getRolesConParticipacionActivaAlQuitar,
} from '@/lib/personas/sync-persona';
import { requireAdmin } from '@/lib/authz/guards';
import {
  getConfigUnlockPassword,
  secretsMatch,
} from '@/lib/secrets/env-secrets';

const SALT_ROUNDS = 10;

export type UserListRow = {
  id: string;
  name: string | null;
  email: string;
  rut: string | null;
  cargo: string | null;
  sedeId: string | null;
  sedeNombre: string | null;
  escuelaId: string | null;
  escuelaNombre: string | null;
  hasAccount: boolean;
  lastSessionExpires: Date | null;
  roles: string[];
  proyectos: { proyectoNombre: string; rol: string }[];
};

export type UserListRowWithPassword = UserListRow & {
  passwordPlain: string | null;
};

export type RoleRemovalConflict = {
  rol: string;
  proyectos: { proyectoId: string; proyectoNombre: string }[];
};

function unlockConfiguredOrError():
  | { ok: true; password: string }
  | { ok: false; error: string } {
  const password = getConfigUnlockPassword();
  if (!password) {
    return {
      ok: false,
      error:
        'CONFIG_UNLOCK_PASSWORD no está configurada en el servidor',
    };
  }
  return { ok: true, password };
}

/** Mapa id -> última actividad (desde BD por raw para no depender del cliente Prisma). */
async function getLastActiveByUserId(
  userIds: string[]
): Promise<Map<string, Date | null>> {
  const map = new Map<string, Date | null>();
  if (userIds.length === 0) return map;
  try {
    const { Prisma } = await import('@prisma/client');
    const raw = await prisma.$queryRaw<
      { id: string; last_active_at: Date | null }[]
    >`
      SELECT id, last_active_at FROM users
      WHERE id IN (${Prisma.join(userIds)})
    `;
    raw.forEach((r) => map.set(r.id, r.last_active_at));
  } catch {
    // Columna puede no existir en BD antigua
  }
  return map;
}

/**
 * Listar usuarios para el panel de administración (solo Admin).
 * Incluye participaciones por userId y por email (userId null), para que aparezcan todos los roles por proyecto.
 */
export async function listUsersAdmin(): Promise<{
  success: boolean;
  data?: UserListRow[];
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const [users, participacionesPorEmail] = await Promise.all([
      prisma.user.findMany({
        orderBy: { email: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          rut: true,
          cargo: true,
          sedeId: true,
          escuelaId: true,
          password: true,
          sede: { select: { nombre: true } },
          escuela: { select: { nombre: true } },
          roles: { select: { role: true } },
          proyectos: {
            orderBy: [
              { proyecto: { proyecto: 'asc' } },
              { rol: 'asc' },
            ],
            select: {
              rol: true,
              proyecto: { select: { proyecto: true } },
            },
          },
          sessions: {
            orderBy: { expires: 'desc' },
            take: 1,
            select: { expires: true },
          },
        },
      }),
      prisma.proyectoParticipante.findMany({
        where: { userId: null, email: { not: null } },
        select: {
          email: true,
          rol: true,
          proyecto: { select: { proyecto: true } },
        },
      }),
    ]);
    const lastActiveById = await getLastActiveByUserId(users.map((u) => u.id));

    const emailLowerToParticipaciones = new Map<string, { proyectoNombre: string; rol: string }[]>();
    for (const p of participacionesPorEmail) {
      if (!p.email) continue;
      const key = p.email.trim().toLowerCase();
      if (!emailLowerToParticipaciones.has(key)) emailLowerToParticipaciones.set(key, []);
      emailLowerToParticipaciones.get(key)!.push({
        proyectoNombre: p.proyecto.proyecto,
        rol: p.rol,
      });
    }

    const rows: UserListRow[] = users.map((u) => {
      const porUserId = u.proyectos.map((p) => ({
        proyectoNombre: p.proyecto.proyecto,
        rol: p.rol,
      }));
      const porEmail = emailLowerToParticipaciones.get(u.email.trim().toLowerCase()) ?? [];
      const merged = [...porUserId];
      const seen = new Set(porUserId.map((x) => `${x.proyectoNombre}\t${x.rol}`));
      for (const x of porEmail) {
        const key = `${x.proyectoNombre}\t${x.rol}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(x);
        }
      }
      merged.sort((a, b) =>
        a.proyectoNombre.localeCompare(b.proyectoNombre) || a.rol.localeCompare(b.rol)
      );
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        rut: u.rut,
        cargo: u.cargo,
        sedeId: u.sedeId,
        sedeNombre: u.sede?.nombre ?? null,
        escuelaId: u.escuelaId,
        escuelaNombre: u.escuela?.nombre ?? null,
        hasAccount: hasAccount(u),
        lastSessionExpires:
          lastActiveById.get(u.id) ?? u.sessions[0]?.expires ?? null,
        roles: u.roles.map((r) => r.role),
        proyectos: merged,
      };
    });

    return { success: true, data: rows };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al listar usuarios' };
  }
}

/**
 * Verificar contraseña de desbloqueo para edición de contraseñas.
 */
export async function verifyConfigUnlock(password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const configured = unlockConfiguredOrError();
  if (!configured.ok) return { success: false, error: configured.error };

  if (secretsMatch(password, configured.password)) {
    return { success: true };
  }
  return { success: false, error: 'Contraseña incorrecta' };
}

/**
 * Listar usuarios tras desbloqueo admin.
 * Passwords are never returned in plaintext (reversible storage removed).
 */
export async function listUsersAdminWithPasswords(
  unlockPassword: string
): Promise<{
  success: boolean;
  data?: UserListRowWithPassword[];
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const configured = unlockConfiguredOrError();
  if (!configured.ok) return { success: false, error: configured.error };
  if (!secretsMatch(unlockPassword, configured.password)) {
    return { success: false, error: 'Contraseña incorrecta' };
  }
  try {
    const [users, participacionesPorEmail] = await Promise.all([
      prisma.user.findMany({
        orderBy: { email: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          rut: true,
          cargo: true,
          sedeId: true,
          escuelaId: true,
          password: true,
          sede: { select: { nombre: true } },
          escuela: { select: { nombre: true } },
          roles: { select: { role: true } },
          proyectos: {
            orderBy: [
              { proyecto: { proyecto: 'asc' } },
              { rol: 'asc' },
            ],
            select: {
              rol: true,
              proyecto: { select: { proyecto: true } },
            },
          },
          sessions: {
            orderBy: { expires: 'desc' },
            take: 1,
            select: { expires: true },
          },
        },
      }),
      prisma.proyectoParticipante.findMany({
        where: { userId: null, email: { not: null } },
        select: {
          email: true,
          rol: true,
          proyecto: { select: { proyecto: true } },
        },
      }),
    ]);
    const lastActiveById = await getLastActiveByUserId(users.map((u) => u.id));

    const emailLowerToParticipaciones = new Map<string, { proyectoNombre: string; rol: string }[]>();
    for (const p of participacionesPorEmail) {
      if (!p.email) continue;
      const key = p.email.trim().toLowerCase();
      if (!emailLowerToParticipaciones.has(key)) emailLowerToParticipaciones.set(key, []);
      emailLowerToParticipaciones.get(key)!.push({
        proyectoNombre: p.proyecto.proyecto,
        rol: p.rol,
      });
    }

    const rows: UserListRowWithPassword[] = users.map((u) => {
      const porUserId = u.proyectos.map((p) => ({
        proyectoNombre: p.proyecto.proyecto,
        rol: p.rol,
      }));
      const porEmail = emailLowerToParticipaciones.get(u.email.trim().toLowerCase()) ?? [];
      const merged = [...porUserId];
      const seen = new Set(porUserId.map((x) => `${x.proyectoNombre}\t${x.rol}`));
      for (const x of porEmail) {
        const key = `${x.proyectoNombre}\t${x.rol}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(x);
        }
      }
      merged.sort((a, b) =>
        a.proyectoNombre.localeCompare(b.proyectoNombre) || a.rol.localeCompare(b.rol)
      );
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        rut: u.rut,
        cargo: u.cargo,
        sedeId: u.sedeId,
        sedeNombre: u.sede?.nombre ?? null,
        escuelaId: u.escuelaId,
        escuelaNombre: u.escuela?.nombre ?? null,
        hasAccount: hasAccount(u),
        lastSessionExpires:
          lastActiveById.get(u.id) ?? u.sessions[0]?.expires ?? null,
        roles: u.roles.map((r) => r.role),
        proyectos: merged,
        passwordPlain: null,
      };
    });

    return { success: true, data: rows };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Error al listar usuarios' };
  }
}

/**
 * Crear usuario desde panel Admin.
 */
export async function createUserAdmin(data: {
  name: string;
  email: string;
  password: string;
  initialRole: Role;
  rut?: string | null;
  cargo?: string | null;
  sedeId?: string | null;
  escuelaId?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const email = data.email.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        password: true,
        rut: true,
        cargo: true,
        sedeId: true,
        escuelaId: true,
      },
    });
    if (existing) {
      if (!hasAccount(existing)) {
        // Activar cuenta pendiente existente
        const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: existing.id },
            data: {
              name: data.name,
              password: hashed,
              rut: data.rut?.trim() || existing.rut,
              cargo: data.cargo?.trim() || existing.cargo,
              sedeId: data.sedeId || existing.sedeId,
              escuelaId: data.escuelaId || existing.escuelaId,
              activeRole: data.initialRole,
            },
          });
          const hasRole = await tx.userRole.findFirst({
            where: { userId: existing.id, role: data.initialRole },
          });
          if (!hasRole) {
            await tx.userRole.create({
              data: { userId: existing.id, role: data.initialRole },
            });
          }
        });
        await updatePersonaProfile(existing.id, {
          name: data.name,
          rut: data.rut?.trim() || existing.rut,
          cargo: data.cargo?.trim() || existing.cargo,
          sedeId: data.sedeId || existing.sedeId,
          escuelaId: data.escuelaId || existing.escuelaId,
        });
        revalidatePath('/configuracion/usuarios');
        return { success: true };
      }
      return { success: false, error: 'Este email ya está registrado' };
    }
    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email,
          password: hashed,
          activeRole: data.initialRole,
          rut: data.rut?.trim() || null,
          cargo: data.cargo?.trim() || null,
          sedeId: data.sedeId || null,
          escuelaId: data.escuelaId || null,
        },
      });
      await tx.userRole.create({
        data: { userId: user.id, role: data.initialRole },
      });
    });
    revalidatePath('/configuracion/usuarios');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al crear usuario' };
  }
}

/**
 * Actualizar perfil centralizado de un usuario (Admin) y cascade a participantes.
 */
export async function updateUserAdmin(
  userId: string,
  data: {
    name?: string;
    email?: string;
    rut?: string | null;
    cargo?: string | null;
    sedeId?: string | null;
    escuelaId?: string | null;
  }
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    if (data.email !== undefined) {
      const email = data.email.trim().toLowerCase();
      const other = await prisma.user.findFirst({
        where: { email: { equals: email, mode: 'insensitive' }, NOT: { id: userId } },
      });
      if (other) {
        return { success: false, error: 'Este email ya está en uso' };
      }
    }
    await updatePersonaProfile(userId, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.rut !== undefined && { rut: data.rut }),
      ...(data.cargo !== undefined && { cargo: data.cargo }),
      ...(data.sedeId !== undefined && { sedeId: data.sedeId }),
      ...(data.escuelaId !== undefined && { escuelaId: data.escuelaId }),
    });
    revalidatePath('/configuracion/usuarios');
    revalidatePath('/proyectos');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al actualizar usuario' };
  }
}

/**
 * Previsualiza conflictos al quitar roles con participación activa en proyectos.
 */
export async function previewUpdateUserRolesAdmin(
  userId: string,
  roles: Role[]
): Promise<{
  success: boolean;
  conflicts?: RoleRemovalConflict[];
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const current = await prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });
    const conflicts = await getRolesConParticipacionActivaAlQuitar(
      userId,
      current.map((r) => r.role),
      roles
    );
    return { success: true, conflicts };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al verificar roles' };
  }
}

/**
 * Actualizar roles habilitados de un usuario (Admin).
 * Reemplaza todos los roles actuales por la lista indicada.
 * Si confirmRemoveConflicts=false y hay participaciones activas, retorna requiresConfirm.
 */
export async function updateUserRolesAdmin(
  userId: string,
  roles: Role[],
  options?: { confirmRemoveConflicts?: boolean }
): Promise<{
  success: boolean;
  error?: string;
  requiresConfirm?: boolean;
  conflicts?: RoleRemovalConflict[];
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const current = await prisma.userRole.findMany({
      where: { userId },
      select: { role: true },
    });
    const conflicts = await getRolesConParticipacionActivaAlQuitar(
      userId,
      current.map((r) => r.role),
      roles
    );
    if (conflicts.length > 0 && !options?.confirmRemoveConflicts) {
      return {
        success: false,
        requiresConfirm: true,
        conflicts,
        error:
          'Hay participaciones activas con roles que se van a deshabilitar. Confirma para continuar (no se eliminan de los proyectos).',
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId } });
      if (roles.length > 0) {
        await tx.userRole.createMany({
          data: roles.map((role) => ({ userId, role })),
        });
      }
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { activeRole: true },
      });
      const newRoleSet = new Set(roles);
      const activeStillValid =
        user?.activeRole && newRoleSet.has(user.activeRole as Role);
      await tx.user.update({
        where: { id: userId },
        data: {
          activeRole: activeStillValid ? user!.activeRole : (roles[0] ?? null),
        },
      });
    });
    revalidatePath('/configuracion/usuarios');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al actualizar roles' };
  }
}

/**
 * Activar cuenta pendiente: asigna contraseña a un User sin password.
 */
export async function activateUserAccountAdmin(
  userId: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    if (!password || password.length < 6) {
      return { success: false, error: 'La contraseña debe tener al menos 6 caracteres' };
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }
    if (hasAccount(user)) {
      return { success: false, error: 'Este usuario ya tiene cuenta creada' };
    }
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    revalidatePath('/configuracion/usuarios');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al crear la cuenta' };
  }
}

/**
 * Actualizar contraseña de un usuario (Admin, requiere desbloqueo previo en UI).
 */
export async function updateUserPasswordAdmin(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  try {
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });
    revalidatePath('/configuracion/usuarios');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al actualizar contraseña' };
  }
}

/**
 * Eliminar un usuario y todo su contenido asociado (Admin). Requiere contraseña de desbloqueo.
 */
export async function deleteUserAdmin(
  userId: string,
  unlockPassword: string
): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const configured = unlockConfiguredOrError();
  if (!configured.ok) return { success: false, error: configured.error };
  if (!secretsMatch(unlockPassword, configured.password)) {
    return { success: false, error: 'Contraseña incorrecta' };
  }
  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    revalidatePath('/configuracion/usuarios');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al eliminar usuario' };
  }
}
