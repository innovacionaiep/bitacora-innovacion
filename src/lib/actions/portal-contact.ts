'use server';

import nodemailer from 'nodemailer';
import { headers } from 'next/headers';
import prisma from '@/lib/prisma';
import { resolvePortalAccess } from '@/lib/actions/portal-guest';
import { portalCanSeeView } from '@/lib/portal-guest-access';
import {
  allowPortalContactHit,
  buildPortalContactSendPayload,
  validatePortalContactInput,
} from '@/lib/portal-contact';
import { readPortalContactHtmlTemplate } from '@/lib/portal-contact-template-store';
import { readPortalOutlookCredentials } from '@/lib/portal-outlook-settings-store';

function clientKeyFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headerList.get('x-real-ip')?.trim() || 'unknown';
}

export async function sendPortalContactEmail(input: {
  proyectoId: string;
  remitente: string;
  mensaje: string;
  nombre: string;
  cargo: string;
  institucion: string;
  to?: string;
}): Promise<{ success: boolean; error?: string }> {
  const access = await resolvePortalAccess();
  if (
    access.kind === 'none' ||
    !portalCanSeeView(access.level, 'proyectos', access.profile)
  ) {
    return {
      success: false,
      error: 'Inicia sesión o ingresa un código de invitado',
    };
  }

  const validated = validatePortalContactInput({
    remitente: input.remitente,
    mensaje: input.mensaje,
    nombre: input.nombre,
    cargo: input.cargo,
    institucion: input.institucion,
  });
  if (!validated.ok) {
    return { success: false, error: validated.error };
  }

  const proyectoId =
    typeof input.proyectoId === 'string' ? input.proyectoId.trim() : '';
  if (!proyectoId) {
    return { success: false, error: 'Proyecto no encontrado' };
  }

  const headerList = await headers();
  if (!allowPortalContactHit(clientKeyFromHeaders(headerList))) {
    return {
      success: false,
      error: 'Demasiados envíos seguidos. Espera un momento.',
    };
  }

  const creds = await readPortalOutlookCredentials();
  if (!creds) {
    return {
      success: false,
      error: 'El envío de correo aún no está configurado',
    };
  }

  const proyecto = await prisma.vitrinaProyecto.findUnique({
    where: { id: proyectoId },
    select: { nombre: true, encargadoCorreo: true },
  });
  if (!proyecto) {
    return { success: false, error: 'Proyecto no encontrado' };
  }

  const htmlTemplate = await readPortalContactHtmlTemplate();
  const mail = buildPortalContactSendPayload({
    smtpUser: creds.user,
    proyectoNombre: proyecto.nombre,
    encargadoCorreo: proyecto.encargadoCorreo,
    remitente: validated.remitente,
    mensaje: validated.mensaje,
    nombre: validated.nombre,
    cargo: validated.cargo,
    institucion: validated.institucion,
    htmlTemplate,
  });

  try {
    const transport = nodemailer.createTransport({
      host: creds.host,
      port: creds.port,
      secure: creds.secure,
      auth: { user: creds.user, pass: creds.pass },
    });
    await transport.sendMail({
      from: mail.from,
      to: mail.to,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
