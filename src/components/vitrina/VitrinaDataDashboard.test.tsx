import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaViewToggle } from '@/components/vitrina/VitrinaViewToggle';
import { VitrinaDataDashboard } from '@/components/vitrina/VitrinaDataDashboard';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';

function projectsFrom(
  rows: Array<{
    nombre: string;
    fondos?: string[];
    lineas?: string[];
    sedes?: string[];
    escuelas?: string[];
    etiquetas?: string[];
  }>,
) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

describe('VitrinaViewToggle', () => {
  it('emite analisis y data al pulsar los tabs', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<VitrinaViewToggle value="proyectos" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'Proyectos' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(screen.getByRole('tab', { name: 'Análisis' }));
    expect(onChange).toHaveBeenCalledWith('analisis');
    await user.click(screen.getByRole('tab', { name: 'Data' }));
    expect(onChange).toHaveBeenCalledWith('data');
  });
});

describe('VitrinaDataDashboard', () => {
  it('muestra el total y las series por fondo, línea, sede, escuela y etiqueta', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        fondos: ['Fondo Impulsa'],
        lineas: ['Línea Alfa'],
        sedes: ['Valparaíso'],
        escuelas: ['Salud'],
        etiquetas: ['Tecnología'],
      },
      {
        nombre: 'B',
        fondos: ['Fondo Impulsa'],
        lineas: ['Línea Alfa'],
        sedes: ['Valparaíso'],
        escuelas: ['Salud'],
        etiquetas: ['Tecnología'],
      },
    ]);
    render(<VitrinaDataDashboard proyectos={proyectos} />);

    expect(screen.getByText('proyectos en vitrina')).toBeInTheDocument();
    expect(screen.getByText('Por fondo')).toBeInTheDocument();
    expect(screen.getByText('Por línea')).toBeInTheDocument();
    expect(screen.getByText('Por sede')).toBeInTheDocument();
    expect(screen.getByText('Por escuela')).toBeInTheDocument();
    expect(screen.getByText('Por etiqueta')).toBeInTheDocument();
    expect(screen.getByText('Fondo Impulsa')).toBeInTheDocument();
    expect(screen.getByText('Línea Alfa')).toBeInTheDocument();
    expect(screen.getByText('Valparaíso')).toBeInTheDocument();
    expect(screen.getByText('Salud')).toBeInTheDocument();
    expect(screen.getByText('Tecnología')).toBeInTheDocument();
  });

  it('dibuja sede, escuela y etiqueta como filas (barra por ancho)', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        sedes: ['Valparaíso'],
        escuelas: ['Salud'],
        etiquetas: ['Tecnología'],
      },
    ]);
    const { container } = render(<VitrinaDataDashboard proyectos={proyectos} />);
    expect(container.querySelectorAll('[style*="width:"]').length).toBeGreaterThanOrEqual(
      3,
    );
  });
});
