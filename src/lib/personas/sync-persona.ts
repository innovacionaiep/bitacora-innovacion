import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { Role } from '@/lib/auth-utils';

/** Roles de participante que se sincronizan con User / UserRole. Excluye Admin y Beneficiario. */
export const SYNCABLE_ROLES = [
  'Encargado',
  'Coordinador',
  'Colaborador',
  'Docente',
  'Estudiante',
] as const;

export type SyncableRole = (typeof SYNCABLE_ROLES)[number];

export type PersonaProfileFields = {
  name?: string | null;
  email?: string;
  rut?: string | null;
  cargo?: string | null;
  sedeId?: string | null;
  escuelaId?: string | null;
};

export function isSyncableRole(rol: string): rol is SyncableRole {
  return (SYNCABLE_ROLES as readonly string[]).includes(rol);
}

export function hasAccount(user: { password?: string | null }): boolean {
  return user.password != null && user.password.length > 0;
}

type Tx = Prisma.TransactionClient;

async function ensureUserRole(
  userId: string,
  rol: string,
  tx: Tx | typeof prisma = prisma
): Promise<void> {
  if (!isSyncableRole(rol) && rol !== 'Admin') return;
  if (rol === 'Admin') {
    const existing = await tx.userRole.findFirst({
      where: { userId, role: 'Admin' },
    });
    if (!existing) {
      await tx.userRole.create({ data: { userId, role: 'Admin' } });
    }
    return;
  }
  const existing = await tx.userRole.findFirst({
    where: { userId, role: rol },
  });
  if (!existing) {
    await tx.userRole.create({ data: { userId, role: rol } });
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { activeRole: true },
    });
    if (!user?.activeRole) {
      await tx.user.update({
        where: { id: userId },
        data: { activeRole: rol },
      });
    }
  }
}

/**
 * Crea o actualiza un User pendiente/existente a partir de datos de participante syncable.
 * Habilita el UserRole correspondiente. No aplica a Beneficiario.
 */
export async function upsertPersonaFromParticipante(input: {
  email: string;
  nombre?: string | null;
  rut?: string | null;
  cargo?: string | null;
  sedeId?: string | null;
  escuelaId?: string | null;
  rol: string;
  tx?: Tx;
}): Promise<{ userId: string; email: string; name: string | null }> {
  const db = input.tx ?? prisma;
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error('Email obligatorio para centralizar persona');
  }

  const existing = await db.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: {
      id: true,
      email: true,
      name: true,
      rut: true,
      cargo: true,
      sedeId: true,
      escuelaId: true,
    },
  });

  const nombre = input.nombre?.trim() || null;
  const rut = input.rut?.trim() || null;
  const cargo = input.cargo?.trim() || null;
  const sedeId = input.sedeId || null;
  const escuelaId = input.escuelaId || null;

  let userId: string;
  let resolvedEmail = email;
  let resolvedName: string | null = nombre;

  if (existing) {
    userId = existing.id;
    resolvedEmail = existing.email;
    resolvedName = nombre || existing.name;
    await db.user.update({
      where: { id: existing.id },
      data: {
        ...(nombre ? { name: nombre } : {}),
        ...(rut != null ? { rut } : {}),
        ...(cargo != null ? { cargo } : {}),
        ...(sedeId != null ? { sedeId } : {}),
        ...(escuelaId != null ? { escuelaId } : {}),
      },
    });
  } else {
    const created = await db.user.create({
      data: {
        email,
        name: nombre,
        password: null,
        rut,
        cargo,
        sedeId,
        escuelaId,
        activeRole: isSyncableRole(input.rol) ? input.rol : null,
      },
      select: { id: true, email: true, name: true },
    });
    userId = created.id;
    resolvedEmail = created.email;
    resolvedName = created.name;
  }

  if (isSyncableRole(input.rol)) {
    await ensureUserRole(userId, input.rol, db);
  }

  return { userId, email: resolvedEmail, name: resolvedName };
}

/**
 * Actualiza el perfil centralizado y propaga a todos los ProyectoParticipante del userId.
 */
export async function updatePersonaProfile(
  userId: string,
  fields: PersonaProfileFields,
  tx?: Tx
): Promise<void> {
  const db = tx ?? prisma;
  const userData: {
    name?: string | null;
    email?: string;
    rut?: string | null;
    cargo?: string | null;
    sedeId?: string | null;
    escuelaId?: string | null;
  } = {};
  const participantData: Prisma.ProyectoParticipanteUncheckedUpdateManyInput =
    {};

  if (fields.name !== undefined) {
    userData.name = fields.name;
    participantData.nombre = fields.name;
  }
  if (fields.email !== undefined) {
    const email = fields.email.trim().toLowerCase();
    userData.email = email;
    participantData.email = email;
  }
  if (fields.rut !== undefined) {
    userData.rut = fields.rut?.trim() || null;
    participantData.rut = fields.rut?.trim() || null;
  }
  if (fields.cargo !== undefined) {
    userData.cargo = fields.cargo?.trim() || null;
    participantData.cargo = fields.cargo?.trim() || null;
  }
  if (fields.sedeId !== undefined) {
    userData.sedeId = fields.sedeId || null;
    participantData.sedeId = fields.sedeId || null;
  }
  if (fields.escuelaId !== undefined) {
    userData.escuelaId = fields.escuelaId || null;
    participantData.escuelaId = fields.escuelaId || null;
  }

  if (Object.keys(userData).length === 0) return;

  await db.user.update({ where: { id: userId }, data: userData });
  if (Object.keys(participantData).length > 0) {
    await db.proyectoParticipante.updateMany({
      where: { userId },
      data: participantData,
    });
  }
}

export async function ensureSyncableUserRole(
  userId: string,
  rol: string,
  tx?: Tx
): Promise<void> {
  if (!isSyncableRole(rol)) return;
  await ensureUserRole(userId, rol, tx ?? prisma);
}

/**
 * Participaciones activas con un rol syncable (para alerta al quitar rol de cuenta).
 */
export async function getParticipacionesActivasPorRol(
  userId: string,
  rol: string
): Promise<{ proyectoId: string; proyectoNombre: string }[]> {
  const rows = await prisma.proyectoParticipante.findMany({
    where: { userId, rol },
    select: {
      proyectoId: true,
      proyecto: { select: { proyecto: true } },
    },
    orderBy: { proyecto: { proyecto: 'asc' } },
  });
  return rows.map((r) => ({
    proyectoId: r.proyectoId,
    proyectoNombre: r.proyecto.proyecto,
  }));
}

/**
 * Roles syncables que se van a quitar y tienen participación activa.
 */
export async function getRolesConParticipacionActivaAlQuitar(
  userId: string,
  currentRoles: string[],
  nextRoles: string[]
): Promise<
  { rol: string; proyectos: { proyectoId: string; proyectoNombre: string }[] }[]
> {
  const nextSet = new Set(nextRoles);
  const removed = currentRoles.filter(
    (r) => isSyncableRole(r) && !nextSet.has(r)
  );
  const result: {
    rol: string;
    proyectos: { proyectoId: string; proyectoNombre: string }[];
  }[] = [];
  for (const rol of removed) {
    const proyectos = await getParticipacionesActivasPorRol(userId, rol);
    if (proyectos.length > 0) {
      result.push({ rol, proyectos });
    }
  }
  return result;
}

export type { Role };
