import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaAvancesView } from '@/components/vitrina/VitrinaAvancesView';
import type { PortalAvancesProyecto } from '@/lib/portal-avances';

afterEach(() => {
  cleanup();
});

function row(
  patch: Partial<PortalAvancesProyecto> & Pick<PortalAvancesProyecto, 'id'>,
): PortalAvancesProyecto {
  return {
    fondo: 'Innovación Docente',
    proyecto: 'Proyecto aula',
    sede: 'San Antonio',
    escuelas: ['Salud'],
    presupuestoAdjudicado: 400_000,
    avanceGantt: 4,
    avanceIndicadores: 0,
    avancePresupuestoSolicitado: 0,
    avancePresupuestoEjecutado: 0,
    avanceHonorarios: 0,
    avanceOperativoSolicitado: 49,
    avanceOperativoEjecutado: 0,
    saldoPresupuesto: -1000,
    estudiantes: 3,
    docentes: 2,
    beneficiarios: 1,
    ...patch,
  };
}

describe('VitrinaAvancesView', () => {
  it('muestra la botonera de fondos y la tabla con escuelas, sin Línea', () => {
    render(
      <VitrinaAvancesView
        fondoNombre="Innovación Docente"
        onFondoChange={vi.fn()}
        proyectos={[row({ id: '1' })]}
      />,
    );

    expect(
      screen.getByRole('navigation', { name: 'Fondos de avances' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Innovación Docente' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.getByRole('button', { name: 'Fondos Externos' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Nombre proyecto/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Escuelas/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: /Línea/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('Proyecto aula')).toBeInTheDocument();
    expect(screen.getByText('Proyecto aula').className).toMatch(/sticky/);
    expect(screen.getByText('Salud')).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /ID Vinculamos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Estudiantes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Docentes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Beneficiarios/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Proyecto aula' })).toBeNull();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('en Reto Innovador también muestra las columnas de personas', () => {
    render(
      <VitrinaAvancesView
        fondoNombre="Reto Innovador de Especialidad"
        onFondoChange={vi.fn()}
        proyectos={[
          row({
            id: 'rie-1',
            fondo: 'Reto Innovador de Especialidad',
            estudiantes: 8,
            docentes: 4,
            beneficiarios: 0,
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: /ID Vinculamos/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('en Impulsa muestra ID Vinculamos y No aplica en Honorarios', () => {
    render(
      <VitrinaAvancesView
        fondoNombre="Fondo Impulsa"
        onFondoChange={vi.fn()}
        proyectos={[
          row({
            id: 'impulsa:2',
            fondo: 'Fondo Impulsa',
            proyecto: 'ClinicApp',
            idVinculamos: 'Sin registro',
            estudiantes: 10,
            docentes: 2,
            beneficiarios: 5,
            honorariosNoAplica: true,
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: /ID Vinculamos/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Sin registro')).toBeInTheDocument();
    expect(screen.getByText('No aplica')).toBeInTheDocument();
    expect(screen.getByText('ClinicApp').className).toMatch(/sticky/);
    expect(screen.getByText('ClinicApp')).toHaveStyle({ width: '260px' });
  });

  it('permite redimensionar columnas arrastrando el separador del header', () => {
    render(
      <VitrinaAvancesView
        fondoNombre="Innovación Docente"
        onFondoChange={vi.fn()}
        proyectos={[row({ id: '1' })]}
      />,
    );

    const handle = screen.getByRole('separator', {
      name: 'Redimensionar columna Nombre proyecto',
    });
    const head = screen.getByRole('columnheader', {
      name: /Nombre proyecto/i,
    });
    expect(head).toHaveStyle({ width: '260px' });

    fireEvent.mouseDown(handle, { clientX: 100 });
    fireEvent.mouseMove(document, { clientX: 140 });
    fireEvent.mouseUp(document, { clientX: 140 });

    expect(head).toHaveStyle({ width: '300px' });
    expect(screen.getByText('Proyecto aula')).toHaveStyle({ width: '300px' });
  });

  it('oculta columnas no visibles', () => {
    render(
      <VitrinaAvancesView
        fondoNombre="Innovación Docente"
        onFondoChange={vi.fn()}
        proyectos={[row({ id: '1' })]}
        visibleColumns={['proyecto', 'sede', 'gantt']}
      />,
    );

    expect(
      screen.getByRole('columnheader', { name: /Nombre proyecto/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /^Sede/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /Gantt/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: /Escuelas/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: /Delta/i }),
    ).not.toBeInTheDocument();
  });

  it('muestra vacío cuando no hay filas', async () => {
    const user = userEvent.setup();
    const onFondoChange = vi.fn();
    render(
      <VitrinaAvancesView
        fondoNombre="Fondo Impulsa"
        onFondoChange={onFondoChange}
        proyectos={[]}
      />,
    );

    expect(screen.getByText('No hay proyectos en este fondo.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'MOVE Incuba' }));
    expect(onFondoChange).toHaveBeenCalledWith('MOVE Incuba');
  });

  it('puede limitar la botonera a Fondo Impulsa', () => {
    render(
      <VitrinaAvancesView
        fondoNombre="Fondo Impulsa"
        onFondoChange={vi.fn()}
        proyectos={[]}
        fondos={[{ nombre: 'Fondo Impulsa', source: 'excel' }]}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Fondo Impulsa' }),
    ).toHaveAttribute('aria-current', 'page');
    expect(
      screen.queryByRole('button', { name: 'Innovación Docente' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'MOVE Incuba' }),
    ).not.toBeInTheDocument();
  });
});
