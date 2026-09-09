import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActividadDetalleModal } from '@/components/portal/ActividadDetalleModal';
import { getActivityById } from '@/lib/actions/gantt';
import {
  createEvidenciaActividad,
  getEvidenciasActividad,
} from '@/lib/actions/evidencias-actividad';
import { getComentariosActividad } from '@/lib/actions/comentarios-actividad';
import { uploadEvidenciaFile } from '@/lib/evidencias-upload';

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { id: 'u1', name: 'Ana' } } }),
}));

vi.mock('@/lib/actions/gantt', () => ({
  getActivityById: vi.fn(),
  updateActivity: vi.fn(),
}));

vi.mock('@/lib/actions/evidencias-actividad', () => ({
  getEvidenciasActividad: vi.fn(),
  createEvidenciaActividad: vi.fn(),
  deleteEvidenciaActividad: vi.fn(),
}));

vi.mock('@/lib/actions/comentarios-actividad', () => ({
  getComentariosActividad: vi.fn(),
  createComentarioActividad: vi.fn(),
}));

vi.mock('@/lib/evidencias-upload', () => ({
  uploadEvidenciaFile: vi.fn(),
}));

const getActivityMock = vi.mocked(getActivityById);
const getEvidenciasMock = vi.mocked(getEvidenciasActividad);
const createEvidenciaMock = vi.mocked(createEvidenciaActividad);
const getComentariosMock = vi.mocked(getComentariosActividad);
const uploadMock = vi.mocked(uploadEvidenciaFile);

const activity = {
  id: 'act-1',
  name: 'Definición del desafío',
  description: 'Entrevistas',
  startDate: new Date('2026-08-27'),
  endDate: new Date('2026-09-01'),
  tasks: [
    {
      id: 't1',
      name: 'Tarea 1',
      startDate: new Date('2026-08-27'),
      endDate: new Date('2026-09-01'),
      completed: false,
    },
  ],
};

describe('ActividadDetalleModal evidencias', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getActivityMock.mockResolvedValue({ success: true, data: activity as never });
    getEvidenciasMock.mockResolvedValue({ success: true, data: [] });
    getComentariosMock.mockResolvedValue({ success: true, data: [] });
    uploadMock.mockResolvedValue({
      url: 'https://res.cloudinary.com/x/image/upload/nueva.jpg',
      publicId: 'evidencias_actividades/nueva',
      tipo: 'image',
      nombreArchivo: 'foto.jpg',
    });
    createEvidenciaMock.mockResolvedValue({
      success: true,
      data: {
        id: 'ev-new',
        url: 'https://res.cloudinary.com/x/image/upload/nueva.jpg',
        publicId: 'evidencias_actividades/nueva',
        tipo: 'image',
        nombreArchivo: 'foto.jpg',
        createdAt: new Date('2026-09-09'),
      },
    });
  });

  it('muestra la miniatura y un aviso de éxito sin recargar', async () => {
    const user = userEvent.setup();
    render(
      <ActividadDetalleModal
        open
        onOpenChange={() => undefined}
        actividadId="act-1"
        canAddEvidencia
      />,
    );

    await screen.findByText('Definición del desafío');
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(['jpeg'], 'foto.jpg', { type: 'image/jpeg' });
    await user.upload(input, file);

    await waitFor(() => {
      expect(
        screen.getByRole('img', { name: 'foto.jpg' }),
      ).toHaveAttribute(
        'src',
        'https://res.cloudinary.com/x/image/upload/nueva.jpg',
      );
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Evidencia subida correctamente',
    );
  });
});
