import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from './prisma';

// Tipos de roles disponibles
// Ver docs/SISTEMA-ROLES.md para documentación completa
export type Role = 'Admin' | 'Coordinador' | 'Colaborador' | 'Encargado' | 'Docente' | 'Estudiante' | 'Beneficiario';

export const AVAILABLE_ROLES: Role[] = [
  'Admin',
  'Coordinador',
  'Colaborador',
  'Encargado',
  'Docente',
  'Estudiante',
  'Beneficiario',
];

// Roles disponibles para registro (sin Admin)
export const REGISTER_ROLES: Exclude<Role, 'Admin'>[] = [
  'Coordinador',
  'Colaborador',
  'Encargado',
  'Docente',
  'Estudiante',
  'Beneficiario',
];

/**
 * Obtener la sesión del servidor
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Obtener el usuario autenticado del servidor
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user;
}

/**
 * Verificar si el usuario tiene un rol específico
 */
export async function hasRole(userId: string, role: Role): Promise<boolean> {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role,
    },
  });
  return !!userRole;
}

/**
 * Verificar si el usuario tiene alguno de los roles especificados
 */
export async function hasAnyRole(userId: string, roles: Role[]): Promise<boolean> {
  const userRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        in: roles,
      },
    },
  });
  return !!userRole;
}

/**
 * Obtener todos los roles del usuario
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  const roles = await prisma.userRole.findMany({
    where: {
      userId,
    },
    select: {
      role: true,
    },
  });
  
  return roles.map((r) => r.role as Role);
}

/**
 * Verificar si el rol activo es válido para el usuario
 */
export async function isValidActiveRole(userId: string, role: string): Promise<boolean> {
  const userRoles = await getUserRoles(userId);
  return userRoles.includes(role as Role);
}

