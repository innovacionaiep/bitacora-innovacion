'use server';

import nodemailer from 'nodemailer';

/**
 * Envío de correo vía SMTP (ej. Outlook/Office 365).
 * Configuración en .env.local: SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS.
 * Para Outlook: SMTP_HOST=smtp.office365.com, SMTP_PORT=587, SMTP_SECURE=false.
 */
export type SendEmailParams = {
  to: string;
  html: string;
  subject?: string;
};

function parseRecipients(to: string): string[] {
  return to
    .split(/[\s,;\n]+/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, html, subject = 'Reporte - Gestor de Proyectos' } = params;

  const trimmedTo = to.trim();
  const trimmedHtml = html.trim();

  if (!trimmedTo) {
    return { success: false, error: 'Indica al menos un destinatario.' };
  }
  if (!trimmedHtml) {
    return { success: false, error: 'El contenido HTML no puede estar vacío.' };
  }

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      success: false,
      error: 'SMTP no configurado. Configura SMTP_HOST, SMTP_USER y SMTP_PASS en .env.local (para Outlook: SMTP_HOST=smtp.office365.com, SMTP_PORT=587, SMTP_SECURE=false).',
    };
  }

  const portNumber = port ? parseInt(port, 10) : 587;
  const recipients = parseRecipients(trimmedTo);

  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number.isNaN(portNumber) ? 587 : portNumber,
      secure,
      auth: { user, pass },
    });

    await transport.sendMail({
      from: user,
      to: recipients,
      subject,
      html: trimmedHtml,
    });

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
