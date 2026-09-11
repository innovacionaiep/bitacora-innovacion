import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
  generatePublicLinkToken,
  isPublicLinkActive,
  PUBLIC_LINK_COOKIE,
} from '@/lib/public-link';
import { getPublicLinkTokenOverride } from '@/lib/public-link-context';

export function newPublicLinkToken(): string {
  return generatePublicLinkToken(randomBytes);
}

export async function findActivePublicLinkProyectoId(
  token: string
): Promise<string | null> {
  const link = await prisma.proyectoLinkPublico.findUnique({
    where: { token },
    select: { proyectoId: true, revokedAt: true },
  });
  if (!isPublicLinkActive(link)) return null;
  return link?.proyectoId ?? null;
}

export async function readIncomingPublicLinkToken(): Promise<string | null> {
  const override = getPublicLinkTokenOverride();
  if (override) return override;
  try {
    const store = await cookies();
    return store.get(PUBLIC_LINK_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

export async function setPublicLinkCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(PUBLIC_LINK_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}
