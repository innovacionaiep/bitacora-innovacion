import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

afterEach(cleanup);
import { VitrinaViewToggle } from '@/components/vitrina/VitrinaViewToggle';
import {
  formatVerticalBarLabel,
  VitrinaDataDashboard,
} from '@/components/vitrina/VitrinaDataDashboard';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';
import type { PortalAvancesProyecto } from '@/lib/portal-avances';

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
  it('emite analisis, indicadores y data al pulsar los tabs', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<VitrinaViewToggle value="proyectos" onChange={onChange} />);

    expect(screen.getByRole('tab', { name: 'Proyectos' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getAllByRole('tab').map((tab) => tab.textContent),
    ).toEqual([
      'Proyectos',
      'Mapa',
      'Avances',
      'Análisis',
      'Indicadores',
      'Data',
      'Vinculamos',
    ]);
    await user.click(screen.getByRole('tab', { name: 'Análisis' }));
    expect(onChange).toHaveBeenCalledWith('analisis');
    await user.click(screen.getByRole('tab', { name: 'Indicadores' }));
    expect(onChange).toHaveBeenCalledWith('indicadores');
    await user.click(screen.getByRole('tab', { name: 'Data' }));
    expect(onChange).toHaveBeenCalledWith('data');
    await user.click(screen.getByRole('tab', { name: 'Vinculamos' }));
    expect(onChange).toHaveBeenCalledWith('vinculamos');
  });

  it('muestra Avances cuando el nivel incluye esa vista', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const view = render(
      <VitrinaViewToggle
        value="proyectos"
        onChange={onChange}
        tabs={['proyectos', 'mapa', 'avances', 'indicadores']}
      />,
    );
    const tabs = within(view.container)
      .getAllByRole('tab')
      .map((tab) => tab.textContent);
    expect(tabs).toEqual(['Proyectos', 'Mapa', 'Avances', 'Indicadores']);
    await user.click(within(view.container).getByRole('tab', { name: 'Avances' }));
    expect(onChange).toHaveBeenCalledWith('avances');
  });
});

describe('VitrinaDataDashboard', () => {
  it('usa un contenedor más ancho que las otras vistas del portal', () => {
    const { container } = render(<VitrinaDataDashboard proyectos={[]} />);
    const root = container.firstElementChild;
    expect(root).toHaveClass('max-w-[1920px]');
    expect(root).not.toHaveClass('max-w-[1600px]');
  });

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

    expect(screen.getByLabelText('Proyectos: 2').closest('ul')).toHaveClass(
      'flex-[0.7]',
    );
    expect(screen.getByLabelText('Estudiantes: 0').closest('ul')).toHaveClass(
      'flex-1',
    );
    expect(
      screen.getByLabelText('Socios comunitarios: 0').closest('ul'),
    ).toHaveClass('flex-1');
    expect(screen.getByLabelText('Proyectos: 2').querySelector('svg')).toHaveClass(
      'h-9',
      'w-9',
      'text-slate-500',
    );
    expect(within(screen.getByLabelText('Proyectos: 2')).getByText('Proyectos')).toHaveClass(
      'text-2xl',
    );
    expect(
      screen.getByLabelText('Proyectos: 2').querySelector('.tabular-nums'),
    ).toHaveClass('text-4xl');
    expect(screen.queryByText('Participantes')).not.toBeInTheDocument();
    expect(screen.getByText('Estudiantes')).toBeInTheDocument();
    expect(screen.getByText('Docentes')).toBeInTheDocument();
    expect(screen.getByText('Socios comunitarios')).toBeInTheDocument();
    expect(screen.getByText('Beneficiarios')).toBeInTheDocument();
    const resumenCard = screen.getByLabelText('Proyectos: 2').closest('article');
    expect(resumenCard).not.toBeNull();
    expect(within(resumenCard!).getAllByRole('separator')).toHaveLength(2);
    expect(within(resumenCard!).getByText('Proyectos')).toBeInTheDocument();
    expect(within(resumenCard!).getAllByText('0')).toHaveLength(4);
    expect(resumenCard!.querySelectorAll('svg')).toHaveLength(5);
    expect(screen.queryByText(/proyectos en vitrina/i)).not.toBeInTheDocument();
    expect(screen.getByText('Por fondo')).toBeInTheDocument();
    expect(screen.getByText('Por línea')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Asignatura' })).toBeInTheDocument();
    expect(screen.getByText('Por sede')).toBeInTheDocument();
    expect(screen.getByText('Por escuela')).toBeInTheDocument();
    expect(screen.getByText('Por carrera')).toBeInTheDocument();
    expect(screen.getByText('Por asignatura')).toBeInTheDocument();
    expect(screen.getByText('Por etiqueta')).toBeInTheDocument();
    expect(screen.getByText(/Fondo\s+Impulsa/)).toBeInTheDocument();
    expect(screen.getByText(/Línea\s+Alfa/)).toBeInTheDocument();
    expect(screen.getByText('Valparaíso')).toBeInTheDocument();
    expect(screen.getByText('Salud')).toBeInTheDocument();
    expect(screen.getByText('Tecnología')).toBeInTheDocument();
  });

  it('cuenta socios comunitarios únicos de los proyectos de la vitrina', () => {
    const proyectos = projectsFrom([{ nombre: 'A' }, { nombre: 'B' }]);
    proyectos[0]!.socioIds = ['s1', 's2'];
    proyectos[0]!.socios = ['MUKUNA', 'Otro'];
    proyectos[1]!.socioIds = ['s1'];
    proyectos[1]!.socios = ['MUKUNA'];
    render(<VitrinaDataDashboard proyectos={proyectos} />);
    expect(screen.getByLabelText('Socios comunitarios: 2')).toBeInTheDocument();
    const docentes = screen.getByLabelText('Docentes: 0');
    const socios = screen.getByLabelText('Socios comunitarios: 2');
    expect(
      docentes.compareDocumentPosition(socios) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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
      .getByLabelText('Fondo Impulsa: 1 proyecto')
      .querySelector('.whitespace-pre');
    expect(label).not.toBeNull();
    expect(label).toHaveClass('whitespace-pre');
    expect(label!.textContent).toBe('Fondo\nImpulsa');
  });

  it('reserva la misma altura de dos líneas para todas las etiquetas verticales', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', lineas: ['Innovación'] },
      { nombre: 'B', lineas: ['Innovación en el Aula'] },
    ]);
    render(<VitrinaDataDashboard proyectos={proyectos} />);

    const oneLine = screen
      .getByLabelText('Innovación: 1 proyecto')
      .querySelector('.whitespace-pre');
    const twoLines = screen
      .getByLabelText('Innovación en el Aula: 1 proyecto')
      .querySelector('.whitespace-pre');

    expect(oneLine).toHaveClass('h-[2.5em]');
    expect(twoLines).toHaveClass('h-[2.5em]');
    expect(oneLine).toHaveClass('block');
    expect(twoLines).toHaveClass('block');
  });

  it('limita las etiquetas de barra vertical a dos líneas', () => {
    expect(formatVerticalBarLabel('Innovación en el Aula')).toBe(
      'Innovación\nen el Aula',
    );
    expect(formatVerticalBarLabel('Innovación Social')).toBe(
      'Innovación\nSocial',
    );
    expect(formatVerticalBarLabel('Escalamiento')).toBe('Escalamiento');

    const proyectos = projectsFrom([
      { nombre: 'A', lineas: ['Innovación en el Aula'] },
    ]);
    render(<VitrinaDataDashboard proyectos={proyectos} />);
    const label = screen
      .getByLabelText('Innovación en el Aula: 1 proyecto')
      .querySelector('.whitespace-pre');
    expect(label!.textContent).toBe('Innovación\nen el Aula');
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

    const fondoImpulsa = screen.getByLabelText('Fondo Impulsa: 2 proyectos');
    const fondoCrea = screen.getByLabelText('Fondo Crea: 1 proyecto');
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
    expect(countImpulsa.compareDocumentPosition(barImpulsa) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(countImpulsa.previousElementSibling).toHaveStyle({ flexGrow: '0' });
    expect(countCrea.previousElementSibling).toHaveStyle({ flexGrow: '50' });
    expect(barImpulsa).toHaveStyle({ flexGrow: '100' });
    expect(barCrea).toHaveStyle({ flexGrow: '50' });
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

  it('muestra carreras de Avances con título normalizado entre escuela y etiqueta', () => {
    const proyectos = projectsFrom([{ nombre: 'A', fondos: ['Fondo Impulsa'] }]);
    const avances: PortalAvancesProyecto[] = [
      {
        id: '1',
        fondo: 'Innovación Docente',
        proyecto: 'Aula',
        sede: 'Santiago',
        escuelas: ['Salud'],
        carreras: ['TÉCNICO EN COSMETOLOGÍA'],
        asignaturas: ['Anatomía'],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
      },
    ];
    render(
      <VitrinaDataDashboard
        proyectos={proyectos}
        avancesProyectos={avances}
        accessLevel={3}
      />,
    );
    const escuela = screen.getByText('Por escuela');
    const carrera = screen.getByText('Por carrera');
    const asignatura = screen.getByText('Por asignatura');
    const etiqueta = screen.getByText('Por etiqueta');
    expect(
      escuela.compareDocumentPosition(carrera) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      carrera.compareDocumentPosition(asignatura) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      asignatura.compareDocumentPosition(etiqueta) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('Técnico en Cosmetología')).toBeInTheDocument();
    expect(screen.getByText('Anatomía')).toBeInTheDocument();
  });

  it('une Por fondo y Por línea en una tarjeta con separador y deja hueco entre filas', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', fondos: ['Fondo Impulsa'], lineas: ['Línea Alfa'] },
    ]);
    render(<VitrinaDataDashboard proyectos={proyectos} />);

    const fondo = screen.getByRole('heading', { name: 'Por fondo' });
    const linea = screen.getByRole('heading', { name: 'Por línea' });
    expect(
      fondo.compareDocumentPosition(linea) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    const stack = fondo.closest('[data-fondo-linea-stack]');
    expect(stack).not.toBeNull();
    expect(stack).toContainElement(linea);
    expect(fondo.closest('article')).toBe(linea.closest('article'));
    expect(stack).toHaveClass('flex-col');
    expect(within(stack as HTMLElement).getByRole('separator')).toHaveClass(
      'border-t',
      'border-slate-200',
    );

    const grid = stack!.parentElement;
    expect(grid).toHaveClass(
      'lg:grid-cols-[minmax(14rem,0.8fr)_minmax(0,2.2fr)_minmax(12rem,0.75fr)]',
    );
    expect(grid).toHaveClass('auto-rows-[minmax(0,1fr)]');
    expect(grid).not.toHaveClass('auto-rows-[minmax(28rem,1fr)]');
  });

  it('dibuja la torta de asignatura a la derecha de Por línea con fondos de Avances', () => {
    const proyectos = projectsFrom([{ nombre: 'A', fondos: ['Fondo Impulsa'] }]);
    const avances: PortalAvancesProyecto[] = [
      {
        id: '1',
        fondo: 'Innovación Docente',
        proyecto: 'Aula',
        sede: 'Santiago',
        escuelas: ['Salud'],
        carreras: [],
        asignaturas: ['Anatomía'],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
      },
      {
        id: '2',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
        sede: 'Valparaíso',
        escuelas: ['Salud'],
        carreras: [],
        asignaturas: [],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
      },
      {
        id: '3',
        fondo: 'MOVE Incuba',
        proyecto: 'Externo',
        sede: 'Temuco',
        escuelas: ['Negocios'],
        asignaturas: ['Geología'],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
      },
    ];
    render(
      <VitrinaDataDashboard
        proyectos={proyectos}
        avancesProyectos={avances}
        accessLevel={3}
      />,
    );
    const linea = screen.getByRole('heading', { name: 'Por línea' });
    const pie = screen.getByRole('heading', { name: 'Asignatura' });
    expect(
      linea.compareDocumentPosition(pie) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByLabelText('Con asignatura: 50%')).toBeInTheDocument();
    const sliceSin = screen.getByLabelText('Sin asignatura: 50%');
    expect(sliceSin).toHaveAttribute('fill', '#cbd5e1');
    const slice = screen.getByLabelText('Con asignatura: 50%');
    const svg = slice.closest('svg');
    const size = Number(svg?.getAttribute('width'));
    expect(size).toBeGreaterThan(132);
    const d = slice.getAttribute('d') ?? '';
    const start = d.match(/^M ([\d.]+) ([\d.]+)/);
    expect(start).not.toBeNull();
    expect(Number(start?.[1])).toBeCloseTo(size / 2, 0);
    expect(Number(start?.[2])).toBeLessThan(size / 2);
    expect(d).toMatch(/A [\d.]+ [\d.]+ 0 0 0 /);
    const pieCard = pie.closest('article');
    expect(pieCard?.querySelector('[data-asignatura-pie]')).toHaveClass(
      'justify-end',
    );
  });

  it('muestra los nombres de los proyectos al pasar el mouse sobre una barra', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'ClinicApp',
        fondos: ['Fondo Impulsa'],
        sedes: ['Valparaíso'],
      },
      {
        nombre: 'Beehappy',
        fondos: ['Fondo Impulsa'],
        sedes: ['Valparaíso'],
      },
      {
        nombre: 'AgroTech',
        fondos: ['MOVE Incuba'],
        sedes: ['Temuco'],
      },
    ]);
    render(<VitrinaDataDashboard proyectos={proyectos} />);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.hover(screen.getByLabelText('Fondo Impulsa: 2 proyectos'));

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Fondo Impulsa');
    expect(tooltip).toHaveTextContent('Beehappy');
    expect(tooltip).toHaveTextContent('ClinicApp');
    expect(tooltip).not.toHaveTextContent('AgroTech');
    expect(tooltip.querySelectorAll('[aria-hidden]').length).toBe(2);
    expect(tooltip).toHaveClass('max-w-md');

    await user.hover(screen.getByLabelText('Valparaíso: 2 proyectos'));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Valparaíso');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Beehappy');
    expect(screen.getByRole('tooltip')).not.toHaveTextContent('AgroTech');
  });

  it('suma participantes de Avances solo en fondos habilitados con esas columnas', () => {
    const proyectos = projectsFrom([{ nombre: 'A', fondos: ['Fondo Impulsa'] }]);
    const avances: PortalAvancesProyecto[] = [
      {
        id: '1',
        fondo: 'Innovación Docente',
        proyecto: 'Aula',
        sede: 'Santiago',
        escuelas: ['Salud'],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
        estudiantes: 3,
        docentes: 1,
        beneficiarios: 4,
      },
      {
        id: '2',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
        sede: 'Valparaíso',
        escuelas: ['Salud'],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
        estudiantes: 10,
        docentes: 2,
        beneficiarios: 5,
      },
      {
        id: '3',
        fondo: 'MOVE Incuba',
        proyecto: 'Externo',
        sede: 'Temuco',
        escuelas: ['Negocios'],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
        estudiantes: 99,
        docentes: 99,
        beneficiarios: 99,
      },
    ];
    render(
      <VitrinaDataDashboard
        proyectos={proyectos}
        avancesProyectos={avances}
        accessLevel={3}
      />,
    );

    const card = screen.getByLabelText('Estudiantes: 13').closest('article');
    expect(card).not.toBeNull();
    expect(within(card!).getByText('13')).toBeInTheDocument();
    expect(within(card!).getByText('3')).toBeInTheDocument();
    expect(within(card!).getByText('9')).toBeInTheDocument();
    expect(within(card!).queryByText('99')).not.toBeInTheDocument();
  });

  it('filtra la tarjeta de participantes por el Fondo del sidebar (fondos de Avances)', () => {
    const proyectos = projectsFrom([{ nombre: 'A', fondos: ['Fondo Impulsa'] }]);
    const avances: PortalAvancesProyecto[] = [
      {
        id: '1',
        fondo: 'Innovación Docente',
        proyecto: 'Aula',
        sede: 'Santiago',
        escuelas: ['Salud'],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
        estudiantes: 3,
        docentes: 1,
        beneficiarios: 4,
      },
      {
        id: '2',
        fondo: 'Fondo Impulsa',
        proyecto: 'ClinicApp',
        sede: 'Valparaíso',
        escuelas: ['Salud'],
        presupuestoAdjudicado: 0,
        avanceGantt: 0,
        avanceIndicadores: 0,
        avancePresupuestoSolicitado: 0,
        avancePresupuestoEjecutado: 0,
        avanceHonorarios: 0,
        avanceOperativoSolicitado: 0,
        avanceOperativoEjecutado: 0,
        saldoPresupuesto: 0,
        estudiantes: 10,
        docentes: 2,
        beneficiarios: 5,
      },
    ];
    render(
      <VitrinaDataDashboard
        proyectos={proyectos}
        avancesProyectos={avances}
        accessLevel={3}
        fondosFiltro={['Fondo Impulsa']}
      />,
    );

    const card = screen.getByLabelText('Estudiantes: 10').closest('article');
    expect(card).not.toBeNull();
    expect(within(card!).getByText('10')).toBeInTheDocument();
    expect(within(card!).getByText('2')).toBeInTheDocument();
    expect(within(card!).getByText('5')).toBeInTheDocument();
    expect(within(card!).queryByText('3')).not.toBeInTheDocument();
  });

  it('pinta las barras de línea con el color del fondo padre', () => {
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        fondos: ['Fondo Impulsa'],
        lineas: ['Innovación'],
      },
      {
        nombre: 'B',
        fondos: ['Innovación Docente'],
        lineas: ['Innovación en el Aula'],
      },
    ]);
    render(<VitrinaDataDashboard proyectos={proyectos} />);

    const impulsaLinea = screen.getByLabelText('Innovación: 1 proyecto');
    const docenteLinea = screen.getByLabelText(
      'Innovación en el Aula: 1 proyecto',
    );
    expect(impulsaLinea.querySelector('[class*="rounded-t-md"]')).toHaveClass(
      'bg-emerald-600',
    );
    expect(docenteLinea.querySelector('[class*="rounded-t-md"]')).toHaveClass(
      'bg-[#DC143C]',
    );
  });
});
