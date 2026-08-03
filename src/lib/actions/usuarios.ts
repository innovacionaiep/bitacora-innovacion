'use server';

import prisma from '@/lib/prisma';
import { getCurrentUser, type Role, AVAILABLE_ROLES } from '@/lib/auth-utils';
import { hasAccount } from '@/lib/personas/sync-persona';

export type UserByRoleOption = {
  id: string;
  name: string | null;
  email: string;
  rut: string | null;
  cargo: string | null;
  sedeId: string | null;
  escuelaId: string | null;
  sedeNombre: string | null;
  escuelaNombre: string | null;
  hasAccount: boolean;
};

/**
 * Lista usuarios de la app que tienen el rol de cuenta indicado (UserRole).
 * Incluye cuentas pendientes (sin password). Usado al agregar participantes.
 */
export async function listUsersByAppRole(
  role: Role
): Promise<{
  success: boolean;
  data?: UserByRoleOption[];
  error?: string;
}> {
  try {
    const current = await getCurrentUser();
    if (!current) {
      return { success: false, error: 'No autenticado' };
    }
    if (!AVAILABLE_ROLES.includes(role)) {
      return { success: false, error: 'Rol inválido' };
    }

    const users = await prisma.user.findMany({
      where: { roles: { some: { role } } },
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
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    });

    return {
      success: true,
      data: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        rut: u.rut,
        cargo: u.cargo,
        sedeId: u.sedeId,
        escuelaId: u.escuelaId,
        sedeNombre: u.sede?.nombre ?? null,
        escuelaNombre: u.escuela?.nombre ?? null,
        hasAccount: hasAccount(u),
      })),
    };
  } catch (error) {
    console.error('Error listing users by role:', error);
    return { success: false, error: 'Error al listar usuarios' };
  }
}
