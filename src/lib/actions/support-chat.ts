'use server';

import { getSession } from '@/lib/auth-utils';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { roleHasPermission } from '@/lib/permissions/check';

export type SupportMessageRow = {
  id: string;
  contenido: string;
  isFromAdmin: boolean;
  createdAt: Date;
  userId: string;
};

/**
 * Obtiene los mensajes del hilo de soporte de un usuario.
 * - Usuario: solo puede pedir su propio userId (session.user.id).
 * - Admin: puede pedir cualquier userId.
 */
export async function getSupportMessages(
  userId: string
): Promise<{ success: boolean; data?: SupportMessageRow[]; error?: string }> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado' };
  }
  const isSupportAdmin = await roleHasPermission(
    session.user.activeRole,
    'soporte.admin'
  );
  if (!isSupportAdmin && userId !== session.user.id) {
    return { success: false, error: 'Sin permisos' };
  }
  const messages = await prisma.supportMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      contenido: true,
      isFromAdmin: true,
      createdAt: true,
      userId: true,
    },
  });
  return {
    success: true,
    data: messages as SupportMessageRow[],
  };
}

/**
 * Envía un mensaje en el chat de soporte.
 * - Usuario: isFromAdmin false, userId debe ser el suyo.
 * - Admin: isFromAdmin true, userId es el de la conversación que está viendo.
 */
export async function sendSupportMessage(payload: {
  userId: string;
  contenido: string;
  isFromAdmin: boolean;
}): Promise<{
  success: boolean;
  data?: SupportMessageRow;
  error?: string;
}> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado' };
  }
  const { userId, contenido, isFromAdmin } = payload;
  const trimmed = contenido?.trim();
  if (!trimmed) {
    return { success: false, error: 'El mensaje no puede estar vacío' };
  }
  if (isFromAdmin) {
    const isSupportAdmin = await roleHasPermission(
      session.user.activeRole,
      'soporte.admin'
    );
    if (!isSupportAdmin) {
      return { success: false, error: 'Sin permisos' };
    }
  } else {
    if (userId !== session.user.id) {
      return { success: false, error: 'Solo puedes escribir en tu propio chat' };
    }
  }
  const message = await prisma.supportMessage.create({
    data: {
      userId,
      contenido: trimmed,
      isFromAdmin,
    },
    select: {
      id: true,
      contenido: true,
      isFromAdmin: true,
      createdAt: true,
      userId: true,
    },
  });
  revalidatePath('/soporte');
  return { success: true, data: message as SupportMessageRow };
}

export type SupportConversationItem = {
  userId: string;
  userName: string | null;
  userEmail: string;
  lastMessageAt: Date;
  lastMessagePreview: string;
};

/**
 * Lista de conversaciones para el panel admin: usuarios con al menos un mensaje,
 * con último mensaje y fecha, ordenado por última actividad.
 */
export async function getSupportConversationsForAdmin(): Promise<{
  success: boolean;
  data?: SupportConversationItem[];
  error?: string;
}> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { success: false, error: 'No autenticado' };
  }
  const isSupportAdmin = await roleHasPermission(
    session.user.activeRole,
    'soporte.admin'
  );
  if (!isSupportAdmin) {
    return { success: false, error: 'Sin permisos' };
  }
  const messages = await prisma.supportMessage.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      userId: true,
      contenido: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });
  const seen = new Set<string>();
  const list: SupportConversationItem[] = [];
  for (const m of messages) {
    if (seen.has(m.userId)) continue;
    seen.add(m.userId);
    const preview =
      m.contenido.length > 60 ? m.contenido.slice(0, 60) + '…' : m.contenido;
    list.push({
      userId: m.userId,
      userName: m.user.name ?? null,
      userEmail: m.user.email,
      lastMessageAt: m.createdAt,
      lastMessagePreview: preview,
    });
  }
  return { success: true, data: list };
}
