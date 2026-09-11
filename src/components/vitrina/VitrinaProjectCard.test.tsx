import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { VitrinaProjectCard } from '@/components/vitrina/VitrinaProjectCard';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe('VitrinaProjectCard', () => {
  it('no muestra comunas en la tarjeta cuando la sede no es Emprendedor/a Externo', () => {
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'Festival del Futuro',
        sedes: ['Rancagua'],
        escuelas: ['Salud'],
        comunas: ['Valparaíso'],
      },
    ]);
    if (!result.ok) throw new Error(result.error);

    render(
      <VitrinaProjectCard
        proyecto={result.proyectos[0]!}
        canEdit={false}
        onOpen={() => undefined}
      />,
    );

    expect(screen.getByText('Festival del Futuro')).toBeInTheDocument();
    expect(screen.getByText('Rancagua')).toBeInTheDocument();
    expect(screen.getByLabelText('Escuelas')).toBeInTheDocument();
    expect(screen.getByText('Salud')).toBeInTheDocument();
    expect(screen.queryByText('Valparaíso')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Comunas')).not.toBeInTheDocument();
  });

  it('muestra comunas en lugar de escuela si la sede es Emprendedor/a Externo', () => {
    const result = normalizeVitrinaProyectos([
      {
        nombre: 'Huerta comunitaria',
        sedes: ['Emprendedor/a Externo'],
        escuelas: ['Salud'],
        comunas: ['Valparaíso', 'Quilpué'],
      },
    ]);
    if (!result.ok) throw new Error(result.error);

    render(
      <VitrinaProjectCard
        proyecto={result.proyectos[0]!}
        canEdit={false}
        onOpen={() => undefined}
      />,
    );

    expect(screen.getByText('Emprendedor/a Externo')).toBeInTheDocument();
    expect(screen.getByLabelText('Comunas')).toBeInTheDocument();
    expect(screen.getByText('Valparaíso')).toBeInTheDocument();
    expect(screen.getByText('Quilpué')).toBeInTheDocument();
    expect(screen.queryByLabelText('Escuelas')).not.toBeInTheDocument();
    expect(screen.queryByText('Salud')).not.toBeInTheDocument();
  });
});
