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
    const { container } = render(
      <VitrinaDataDashboard proyectos={proyectos} />,
    );

    expect(
      container.querySelector('.text-7xl')?.textContent,
    ).toBe('2');
    expect(screen.queryByText(/proyectos en vitrina/i)).not.toBeInTheDocument();
    expect(screen.getByText('Por fondo')).toBeInTheDocument();
    expect(screen.getByText('Por línea')).toBeInTheDocument();
    expect(screen.getByText('Por sede')).toBeInTheDocument();
    expect(screen.getByText('Por escuela')).toBeInTheDocument();
    expect(screen.getByText('Por etiqueta')).toBeInTheDocument();
    expect(screen.getByText(/Fondo\s+Impulsa/)).toBeInTheDocument();
    expect(screen.getByText(/Línea\s+Alfa/)).toBeInTheDocument();
    expect(screen.getByText('Valparaíso')).toBeInTheDocument();
    expect(screen.getByText('Salud')).toBeInTheDocument();
    expect(screen.getByText('Tecnología')).toBeInTheDocument();
  });

  it('parte el nombre del fondo en dos líneas cuando tiene espacio', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        fondos: ['Fondo Impulsa'],
      },
    ]);
    render(<VitrinaDataDashboard proyectos={proyectos} />);

    const label = screen
      .getByTitle('Fondo Impulsa: 1')
      .querySelector('.whitespace-pre-line');
    expect(label).not.toBeNull();
    expect(label).toHaveClass('whitespace-pre-line');
    expect(label!.textContent).toBe('Fondo\nImpulsa');
  });

  it('coloca el conteo justo encima de cada barra vertical', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', fondos: ['Fondo Impulsa'], lineas: ['Línea Alfa'] },
      { nombre: 'B', fondos: ['Fondo Impulsa'], lineas: ['Línea Beta'] },
      { nombre: 'C', fondos: ['Fondo Crea'], lineas: ['Línea Alfa'] },
    ]);
    const { container } = render(
      <VitrinaDataDashboard proyectos={proyectos} />,
    );

    const fondoImpulsa = container.querySelector(
      '[title="Fondo Impulsa: 2"]',
    ) as HTMLElement;
    const fondoCrea = container.querySelector(
      '[title="Fondo Crea: 1"]',
    ) as HTMLElement;
    const countImpulsa = fondoImpulsa.querySelector(
      'span.tabular-nums',
    ) as HTMLElement;
    const countCrea = fondoCrea.querySelector(
      'span.tabular-nums',
    ) as HTMLElement;
    const barImpulsa = fondoImpulsa.querySelector(
      '[class*="rounded-t-md"]',
    ) as HTMLElement;
    const barCrea = fondoCrea.querySelector(
      '[class*="rounded-t-md"]',
    ) as HTMLElement;

    expect(countImpulsa).toHaveTextContent('2');
    expect(countCrea).toHaveTextContent('1');
    // Número en el flujo, encima de la barra (no absolute que se recorte).
    expect(countImpulsa.compareDocumentPosition(barImpulsa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(barImpulsa.style.height).toBe('148px');
    expect(barCrea.style.height).toBe('74px');
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
