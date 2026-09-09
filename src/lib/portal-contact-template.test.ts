import { describe, expect, it } from 'vitest';
import {
  applyPortalContactHtmlTemplate,
  parsePortalContactHtmlTemplate,
  PORTAL_CONTACT_EMAIL_SAMPLE,
  PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
  sanitizePortalContactHtmlTemplate,
} from '@/lib/portal-contact-template';

describe('sanitizePortalContactHtmlTemplate', () => {
  it('deja negritas y placeholders', () => {
    const html = sanitizePortalContactHtmlTemplate(
      '<p><strong>Proyecto:</strong> {{proyecto}}</p><script>alert(1)</script>',
    );
    expect(html).toContain('<strong>Proyecto:</strong> {{proyecto}}</p>');
    expect(html).not.toContain('script');
  });

  it('cae al default si queda vacío', () => {
    expect(sanitizePortalContactHtmlTemplate('   ')).toBe(
      PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
    );
  });

  it('ignora un JSON de credenciales que no es plantilla', () => {
    expect(
      parsePortalContactHtmlTemplate(
        '{"user":"centro@aiep.cl","enc":"x"}',
      ),
    ).toBe(PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT);
  });
});

describe('applyPortalContactHtmlTemplate', () => {
  it('sustituye placeholders de ejemplo y escapa HTML del visitante', () => {
    const html = applyPortalContactHtmlTemplate(
      '<p>{{proyecto}}</p><p>{{mensaje}}</p><p>{{firma}}</p>',
      {
        proyecto: 'Aula <b>demo</b>',
        remitente: 'visitante@ejemplo.cl',
        mensaje: 'Quiero saber más',
        firma: '--\nAna Soto',
      },
    );
    expect(html).toContain('Aula &lt;b&gt;demo&lt;/b&gt;');
    expect(html).toContain('Quiero saber más');
    expect(html).toContain('Ana Soto');
    expect(html).toContain('<br');
  });

  it('usa los datos de muestra del portal', () => {
    const html = applyPortalContactHtmlTemplate(
      PORTAL_CONTACT_HTML_TEMPLATE_DEFAULT,
      PORTAL_CONTACT_EMAIL_SAMPLE,
    );
    expect(html).toContain(PORTAL_CONTACT_EMAIL_SAMPLE.proyecto);
    expect(html).toContain(PORTAL_CONTACT_EMAIL_SAMPLE.remitente);
    expect(html).toContain('Ana Soto');
  });
});
