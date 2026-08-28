'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth-utils';
import { requireAdmin } from '@/lib/authz/guards';
import {
  guestTicketStillValid,
  matchPortalGuestCode,
  parsePortalSessionRoleLevels,
  portalGuestConfiguredFlags,
  portalReadLevelForSessionRoles,
  PORTAL_GUEST_LEVELS,
  type PortalAccess,
  type PortalGuestHashes,
  type PortalGuestLevel,
  type PortalSessionRoleLevels,
} from '@/lib/portal-guest-access';
import {
  readPortalGuestTicket,
  writePortalGuestTicket,
  clearPortalGuestCookie,
} from '@/lib/portal-guest-cookie';
import { revalidatePortalPaths } from '@/lib/portal-guest-settings';
import {
  readPortalGuestHashes,
  readPortalSessionRoleLevels,
  writePortalGuestHashes,
  writePortalSessionRoleLevels,
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
    const roleLevels = await readPortalSessionRoleLevels();
    return {
      kind: 'session',
      level: portalReadLevelForSessionRoles(
        session.user.availableRoles,
        roleLevels,
      ),
    };
  }

  const ticket = await readPortalGuestTicket();
  if (!ticket) return { kind: 'none', level: null };

  const hashes = await readPortalGuestHashes();
  if (!guestTicketStillValid(ticket, hashes)) {
    return { kind: 'none', level: null };
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

export async function leavePortalGuestSession(): Promise<{
  success: boolean;
}> {
  await clearPortalGuestCookie();
  revalidatePortal();
  return { success: true };
}

export async function getPortalGuestSettings(): Promise<{
  success: boolean;
  data?: { 0: boolean; 1: boolean; 2: boolean; 3: boolean };
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

  for (const level of PORTAL_GUEST_LEVELS) {
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

export async function getPortalSessionRoleSettings(): Promise<{
  success: boolean;
  data?: PortalSessionRoleLevels;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };
  const levels = await readPortalSessionRoleLevels();
  return { success: true, data: levels };
}

export async function savePortalSessionRoleSettings(input: {
  levels: PortalSessionRoleLevels;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const next = parsePortalSessionRoleLevels(JSON.stringify(input.levels));
  try {
    await writePortalSessionRoleLevels(next);
    revalidatePortal();
    return { success: true };
  } catch (e) {
    console.error('[portal] savePortalSessionRoleSettings', e);
    return { success: false, error: 'No se pudo guardar los accesos por rol' };
  }
}
