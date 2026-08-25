'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth-utils';
import { requireAdmin } from '@/lib/authz/guards';
import {
  guestTicketStillValid,
  matchPortalGuestCode,
  portalGuestConfiguredFlags,
  portalReadLevelForSessionRoles,
  type PortalAccess,
  type PortalGuestHashes,
  type PortalGuestLevel,
} from '@/lib/portal-guest-access';
import {
  readPortalGuestTicket,
  writePortalGuestTicket,
} from '@/lib/portal-guest-cookie';
import { revalidatePortalPaths } from '@/lib/portal-guest-settings';
import {
  readPortalGuestHashes,
  writePortalGuestHashes,
} from '@/lib/portal-guest-settings-store';
import { PORTAL_GUEST_SALT_ROUNDS } from '@/lib/portal-guest-settings';

function revalidatePortal() {
  for (const path of revalidatePortalPaths()) {
    revalidatePath(path);
  }
}

export async function resolvePortalAccess(): Promise<PortalAccess> {
  const session = await getSession();
  if (session?.user) {
    return {
      kind: 'session',
      level: portalReadLevelForSessionRoles(session.user.availableRoles),
    };
  }

  const ticket = await readPortalGuestTicket();
  if (!ticket) return { kind: 'none', level: 0 };

  const hashes = await readPortalGuestHashes();
  if (!guestTicketStillValid(ticket, hashes)) {
    return { kind: 'none', level: 0 };
  }
  return { kind: 'guest', level: ticket.level };
}

export async function redeemPortalGuestCode(code: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const hashes = await readPortalGuestHashes();
  const ticket = await matchPortalGuestCode(code, hashes, (plain, hash) =>
    bcrypt.compare(plain, hash),
  );
  if (!ticket) {
    return { success: false, error: 'Código inválido' };
  }
  const wrote = await writePortalGuestTicket(ticket);
  if (!wrote) {
    return { success: false, error: 'No se pudo guardar la sesión de invitado' };
  }
  revalidatePortal();
  return { success: true };
}

export async function getPortalGuestSettings(): Promise<{
  success: boolean;
  data?: { 1: boolean; 2: boolean; 3: boolean };
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const hashes = await readPortalGuestHashes();
  return { success: true, data: portalGuestConfiguredFlags(hashes) };
}

export async function savePortalGuestSettings(input: {
  codes: Partial<Record<PortalGuestLevel, string>>;
  clear?: Partial<Record<PortalGuestLevel, boolean>>;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const current = await readPortalGuestHashes();
  const next: PortalGuestHashes = { ...current };

  for (const level of [1, 2, 3] as const) {
    if (input.clear?.[level]) {
      next[level] = '';
      continue;
    }
    const typed = input.codes[level]?.trim() ?? '';
    if (!typed) continue;
    next[level] = await bcrypt.hash(typed, PORTAL_GUEST_SALT_ROUNDS);
  }

  try {
    await writePortalGuestHashes(next);
    revalidatePortal();
    return { success: true };
  } catch (e) {
    console.error('[portal] savePortalGuestSettings', e);
    return { success: false, error: 'No se pudo guardar los códigos' };
  }
}
