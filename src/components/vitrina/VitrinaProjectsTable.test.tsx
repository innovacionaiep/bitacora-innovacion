import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaProjectsTable } from '@/components/vitrina/VitrinaProjectsTable';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import type { VitrinaProjectCatalogs } from '@/lib/actions/vitrina-proyectos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/lib/actions/vitrina-proyectos', () => ({
  upsertVitrinaProyecto: vi.fn(),
}));

const catalogs: VitrinaProjectCatalogs = {
  fondos: [{ id: 'f1', nombre: 'Impulsa' }],
  lineas: [{ id: 'l1', nombre: 'Innovación', fondoId: 'f1' }],
  sedes: [{ id: 's1', nombre: 'Rancagua' }],
  escuelas: [{ id: 'e1', nombre: 'Salud' }],
  socios: [{ id: 'so1', nombre: 'MUKUNA' }],
  etiquetas: [{ id: 't1', nombre: 'Arte' }],
};

function projectFrom() {
  const result = normalizeVitrinaProyectos([
    {
      nombre: 'Festival del Futuro',
      descripcion: 'No debe verse en la tabla',
      fondos: ['Impulsa'],
      sedes: ['Rancagua'],
    },
  ]);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos[0]!;
}

describe('VitrinaProjectsTable', () => {
  it('lista el proyecto sin la descripción y permite editar la fila', async () => {
    const user = userEvent.setup();
    render(
      <VitrinaProjectsTable
        proyectos={[projectFrom()]}
        catalogs={catalogs}
        canEdit
      />,
    );

    expect(screen.getByText('Festival del Futuro')).toBeInTheDocument();
    expect(
      screen.queryByText('No debe verse en la tabla'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Fondo' })).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Editar Festival del Futuro' }),
    );
    expect(screen.getByRole('button', { name: 'Guardar fila' })).toBeInTheDocument();
  });
});
