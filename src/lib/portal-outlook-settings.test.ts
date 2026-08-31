import { describe, expect, it } from 'vitest';
import {
  isPortalOutlookConfigured,
  maskPortalOutlookPassword,
  normalizePortalOutlookHost,
  normalizePortalOutlookPort,
  normalizePortalOutlookUser,
  parseStoredPortalOutlook,
  serializePortalOutlookStored,
  PORTAL_OUTLOOK_DEFAULT_HOST,
  PORTAL_OUTLOOK_DEFAULT_PORT,
} from '@/lib/portal-outlook-settings';

describe('normalizePortalOutlookHost', () => {
  it('recorta y acepta el host de Outlook', () => {
    expect(normalizePortalOutlookHost('  smtp.office365.com  ')).toBe(
      'smtp.office365.com',
    );
  });

  it('usa el default si viene vacío o inválido', () => {
    expect(normalizePortalOutlookHost('')).toBe(PORTAL_OUTLOOK_DEFAULT_HOST);
    expect(normalizePortalOutlookHost('not a host')).toBe(
      PORTAL_OUTLOOK_DEFAULT_HOST,
    );
  });
});

describe('normalizePortalOutlookPort', () => {
  it('acepta 587 y 465', () => {
    expect(normalizePortalOutlookPort(587)).toBe(587);
    expect(normalizePortalOutlookPort('465')).toBe(465);
  });

  it('usa 587 si el puerto no es válido', () => {
    expect(normalizePortalOutlookPort(0)).toBe(PORTAL_OUTLOOK_DEFAULT_PORT);
    expect(normalizePortalOutlookPort('abc')).toBe(PORTAL_OUTLOOK_DEFAULT_PORT);
  });
});

describe('normalizePortalOutlookUser', () => {
  it('recorta el correo de la cuenta', () => {
    expect(normalizePortalOutlookUser('  centro@aiep.cl  ')).toBe(
      'centro@aiep.cl',
    );
  });

  it('rechaza valores que no parecen correo', () => {
    expect(normalizePortalOutlookUser('no-es-mail')).toBe('');
  });
});

describe('maskPortalOutlookPassword', () => {
  it('oculta la contraseña y deja los últimos 4', () => {
    expect(maskPortalOutlookPassword('aplicacion-clave-1234')).toBe('••••1234');
  });

  it('no persiste una clave vacía como máscara', () => {
    expect(maskPortalOutlookPassword('   ')).toBe('');
  });
});

describe('parseStoredPortalOutlook', () => {
  it('lee user, enc, host, port y secure', () => {
    const raw = serializePortalOutlookStored({
      user: 'centro@aiep.cl',
      enc: 'abc',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
    });
    expect(parseStoredPortalOutlook(raw)).toEqual({
      user: 'centro@aiep.cl',
      enc: 'abc',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
    });
  });

  it('no está configurado sin user o enc', () => {
    expect(
      isPortalOutlookConfigured(
        parseStoredPortalOutlook(
          '{"user":"","enc":"x","host":"smtp.office365.com","port":587,"secure":false}',
        ),
      ),
    ).toBe(false);
    expect(
      isPortalOutlookConfigured(
        parseStoredPortalOutlook(
          serializePortalOutlookStored({
            user: 'centro@aiep.cl',
            enc: 'iv',
            host: PORTAL_OUTLOOK_DEFAULT_HOST,
            port: PORTAL_OUTLOOK_DEFAULT_PORT,
            secure: false,
          }),
        ),
      ),
    ).toBe(true);
  });
});
