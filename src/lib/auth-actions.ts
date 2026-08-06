'use server';

import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { getUserRoles, isValidActiveRole, type Role } from './auth-utils';
import { isRegisterableRole, userHasAdminEnabled } from '@/lib/authz/pure';
import { requireSelfOrAdmin } from '@/lib/authz/guards';
import { revalidatePath } from 'next/cache';

const SALT_ROUNDS = 10;

/**
 * Registrar un nuevo usuario
 */
export async function signUp(data: {
  email: string;
  password: string;
  name: string;
  initialRole: Role;
}) {
  try {
    if (!isRegisterableRole(data.initialRole)) {
      return {
        success: false,
        error: 'Rol de registro no permitido',
      };
    }

    const email = data.email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'Este email ya está registrado' };
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name: data.name,
          activeRole: data.initialRole,
        },
      });

      await tx.userRole.create({
        data: {
          userId: newUser.id,
          role: data.initialRole,
        },
      });

      return newUser;
    });

    return { success: true, user: { id: user.id, email: user.email } };
  } catch (error) {
    console.error('Error en signUp:', error);
    return { success: false, error: 'Error al crear la cuenta' };
  }
}

/**
 * Agregar un rol a un usuario (self or Admin)
 */
export async function addUserRole(userId: string, role: Role) {
  try {
    const gate = await requireSelfOrAdmin(userId);
    if (!gate.ok) return { success: false, error: gate.error };

    if (role === 'Admin' && !userHasAdminEnabled(gate.user.availableRoles)) {
      return { success: false, error: 'No puedes asignarte el rol Admin' };
    }

    const existingRole = await prisma.userRole.findFirst({
      where: {
        userId,
        role,
      },
    });

    if (existingRole) {
      return { success: false, error: 'El usuario ya tiene este rol' };
    }

    await prisma.userRole.create({
      data: {
        userId,
        role,
      },
    });

    revalidatePath('/perfil');
    return { success: true };
  } catch (error) {
    console.error('Error en addUserRole:', error);
    return { success: false, error: 'Error al agregar rol' };
  }
}

/**
 * Remover un rol de un usuario (self or Admin)
 */
export async function removeUserRole(userId: string, role: Role) {
  try {
    const gate = await requireSelfOrAdmin(userId);
    if (!gate.ok) return { success: false, error: gate.error };

    const userRoles = await getUserRoles(userId);
    if (userRoles.length <= 1) {
      return { success: false, error: 'No puedes eliminar tu último rol' };
    }

    await prisma.userRole.deleteMany({
      where: {
        userId,
        role,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeRole: true },
    });

    if (user?.activeRole === role) {
      const remainingRoles = userRoles.filter((r) => r !== role);
      await prisma.user.update({
        where: { id: userId },
        data: { activeRole: remainingRoles[0] },
      });
    }

    revalidatePath('/perfil');
    return { success: true };
  } catch (error) {
    console.error('Error en removeUserRole:', error);
    return { success: false, error: 'Error al eliminar rol' };
  }
}

/**
 * Actualizar el perfil del usuario (self or Admin)
 */
export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    activeRole?: string;
  }
) {
  try {
    const gate = await requireSelfOrAdmin(userId);
    if (!gate.ok) return { success: false, error: gate.error };

    if (data.activeRole) {
      const isValid = await isValidActiveRole(userId, data.activeRole);
      if (!isValid) {
        return { success: false, error: 'No tienes acceso a este rol' };
      }
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.activeRole !== undefined && { activeRole: data.activeRole }),
      },
    });

    revalidatePath('/perfil');
    return { success: true };
  } catch (error) {
    console.error('Error en updateUserProfile:', error);
    return { success: false, error: 'Error al actualizar perfil' };
  }
}

/**
 * Cambiar el password del usuario (self or Admin)
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  try {
    const gate = await requireSelfOrAdmin(userId);
    if (!gate.ok) return { success: false, error: gate.error };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user || !user.password) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    // Admin resetting another user still needs current password of target —
    // for self-service; Admin password resets go through configuracion-usuarios.
    if (gate.user.id === userId || !userHasAdminEnabled(gate.user.availableRoles)) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return { success: false, error: 'Password actual incorrecto' };
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  } catch (error) {
    console.error('Error en changePassword:', error);
    return { success: false, error: 'Error al cambiar password' };
  }
}

/**
 * Obtener información completa del usuario (self or Admin)
 */
export async function getUserProfile(userId: string) {
  try {
    const gate = await requireSelfOrAdmin(userId);
    if (!gate.ok) return { success: false, error: gate.error };

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        activeRole: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    const roles = await getUserRoles(userId);

    return {
      success: true,
      user: {
        ...user,
        availableRoles: roles,
      },
    };
  } catch (error) {
    console.error('Error en getUserProfile:', error);
    return { success: false, error: 'Error al obtener perfil' };
  }
}
