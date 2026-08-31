'use server';

import nodemailer from 'nodemailer';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/authz/guards';
import {
  encryptPortalOutlookPassword,
  getPortalOutlookEncryptionSecret,
  readPortalOutlookCredentials,
  readPortalOutlookStored,
  writePortalOutlookStored,
} from '@/lib/portal-outlook-settings-store';
import {
  maskPortalOutlookPassword,
  normalizePortalOutlookHost,
  normalizePortalOutlookPort,
  normalizePortalOutlookSecure,
  normalizePortalOutlookUser,
  PORTAL_OUTLOOK_DEFAULT_HOST,
  PORTAL_OUTLOOK_DEFAULT_PORT,
  PORTAL_OUTLOOK_DEFAULT_SECURE,
} from '@/lib/portal-outlook-settings';

export type PortalOutlookSettingsView = {
  configured: boolean;
  user: string;
  passwordMasked: string;
  host: string;
  port: number;
  secure: boolean;
};

export async function getPortalOutlookSettings(): Promise<{
  success: boolean;
  data?: PortalOutlookSettingsView;
  error?: string;
}> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const stored = await readPortalOutlookStored();
  const creds = stored ? await readPortalOutlookCredentials() : null;
  return {
    success: true,
    data: {
      configured: Boolean(creds),
      user: stored?.user ?? '',
      passwordMasked: creds ? maskPortalOutlookPassword(creds.pass) : '',
      host: stored?.host || PORTAL_OUTLOOK_DEFAULT_HOST,
      port: stored?.port ?? PORTAL_OUTLOOK_DEFAULT_PORT,
      secure: stored?.secure ?? PORTAL_OUTLOOK_DEFAULT_SECURE,
    },
  };
}

export async function savePortalOutlookSettings(input: {
  user: string;
  password?: string;
  host?: string;
  port?: number | string;
  secure?: boolean;
  clearPassword?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const secret = getPortalOutlookEncryptionSecret();
  if (!secret) {
    return {
      success: false,
      error: 'NEXTAUTH_SECRET no está configurado en el servidor',
    };
  }

  const user = normalizePortalOutlookUser(input.user);
  if (!user) {
    return {
      success: false,
      error: 'Indica el correo de la cuenta Outlook que envía',
    };
  }

  const stored = await readPortalOutlookStored();
  const nextPassword =
    typeof input.password === 'string' ? input.password.trim() : '';

  let enc = stored?.enc ?? '';
  if (input.clearPassword) {
    enc = '';
  } else if (nextPassword) {
    enc = encryptPortalOutlookPassword(nextPassword, secret);
  }

  if (!enc && !input.clearPassword) {
    return {
      success: false,
      error: 'Incluye la contraseña de Outlook (o de aplicación)',
    };
  }

  try {
    await writePortalOutlookStored({
      user,
      enc,
      host: normalizePortalOutlookHost(input.host),
      port: normalizePortalOutlookPort(input.port),
      secure: normalizePortalOutlookSecure(input.secure),
    });
    revalidatePath('/');
    return { success: true };
  } catch (e) {
    console.error('[portal] savePortalOutlookSettings', e);
    return { success: false, error: 'No se pudo guardar la configuración' };
  }
}

export async function testPortalOutlook(input?: {
  user?: string;
  password?: string;
  host?: string;
  port?: number | string;
  secure?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const storedCreds = await readPortalOutlookCredentials();
  const user = normalizePortalOutlookUser(input?.user) || storedCreds?.user || '';
  const password =
    (typeof input?.password === 'string' ? input.password.trim() : '') ||
    storedCreds?.pass ||
    '';
  const host = normalizePortalOutlookHost(input?.host ?? storedCreds?.host);
  const port = normalizePortalOutlookPort(input?.port ?? storedCreds?.port);
  const secure = normalizePortalOutlookSecure(
    input?.secure ?? storedCreds?.secure,
  );

  if (!user || !password) {
    return {
      success: false,
      error: 'Incluye el correo y la contraseña de Outlook',
    };
  }

  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass: password },
    });
    await transport.verify();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
