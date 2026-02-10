'use server';

import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { Role } from '@/lib/auth-utils';

const SALT_ROUNDS = 10;
const CONFIG_UNLOCK_PASSWORD = process.env.CONFIG_UNLOCK_PASSWORD ?? 'bitacora';

const ENCRYPTION_KEY = (() => {
  const secret = process.env.PASSWORD_DISPLAY_SECRET ?? CONFIG_UNLOCK_PASSWORD;
  return crypto.createHash('sha256').update(secret).digest();
})();

export type UserListRow = {
  id: string;
  name: string | null;
  email: string;
  lastSessionExpires: Date | null;
  roles: string[];
  proyectos: { proyectoNombre: string; rol: string }[];
};

export type UserListRowWithPassword = UserListRow & {
  passwordPlain: string | null;
};

function encryptPassword(plain: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, enc]).toString('base64');
}

function decryptPassword(encrypted: string): string | null {
  try {
    const buf = Buffer.from(encrypted, 'base64');
    const iv = buf.subarray(0, 16);
    const data = buf.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    return decipher.update(data) + decipher.final('utf8');
  } catch {
    return null;
  }
}

/** Mapa id -> última actividad (desde BD por raw para no depender del cliente Prisma). */
async function getLastActiveByUserId(): Promise<Map<string, Date | null>> {
  const map = new Map<string, Date | null>();
  try {
    const raw = await prisma.$queryRaw<
      { id: string; last_active_at: Date | null }[]
    >`
      SELECT id, last_active_at FROM users
    `;
    raw.forEach((r) => map.set(r.id, r.last_active_at));
  } catch {
    // Columna puede no existir en BD antigua
  }
  return map;
}

/**
 * Listar usuarios para el panel de administración (solo Admin).
 */
export async function listUsersAdmin(): Promise<{
  success: boolean;
  data?: UserListRow[];
  error?: string;
}> {
  try {
    const [users, lastActiveById] = await Promise.all([
      prisma.user.findMany({
        orderBy: { email: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          roles: { select: { role: true } },
          proyectos: {
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
      getLastActiveByUserId(),
    ]);

    const rows: UserListRow[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      lastSessionExpires:
        lastActiveById.get(u.id) ?? u.sessions[0]?.expires ?? null,
      roles: u.roles.map((r) => r.role),
      proyectos: u.proyectos.map((p) => ({
        proyectoNombre: p.proyecto.proyecto,
        rol: p.rol,
      })),
    }));

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
  if (password === CONFIG_UNLOCK_PASSWORD) {
    return { success: true };
  }
  return { success: false, error: 'Contraseña incorrecta' };
}

/**
 * Listar usuarios con contraseñas en claro (solo si la contraseña de desbloqueo es correcta).
 */
export async function listUsersAdminWithPasswords(
  unlockPassword: string
): Promise<{
  success: boolean;
  data?: UserListRowWithPassword[];
  error?: string;
}> {
  if (unlockPassword !== CONFIG_UNLOCK_PASSWORD) {
    return { success: false, error: 'Contraseña incorrecta' };
  }
  try {
    const [users, lastActiveById] = await Promise.all([
      prisma.user.findMany({
        orderBy: { email: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          passwordEncrypted: true,
          roles: { select: { role: true } },
          proyectos: {
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
      getLastActiveByUserId(),
    ]);

    const rows: UserListRowWithPassword[] = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      lastSessionExpires:
        lastActiveById.get(u.id) ?? u.sessions[0]?.expires ?? null,
      roles: u.roles.map((r) => r.role),
      proyectos: u.proyectos.map((p) => ({
        proyectoNombre: p.proyecto.proyecto,
        rol: p.rol,
      })),
      passwordPlain: u.passwordEncrypted
        ? decryptPassword(u.passwordEncrypted)
        : null,
    }));

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
}): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return { success: false, error: 'Este email ya está registrado' };
    }
    const hashed = await bcrypt.hash(data.password, SALT_ROUNDS);
    const encrypted = encryptPassword(data.password);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email,
          password: hashed,
          passwordEncrypted: encrypted,
          activeRole: data.initialRole,
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
 * Actualizar nombre y email de un usuario (Admin).
 */
export async function updateUserAdmin(
  userId: string,
  data: { name?: string; email?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (data.email !== undefined) {
      const other = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: userId } },
      });
      if (other) {
        return { success: false, error: 'Este email ya está en uso' };
      }
    }
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
      },
    });
    revalidatePath('/configuracion/usuarios');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al actualizar usuario' };
  }
}

/**
 * Actualizar contraseña de un usuario (Admin, requiere desbloqueo previo en UI).
 */
export async function updateUserPasswordAdmin(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const encrypted = encryptPassword(newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, passwordEncrypted: encrypted },
    });
    revalidatePath('/configuracion/usuarios');
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: 'Error al actualizar contraseña' };
  }
}
