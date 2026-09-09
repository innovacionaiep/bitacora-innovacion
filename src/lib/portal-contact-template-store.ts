import prisma from '@/lib/prisma';
import {
  parsePortalContactHtmlTemplate,
  PORTAL_CONTACT_EMAIL_TEMPLATE_KEY,
  PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
  sanitizePortalContactHtmlTemplate,
} from '@/lib/portal-contact-template';

export async function readPortalContactHtmlTemplate(): Promise<string> {
  try {
    const row = await prisma.systemSetting.findUnique({
      where: { key: PORTAL_CONTACT_EMAIL_TEMPLATE_KEY },
      select: { value: true },
    });
    return parsePortalContactHtmlTemplate(row?.value);
  } catch (e) {
    console.error('[portal] readPortalContactHtmlTemplate', e);
    return PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT;
  }
}

export async function writePortalContactHtmlTemplate(
  html: string,
): Promise<string> {
  const value = sanitizePortalContactHtmlTemplate(html);
  await prisma.systemSetting.upsert({
    where: { key: PORTAL_CONTACT_EMAIL_TEMPLATE_KEY },
    create: { key: PORTAL_CONTACT_EMAIL_TEMPLATE_KEY, value },
    update: { value },
  });
  return value;
}
