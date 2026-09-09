import { describe, expect, it } from 'vitest';
import {
  buildPortalContactRecipients,
  buildPortalContactSendPayload,
  buildPortalContactSignature,
  buildPortalContactSubject,
  PORTAL_CONTACT_CENTRO_EMAIL,
  validatePortalContactInput,
} from '@/lib/portal-contact';

describe('buildPortalContactRecipients', () => {
  it('incluye el centro y el encargado', () => {
    expect(buildPortalContactRecipients('lucia.ramirezc@correoaiep.cl')).toEqual([
      PORTAL_CONTACT_CENTRO_EMAIL,
      'lucia.ramirezc@correoaiep.cl',
    ]);
  });

  it('incluye el remitente cuando es un correo válido', () => {
    expect(
      buildPortalContactRecipients(
        'lucia.ramirezc@correoaiep.cl',
        'visitante@mail.cl',
      ),
    ).toEqual([
      PORTAL_CONTACT_CENTRO_EMAIL,
      'lucia.ramirezc@correoaiep.cl',
      'visitante@mail.cl',
    ]);
  });

  it('no incluye el remitente mientras no sea un correo válido', () => {
    expect(
      buildPortalContactRecipients('lucia.ramirezc@correoaiep.cl', 'visitante@'),
    ).toEqual([
      PORTAL_CONTACT_CENTRO_EMAIL,
      'lucia.ramirezc@correoaiep.cl',
    ]);
  });

  it('omite encargado vacío o inválido', () => {
    expect(buildPortalContactRecipients('')).toEqual([
      PORTAL_CONTACT_CENTRO_EMAIL,
    ]);
    expect(buildPortalContactRecipients('no-es-mail')).toEqual([
      PORTAL_CONTACT_CENTRO_EMAIL,
    ]);
  });

  it('no duplica si el encargado o el remitente es el mismo del centro', () => {
    expect(
      buildPortalContactRecipients(PORTAL_CONTACT_CENTRO_EMAIL.toUpperCase()),
    ).toEqual([PORTAL_CONTACT_CENTRO_EMAIL]);
    expect(
      buildPortalContactRecipients(
        'lucia.ramirezc@correoaiep.cl',
        'LUCIA.RAMIREZC@correoaiep.cl',
      ),
    ).toEqual([
      PORTAL_CONTACT_CENTRO_EMAIL,
      'lucia.ramirezc@correoaiep.cl',
    ]);
  });

  it('ignora un To enviado por el cliente', () => {
    const fromDb = buildPortalContactRecipients('a@b.cl');
    expect(fromDb).not.toContain('atacante@evil.test');
  });
});

describe('buildPortalContactSubject', () => {
  it('usa el nombre del proyecto', () => {
    expect(buildPortalContactSubject('AuditorIA')).toBe(
      'Quiero contactar con su proyecto (AuditorIA)',
    );
  });

  it('usa un fallback si el nombre está vacío', () => {
    expect(buildPortalContactSubject('  ')).toBe(
      'Quiero contactar con su proyecto (Proyecto)',
    );
  });
});

describe('buildPortalContactSignature', () => {
  it('arma una firma de tres líneas', () => {
    expect(
      buildPortalContactSignature({
        nombre: '  Ana Soto  ',
        cargo: 'Docente',
        institucion: 'AIEP',
      }),
    ).toBe('--\nAna Soto\nDocente\nAIEP');
  });

  it('omite líneas vacías', () => {
    expect(
      buildPortalContactSignature({
        nombre: 'Ana Soto',
        cargo: '',
        institucion: 'AIEP',
      }),
    ).toBe('--\nAna Soto\nAIEP');
  });

  it('queda vacía si no hay datos', () => {
    expect(
      buildPortalContactSignature({
        nombre: '  ',
        cargo: '',
        institucion: '',
      }),
    ).toBe('');
  });
});

describe('validatePortalContactInput', () => {
  const valid = {
    remitente: 'yo@aiep.cl',
    mensaje: 'Cuerpo',
    nombre: 'Ana Soto',
    cargo: 'Docente',
    institucion: 'AIEP',
  };

  it('exige remitente, mensaje, nombre, cargo e institución', () => {
    expect(validatePortalContactInput({ ...valid, remitente: '' }).ok).toBe(
      false,
    );
    expect(validatePortalContactInput({ ...valid, mensaje: '' }).ok).toBe(
      false,
    );
    expect(validatePortalContactInput({ ...valid, nombre: '' }).ok).toBe(false);
    expect(validatePortalContactInput({ ...valid, cargo: '' }).ok).toBe(false);
    expect(validatePortalContactInput({ ...valid, institucion: '' }).ok).toBe(
      false,
    );
  });

  it('rechaza un remitente inválido', () => {
    const result = validatePortalContactInput({
      ...valid,
      remitente: 'no-es-mail',
    });
    expect(result.ok).toBe(false);
  });

  it('acepta un payload válido recortado', () => {
    const result = validatePortalContactInput({
      remitente: '  yo@aiep.cl  ',
      mensaje: '  Quiero saber más  ',
      nombre: '  Ana Soto  ',
      cargo: '  Docente  ',
      institucion: '  AIEP  ',
    });
    expect(result).toEqual({
      ok: true,
      remitente: 'yo@aiep.cl',
      mensaje: 'Quiero saber más',
      nombre: 'Ana Soto',
      cargo: 'Docente',
      institucion: 'AIEP',
    });
  });
});

describe('buildPortalContactSendPayload', () => {
  it('usa From de la cuenta SMTP, To con remitente y asunto fijo', () => {
    const payload = buildPortalContactSendPayload({
      smtpUser: 'centroinnovacion@aiep.cl',
      proyectoNombre: 'AuditorIA',
      encargadoCorreo: 'lucia.ramirezc@correoaiep.cl',
      remitente: 'visitante@mail.cl',
      mensaje: 'Hola <script>alert(1)</script>',
      nombre: 'Ana Soto',
      cargo: 'Docente',
      institucion: 'AIEP',
    });
    expect(payload.from).toBe('centroinnovacion@aiep.cl');
    expect(payload.replyTo).toBe('visitante@mail.cl');
    expect(payload.to).toEqual([
      PORTAL_CONTACT_CENTRO_EMAIL,
      'lucia.ramirezc@correoaiep.cl',
      'visitante@mail.cl',
    ]);
    expect(payload.subject).toBe(
      'Quiero contactar con su proyecto (AuditorIA)',
    );
    expect(payload.html).not.toContain('<script>');
    expect(payload.html).toContain('visitante@mail.cl');
    expect(payload.html).toContain('AuditorIA');
    expect(payload.text).toContain('Hola');
    expect(payload.text).toContain('Ana Soto');
    expect(payload.text).toContain('Docente');
    expect(payload.text).toContain('AIEP');
    expect(payload.html).toContain('Ana Soto');
  });

  it('aplica una plantilla HTML con placeholders y escapa el mensaje', () => {
    const payload = buildPortalContactSendPayload({
      smtpUser: 'centroinnovacion@aiep.cl',
      proyectoNombre: 'AuditorIA',
      encargadoCorreo: 'lucia.ramirezc@correoaiep.cl',
      remitente: 'visitante@mail.cl',
      mensaje: 'Hola <b>mundo</b>',
      nombre: 'Ana Soto',
      cargo: 'Docente',
      institucion: 'AIEP',
      htmlTemplate:
        '<p><strong>Proyecto:</strong> {{proyecto}}</p><p>{{mensaje}}</p><p>{{firma}}</p>',
    });
    expect(payload.html).toContain('<strong>Proyecto:</strong> AuditorIA');
    expect(payload.html).toContain('Hola &lt;b&gt;mundo&lt;/b&gt;');
    expect(payload.html).not.toContain('<b>mundo</b>');
    expect(payload.html).toContain('Ana Soto');
    expect(payload.text).toContain('Hola <b>mundo</b>');
  });
});
