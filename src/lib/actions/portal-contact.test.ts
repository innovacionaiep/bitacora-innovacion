import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encryptSecret } from '@/lib/vitrina-ai-crypto';
import { PORTAL_CONTACT_CENTRO_EMAIL } from '@/lib/portal-contact';

const requireAdmin = vi.fn();
const resolvePortalAccess = vi.fn();
const findUnique = vi.fn();
const upsert = vi.fn();
const vitrinaFindUnique = vi.fn();
const sendMail = vi.fn();
const verify = vi.fn();
const createTransport = vi.fn(() => ({ sendMail, verify }));
const headersMock = vi.fn();

vi.mock('@/lib/authz/guards', () => ({
  requireAdmin: (...args: unknown[]) => requireAdmin(...args),
}));

vi.mock('@/lib/actions/portal-guest', () => ({
  resolvePortalAccess: (...args: unknown[]) => resolvePortalAccess(...args),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    systemSetting: { findUnique, upsert },
    vitrinaProyecto: { findUnique: vitrinaFindUnique },
  },
}));

vi.mock('nodemailer', () => ({
  default: { createTransport },
}));

vi.mock('next/headers', () => ({
  headers: () => headersMock(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/secrets/env-secrets', () => ({
  readRequiredEnv: vi.fn(() => 'nexauth-secret-test'),
}));

const SECRET = 'nexauth-secret-test';

async function loadOutlookActions() {
  return import('@/lib/actions/portal-outlook');
}

async function loadContactActions() {
  return import('@/lib/actions/portal-contact');
}

describe('portal-outlook settings actions', () => {
  beforeEach(() => {
    requireAdmin.mockReset();
    findUnique.mockReset();
    upsert.mockReset();
    requireAdmin.mockResolvedValue({ ok: true, user: { id: 'admin' } });
    findUnique.mockResolvedValue(null);
    upsert.mockResolvedValue({});
  });

  it('rechaza get si no es admin', async () => {
    requireAdmin.mockResolvedValue({ ok: false, error: 'No autorizado' });
    const { getPortalOutlookSettings } = await loadOutlookActions();
    const result = await getPortalOutlookSettings();
    expect(result.success).toBe(false);
    expect(result.error).toBe('No autorizado');
  });

  it('guarda user y contraseña cifrada', async () => {
    const { savePortalOutlookSettings } = await loadOutlookActions();
    const result = await savePortalOutlookSettings({
      user: 'centro@aiep.cl',
      password: 'app-pass-1234',
    });
    expect(result.success).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          key: 'portal_outlook',
        }),
      }),
    );
    const value = upsert.mock.calls[0][0].create.value as string;
    expect(value).not.toContain('app-pass-1234');
    expect(value).toContain('centro@aiep.cl');
  });

  it('guarda la plantilla HTML del correo Contactar', async () => {
    const { savePortalContactEmailTemplate } = await loadOutlookActions();
    const result = await savePortalContactEmailTemplate({
      html: '<p><strong>Proyecto:</strong> {{proyecto}}</p><script>x</script>',
    });
    expect(result.success).toBe(true);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          key: 'portal_contact_email_template',
        }),
      }),
    );
    const value = String(upsert.mock.calls[0][0].create.value);
    expect(value).toContain('{{proyecto}}');
    expect(value).not.toContain('script');
  });
});

describe('sendPortalContactEmail', () => {
  beforeEach(() => {
    resolvePortalAccess.mockReset();
    vitrinaFindUnique.mockReset();
    sendMail.mockReset();
    createTransport.mockClear();
    headersMock.mockReset();
    findUnique.mockReset();
    resolvePortalAccess.mockResolvedValue({ kind: 'guest', level: 1 });
    headersMock.mockResolvedValue(
      new Headers({ 'x-forwarded-for': `10.0.0.${Math.floor(Math.random() * 250)}` }),
    );
    sendMail.mockResolvedValue({});
    const enc = encryptSecret('app-pass-1234', SECRET);
    findUnique.mockResolvedValue({
      value: JSON.stringify({
        user: 'centroinnovacion@aiep.cl',
        enc,
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
      }),
    });
    vitrinaFindUnique.mockResolvedValue({
      nombre: 'AuditorIA',
      encargadoCorreo: 'lucia.ramirezc@correoaiep.cl',
    });
  });

  it('rechaza sin acceso al portal', async () => {
    resolvePortalAccess.mockResolvedValue({ kind: 'none', level: null });
    const { sendPortalContactEmail } = await loadContactActions();
    const result = await sendPortalContactEmail({
      proyectoId: 'p1',
      remitente: 'yo@mail.cl',
      mensaje: 'Cuerpo',
      nombre: 'Ana',
      cargo: 'Docente',
      institucion: 'AIEP',
    });
    expect(result.success).toBe(false);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('arma To desde el proyecto y Reply-To del remitente, ignora to del cliente', async () => {
    const { sendPortalContactEmail } = await loadContactActions();
    const result = await sendPortalContactEmail({
      proyectoId: 'p1',
      remitente: 'visitante@mail.cl',
      mensaje: 'Quiero saber más',
      nombre: 'Ana Soto',
      cargo: 'Docente',
      institucion: 'AIEP',
      to: 'atacante@evil.test',
    });
    expect(result.success).toBe(true);
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'centroinnovacion@aiep.cl',
        replyTo: 'visitante@mail.cl',
        to: [
          PORTAL_CONTACT_CENTRO_EMAIL,
          'lucia.ramirezc@correoaiep.cl',
          'visitante@mail.cl',
        ],
        subject: 'Quiero contactar con su proyecto (AuditorIA)',
      }),
    );
    const sent = sendMail.mock.calls[0][0] as { to: string[]; text: string };
    expect(sent.to).not.toContain('atacante@evil.test');
    expect(sent.text).toContain('Ana Soto');
    expect(sent.text).toContain('--');
  });
});
