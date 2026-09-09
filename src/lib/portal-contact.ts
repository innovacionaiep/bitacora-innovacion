import { isValidEmail } from '@/lib/excel-import/utils';
import {
  applyPortalContactHtmlTemplate,
  PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
} from '@/lib/portal-contact-template';
import { nextRateLimitWindow } from '@/lib/vitrina-ai-rate-limit';

export const PORTAL_CONTACT_CENTRO_EMAIL = 'centroinnovacion@aiep.cl';
export const PORTAL_CONTACT_MAX_MENSAJE = 4000;
export const PORTAL_CONTACT_MAX_FIRMA = 120;
export const PORTAL_CONTACT_RATE_MAX = 5;
export const PORTAL_CONTACT_RATE_WINDOW_MS = 60_000;

const hitsByKey = new Map<string, number[]>();

export function allowPortalContactHit(
  key: string,
  now = Date.now(),
  max = PORTAL_CONTACT_RATE_MAX,
  windowMs = PORTAL_CONTACT_RATE_WINDOW_MS,
): boolean {
  const current = hitsByKey.get(key) ?? [];
  const next = nextRateLimitWindow(current, now, max, windowMs);
  hitsByKey.set(key, next.timestamps);
  return next.allowed;
}

export type PortalContactInput = {
  remitente: string;
  mensaje: string;
  nombre: string;
  cargo: string;
  institucion: string;
};

export type PortalContactValidated =
  | {
      ok: true;
      remitente: string;
      mensaje: string;
      nombre: string;
      cargo: string;
      institucion: string;
    }
  | { ok: false; error: string };

function pushUniqueEmail(recipients: string[], email: string | null | undefined) {
  const extra = (email ?? '').trim();
  if (!extra || !isValidEmail(extra)) return;
  const already = recipients.some(
    (item) => item.toLowerCase() === extra.toLowerCase(),
  );
  if (already) return;
  recipients.push(extra);
}

export function buildPortalContactRecipients(
  encargadoCorreo: string | null | undefined,
  remitente?: string | null,
): string[] {
  const recipients = [PORTAL_CONTACT_CENTRO_EMAIL];
  pushUniqueEmail(recipients, encargadoCorreo);
  pushUniqueEmail(recipients, remitente);
  return recipients;
}

export function buildPortalContactSubject(proyectoNombre: string): string {
  const nombre = proyectoNombre.trim() || 'Proyecto';
  return `Quiero contactar con su proyecto (${nombre})`;
}

export function buildPortalContactSignature(input: {
  nombre: string;
  cargo: string;
  institucion: string;
}): string {
  const lines = [input.nombre, input.cargo, input.institucion]
    .map((value) => value.trim())
    .filter(Boolean);
  if (lines.length === 0) return '';
  return ['--', ...lines].join('\n');
}

function trimFirmaField(value: string, error: string): { ok: true; value: string } | { ok: false; error: string } {
  const trimmed = value.trim();
  if (!trimmed) return { ok: false, error };
  if (trimmed.length > PORTAL_CONTACT_MAX_FIRMA) {
    return { ok: false, error: 'El texto de la firma es demasiado largo.' };
  }
  return { ok: true, value: trimmed };
}

export function validatePortalContactInput(
  input: PortalContactInput,
): PortalContactValidated {
  const remitente = input.remitente.trim();
  const mensaje = input.mensaje.trim();

  if (!remitente) {
    return { ok: false, error: 'Indica tu correo de remitente.' };
  }
  if (!isValidEmail(remitente)) {
    return { ok: false, error: 'El correo de remitente no es válido.' };
  }
  if (!mensaje) {
    return { ok: false, error: 'Escribe el mensaje.' };
  }
  if (mensaje.length > PORTAL_CONTACT_MAX_MENSAJE) {
    return { ok: false, error: 'El mensaje es demasiado largo.' };
  }

  const nombre = trimFirmaField(input.nombre, 'Indica tu nombre.');
  if (!nombre.ok) return nombre;
  const cargo = trimFirmaField(input.cargo, 'Indica tu cargo o título.');
  if (!cargo.ok) return cargo;
  const institucion = trimFirmaField(
    input.institucion,
    'Indica tu institución.',
  );
  if (!institucion.ok) return institucion;

  return {
    ok: true,
    remitente,
    mensaje,
    nombre: nombre.value,
    cargo: cargo.value,
    institucion: institucion.value,
  };
}

export function buildPortalContactSendPayload(input: {
  smtpUser: string;
  proyectoNombre: string;
  encargadoCorreo: string;
  remitente: string;
  mensaje: string;
  nombre: string;
  cargo: string;
  institucion: string;
  htmlTemplate?: string;
}): {
  from: string;
  to: string[];
  replyTo: string;
  subject: string;
  text: string;
  html: string;
} {
  const nombre = input.proyectoNombre.trim() || 'Proyecto';
  const firma = buildPortalContactSignature({
    nombre: input.nombre,
    cargo: input.cargo,
    institucion: input.institucion,
  });
  const cuerpo = firma ? `${input.mensaje}\n\n${firma}` : input.mensaje;
  const text = [
    `Proyecto: ${nombre}`,
    `Remitente: ${input.remitente}`,
    '',
    cuerpo,
  ].join('\n');
  const html = applyPortalContactHtmlTemplate(
    input.htmlTemplate ?? PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
    {
      proyecto: nombre,
      remitente: input.remitente,
      mensaje: input.mensaje,
      firma,
    },
  );

  return {
    from: input.smtpUser,
    to: buildPortalContactRecipients(input.encargadoCorreo, input.remitente),
    replyTo: input.remitente,
    subject: buildPortalContactSubject(input.proyectoNombre),
    text,
    html,
  };
}
