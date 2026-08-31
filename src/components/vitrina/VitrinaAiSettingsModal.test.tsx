import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
    data: { 0: false, 1: false, 2: false, 3: false },
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
    },
  })),
  savePortalOutlookSettings: vi.fn(),
  testPortalOutlook: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

describe('VitrinaAiSettingsModal Outlook', () => {
  it('muestra la sección de correo Outlook', async () => {
    render(<VitrinaAiSettingsModal open onOpenChange={() => undefined} />);
    await waitFor(() => {
      expect(screen.getByText('Correo Outlook')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Correo de la cuenta')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Guardar Outlook' })).toBeDisabled();
  });
});
