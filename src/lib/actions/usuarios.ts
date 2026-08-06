'use server';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getCurrentUser, type Role, AVAILABLE_ROLES } from '@/lib/auth-utils';

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
 * No trae el hash de password: solo un booleano hasAccount.
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

    const users = await prisma.$queryRaw<
      Array<{
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
      }>
    >(Prisma.sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.rut,
        u.cargo,
        u.sede_id AS "sedeId",
        u.escuela_id AS "escuelaId",
        s.nombre AS "sedeNombre",
        e.nombre AS "escuelaNombre",
        (u.password IS NOT NULL AND length(u.password) > 0) AS "hasAccount"
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id AND ur.role = ${role}
      LEFT JOIN sedes s ON s.id = u.sede_id
      LEFT JOIN escuelas e ON e.id = u.escuela_id
      ORDER BY u.name ASC NULLS LAST, u.email ASC
    `);

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
        sedeNombre: u.sedeNombre,
        escuelaNombre: u.escuelaNombre,
        hasAccount: Boolean(u.hasAccount),
      })),
    };
  } catch (error) {
    console.error('Error listing users by role:', error);
    return { success: false, error: 'Error al listar usuarios' };
  }
}
