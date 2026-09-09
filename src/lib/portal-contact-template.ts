export const PORTAL_CONTACT_EMAIL_TEMPLATE_KEY =
  'portal_contact_email_template';

export const PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT = [
  '<p><strong>Proyecto:</strong> {{proyecto}}</p>',
  '<p><strong>Remitente:</strong> {{remitente}}</p>',
  '<p>{{mensaje}}</p>',
  '<p>{{firma}}</p>',
].join('');

export const PORTAL_CONTACT_EMAIL_SAMPLE = {
  proyecto: 'Aula Aerotransportada (ejemplo)',
  remitente: 'visitante@ejemplo.cl',
  mensaje:
    'Hola, me interesa conocer más sobre este proyecto y cómo podríamos colaborar.',
  firma: '--\nAna Soto\nDocente\nInstituto de ejemplo',
};

export type PortalContactTemplateVars = {
  proyecto: string;
  remitente: string;
  mensaje: string;
  firma: string;
};

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'div',
  'span',
  'blockquote',
]);

const MAX_TEMPLATE = 20_000;

export function escapePortalContactHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function sanitizePortalContactHtmlTemplate(html: string): string {
  const raw = typeof html === 'string' ? html.slice(0, MAX_TEMPLATE) : '';
  let s = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(
      /<\/?(?:iframe|object|embed|link|meta|form|input|button|textarea|svg|math)[^>]*>/gi,
      '',
    );

  s = s.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (full, name: string) => {
    const tag = name.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (tag === 'br') return '<br />';
    if (full.startsWith('</')) return `</${tag}>`;
    return `<${tag}>`;
  });

  const trimmed = s.trim();
  return trimmed || PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT;
}

export function parsePortalContactHtmlTemplate(
  value: string | null | undefined,
): string {
  if (!value?.trim()) return PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT;
  const trimmed = value.trim();
  if (trimmed.startsWith('{') && !trimmed.includes('{{')) {
    return PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT;
  }
  return sanitizePortalContactHtmlTemplate(trimmed);
}

function newlinesToBr(escaped: string): string {
  return escaped.replace(/\r\n/g, '\n').replace(/\n/g, '<br />');
}

export function applyPortalContactHtmlTemplate(
  template: string,
  vars: PortalContactTemplateVars,
): string {
  return sanitizePortalContactHtmlTemplate(template)
    .replaceAll('{{proyecto}}', escapePortalContactHtml(vars.proyecto))
    .replaceAll('{{remitente}}', escapePortalContactHtml(vars.remitente))
    .replaceAll('{{mensaje}}', newlinesToBr(escapePortalContactHtml(vars.mensaje)))
    .replaceAll('{{firma}}', newlinesToBr(escapePortalContactHtml(vars.firma)));
}
