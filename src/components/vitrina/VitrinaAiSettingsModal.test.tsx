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
      comunicaciones: false,
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
      filePath: 'C:\\excel.xlsx',
      sheetName: 'IMPULSA',
      fileOk: true,
      sheetOk: true,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  saveImpulsaExcelSettings: vi.fn(async (input: {
    filePath: string;
    sheetName: string;
  }) => ({
    success: true,
    data: {
      filePath: input.filePath,
      sheetName: input.sheetName,
      fileOk: false,
      sheetOk: false,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  testImpulsaExcelFile: vi.fn(async () => ({ success: true })),
  updateImpulsaExcelSnapshot: vi.fn(async () => ({
    success: true,
    data: {
      filePath: 'C:\\excel.xlsx',
      sheetName: 'IMPULSA',
      fileOk: true,
      sheetOk: true,
      lastSyncedAt: '2026-09-21T00:00:00.000Z',
      rowCount: 3,
    },
  })),
}));

vi.mock('@/lib/actions/portal-avances-vcm', () => ({
  getVcmExcelSettings: vi.fn(async () => ({
    success: true,
    data: {
      filePath: 'C:\\excel.xlsx',
      sheetName: 'Fondo VcM',
      fileOk: true,
      sheetOk: true,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  saveVcmExcelSettings: vi.fn(async (input: {
    filePath: string;
    sheetName: string;
  }) => ({
    success: true,
    data: {
      filePath: input.filePath,
      sheetName: input.sheetName,
      fileOk: false,
      sheetOk: false,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  updateVcmExcelSnapshot: vi.fn(async () => ({
    success: true,
    data: {
      filePath: 'C:\\excel.xlsx',
      sheetName: 'Fondo VcM',
      fileOk: true,
      sheetOk: true,
      lastSyncedAt: '2026-09-21T00:00:00.000Z',
      rowCount: 2,
    },
  })),
}));

vi.mock('@/lib/actions/portal-avances-movelab', () => ({
  getMoveLabExcelSettings: vi.fn(async () => ({
    success: true,
    data: {
      filePath: 'C:\\excel.xlsx',
      sheetName: 'MoveLab',
      fileOk: true,
      sheetOk: true,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  saveMoveLabExcelSettings: vi.fn(async (input: {
    filePath: string;
    sheetName: string;
  }) => ({
    success: true,
    data: {
      filePath: input.filePath,
      sheetName: input.sheetName,
      fileOk: false,
      sheetOk: false,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  updateMoveLabExcelSnapshot: vi.fn(async () => ({
    success: true,
    data: {
      filePath: 'C:\\excel.xlsx',
      sheetName: 'MoveLab',
      fileOk: true,
      sheetOk: true,
      lastSyncedAt: '2026-09-21T00:00:00.000Z',
      rowCount: 10,
    },
  })),
}));

vi.mock('@/lib/actions/portal-avances-aceleradora', () => ({
  getAceleradoraExcelSettings: vi.fn(async () => ({
    success: true,
    data: {
      filePath: 'C:\\excel.xlsx',
      sheetName: 'ACELERADORA',
      fileOk: true,
      sheetOk: true,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  saveAceleradoraExcelSettings: vi.fn(async (input: {
    filePath: string;
    sheetName: string;
  }) => ({
    success: true,
    data: {
      filePath: input.filePath,
      sheetName: input.sheetName,
      fileOk: false,
      sheetOk: false,
      lastSyncedAt: null,
      rowCount: 0,
    },
  })),
  updateAceleradoraExcelSnapshot: vi.fn(async () => ({
    success: true,
    data: {
      filePath: 'C:\\excel.xlsx',
      sheetName: 'ACELERADORA',
      fileOk: true,
      sheetOk: true,
      lastSyncedAt: '2026-09-21T00:00:00.000Z',
      rowCount: 8,
    },
  })),
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

describe('VitrinaAiSettingsModal Excel Onedrive', () => {
  it('muestra el menú unificado y no las pestañas sueltas de fondos Excel', async () => {
    const user = userEvent.setup();
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Excel Onedrive' }),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'Fondo Impulsa' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Aceleradora' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'MoveLab' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Vinculación con el Medio' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Excel Onedrive' }));
    expect(screen.getByLabelText('Ruta del archivo .xlsx')).toHaveValue(
      'C:\\excel.xlsx',
    );
    expect(document.getElementById('excel-sheet-impulsa')).toHaveValue('IMPULSA');
    expect(document.getElementById('excel-sheet-aceleradora')).toHaveValue(
      'ACELERADORA',
    );
    expect(document.getElementById('excel-sheet-movelab')).toHaveValue('MoveLab');
    expect(document.getElementById('excel-sheet-vcm')).toHaveValue('Fondo VcM');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Probar archivo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Actualizar todo' }),
    ).toBeInTheDocument();
  });

  it('Actualizar todo llama a los cuatro snapshots', async () => {
    const { updateImpulsaExcelSnapshot } = await import(
      '@/lib/actions/portal-avances-impulsa'
    );
    const { updateAceleradoraExcelSnapshot } = await import(
      '@/lib/actions/portal-avances-aceleradora'
    );
    const { updateMoveLabExcelSnapshot } = await import(
      '@/lib/actions/portal-avances-movelab'
    );
    const { updateVcmExcelSnapshot } = await import(
      '@/lib/actions/portal-avances-vcm'
    );

    const user = userEvent.setup();
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Excel Onedrive' }),
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Excel Onedrive' }));
    await user.click(screen.getByRole('button', { name: 'Actualizar todo' }));

    await waitFor(() => {
      expect(updateImpulsaExcelSnapshot).toHaveBeenCalled();
      expect(updateAceleradoraExcelSnapshot).toHaveBeenCalled();
      expect(updateMoveLabExcelSnapshot).toHaveBeenCalled();
      expect(updateVcmExcelSnapshot).toHaveBeenCalled();
    });
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
    expect(screen.getByLabelText(/Comunicaciones —/)).toBeInTheDocument();
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
