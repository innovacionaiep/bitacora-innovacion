import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaAiSettingsModal } from '@/components/vitrina/VitrinaAiSettingsModal';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/lib/actions/vitrina-ai', () => ({
  getVitrinaAiSettings: vi.fn(async () => ({
    success: true,
    data: { configured: false, keyMasked: '', model: 'openai/gpt-4o-mini' },
  })),
  saveVitrinaAiSettings: vi.fn(),
  testVitrinaOpenRouter: vi.fn(),
}));

vi.mock('@/lib/actions/portal-guest', () => ({
  getPortalGuestSettings: vi.fn(async () => ({
    success: true,
    data: {
      0: false,
      1: false,
      2: false,
      3: false,
      causalab: false,
      vinculacion: false,
      visor: false,
    },
  })),
  getPortalSessionRoleSettings: vi.fn(async () => ({
    success: true,
    data: {
      Admin: 3,
      Coordinador: 3,
      Colaborador: 1,
      Encargado: 1,
      Docente: 1,
      Estudiante: 1,
      Beneficiario: 1,
    },
  })),
  savePortalGuestSettings: vi.fn(),
  savePortalSessionRoleSettings: vi.fn(),
}));

vi.mock('@/lib/actions/portal-avances-impulsa', () => ({
  getImpulsaExcelSettings: vi.fn(async () => ({
    success: true,
    data: {
      filePath: '',
      sheetName: 'IMPULSA',
      fileOk: false,
      sheetOk: false,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  saveImpulsaExcelSettings: vi.fn(),
  testImpulsaExcelFile: vi.fn(),
  testImpulsaExcelSheet: vi.fn(),
  updateImpulsaExcelSnapshot: vi.fn(),
}));

vi.mock('@/lib/actions/portal-avances-vcm', () => ({
  getVcmExcelSettings: vi.fn(async () => ({
    success: true,
    data: {
      filePath: '',
      sheetName: 'Fondo VcM',
      fileOk: false,
      sheetOk: false,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  saveVcmExcelSettings: vi.fn(),
  testVcmExcelFile: vi.fn(),
  testVcmExcelSheet: vi.fn(),
  updateVcmExcelSnapshot: vi.fn(),
}));

vi.mock('@/lib/actions/portal-outlook', () => ({
  getPortalOutlookSettings: vi.fn(async () => ({
    success: true,
    data: {
      configured: false,
      user: '',
      passwordMasked: '',
      host: 'smtp.office365.com',
      port: 587,
      secure: false,
      htmlTemplate:
        '<p><strong>Remitente:</strong> {{remitente}}</p><p>{{mensaje}}</p>',
    },
  })),
  savePortalOutlookSettings: vi.fn(),
  savePortalContactEmailTemplate: vi.fn(async () => ({ success: true })),
  testPortalOutlook: vi.fn(),
}));

vi.mock('@/lib/actions/portal-fondo-colors', () => ({
  getPortalFondoColors: vi.fn(async () => ({
    success: true,
    data: [
      {
        id: 'f1',
        nombre: 'Fondo Impulsa',
        colorHex: null,
        fallbackHex: '#059669',
      },
    ],
  })),
  savePortalFondoColors: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe('VitrinaAiSettingsModal sidebar', () => {
  it('navega entre secciones sin mostrarlas todas a la vez', async () => {
    const user = userEvent.setup();
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Secciones de configuración' })).toBeInTheDocument();
    });

    // `relative` pisa `fixed` vía twMerge y el modal queda recortado en ScalePortal.
    expect(screen.getByRole('dialog').className).toMatch(/\bfixed\b/);
    expect(screen.getByRole('dialog').className).not.toMatch(/\brelative\b/);

    expect(screen.getByLabelText('API key de OpenRouter')).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText('API key de OpenRouter')).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo de la cuenta')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Ruta del archivo .xlsx')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Correo Outlook' }));
    expect(screen.getByLabelText('Correo de la cuenta')).toBeInTheDocument();
    expect(screen.queryByLabelText('API key de OpenRouter')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cuentas logueadas' }));
    expect(screen.getByRole('button', { name: 'Guardar accesos por rol' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Correo de la cuenta')).not.toBeInTheDocument();
  });
});

describe('VitrinaAiSettingsModal Vinculación con el Medio', () => {
  it('muestra ruta, hoja Fondo VcM y botones de prueba', async () => {
    const user = userEvent.setup();
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Vinculación con el Medio' }),
      ).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: 'Vinculación con el Medio' }),
    );
    expect(screen.getByLabelText('Ruta del archivo .xlsx')).toBeInTheDocument();
    expect(screen.getByLabelText('Hoja')).toHaveValue('Fondo VcM');
    expect(screen.getByRole('button', { name: 'Guardar ruta' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probar archivo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Probar hoja' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument();
  });
});

describe('VitrinaAiSettingsModal códigos de invitado', () => {
  it('separa acceso general e invitados específicos', async () => {
    const user = userEvent.setup();
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Códigos de invitado' }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Códigos de invitado' }));
    expect(screen.getByText('Acceso general')).toBeInTheDocument();
    expect(screen.getByText('Invitados específicos')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Nivel 0 — Avances e Indicadores'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Causalab — Avances, Indicadores/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Vinculación —/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Visor —/)).toBeInTheDocument();
  });
});

describe('VitrinaAiSettingsModal Outlook', () => {
  it('muestra la sección de correo Outlook', async () => {
    const user = userEvent.setup();
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Correo Outlook' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Correo Outlook' }));
    expect(screen.getByLabelText('Correo de la cuenta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar Outlook' })).toBeDisabled();
  });

  it('permite editar formato del correo y previsualiza con texto de ejemplo', async () => {
    const user = userEvent.setup();
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Correo Outlook' })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Correo Outlook' }));
    expect(screen.getByRole('button', { name: 'Negrita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cursiva' })).toBeInTheDocument();
    expect(screen.getByLabelText('Formato del correo')).toBeInTheDocument();
    expect(screen.getByTestId('portal-contact-email-preview')).toHaveTextContent(
      'visitante@ejemplo.cl',
    );
    expect(
      screen.getByRole('button', { name: 'Guardar formato' }),
    ).toBeInTheDocument();
  });
});

describe('VitrinaAiSettingsModal colores de fondos', () => {
  it('lista fondos y permite guardar colores', async () => {
    const user = userEvent.setup();
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Colores de fondos' }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Colores de fondos' }));
    expect(
      screen.getByRole('heading', { name: 'Colores de fondos' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Color hex de Fondo Impulsa'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Guardar colores' }),
    ).toBeInTheDocument();
  });
});
