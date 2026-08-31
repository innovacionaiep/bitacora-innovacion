import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VitrinaIndicadoresDashboard } from '@/components/vitrina/VitrinaIndicadoresDashboard';
import { normalizeVitrinaProyectos } from '@/lib/vitrina-proyectos';

afterEach(cleanup);

function projectsFrom(rows: Array<Record<string, unknown> & { nombre: string }>) {
  const result = normalizeVitrinaProyectos(rows);
  if (!result.ok) throw new Error(result.error);
  return result.proyectos;
}

async function goToIgipFamily(user: ReturnType<typeof userEvent.setup>) {
  const familia = screen.getByRole('tablist', { name: 'Familia de indicadores' });
  await user.click(within(familia).getByRole('tab', { name: 'IGIP' }));
}

describe('VitrinaIndicadoresDashboard', () => {
  it('abre TRL por defecto y muestra el Sankey de proyección', () => {
    const proyectos = projectsFrom([
      { nombre: 'A', trlInicial: 2, trlProyeccion: 4 },
      { nombre: 'B', trlInicial: 2, trlProyeccion: 4 },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);

    expect(screen.getByRole('tab', { name: 'TRL' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'TRL Proyección' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Sankey' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByLabelText('Sankey TRL desde Inicial hacia TRL Proyección'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('TRL 2 → TRL 4: 2 proyectos'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sankey-level-guides')).toBeInTheDocument();
  });

  it('cambia a TRL Final y muestra el scatter de IGIP', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        trlInicial: 1,
        trlProyeccion: 3,
        trlFinal: 6,
        igipInicial: 1.2,
        igipProyeccion: 3.5,
      },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);

    const destino = screen.getByRole('tablist', { name: 'Destino TRL' });
    await user.click(within(destino).getByRole('tab', { name: 'TRL Final' }));
    expect(
      screen.getByLabelText('TRL 1 → TRL 6: 1 proyecto'),
    ).toBeInTheDocument();

    await goToIgipFamily(user);
    expect(screen.getByRole('tab', { name: 'Dumbbell' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByLabelText(/Avance IGIP desde Inicial hacia IGIP Proyección/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/IGIP estará disponible próximamente/i),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'IGIP Proyección' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('tab', { name: 'TRL Proyección' })).not.toBeInTheDocument();
  });

  it('permite cambiar a Sankey IGIP con tramos de 0.25 y a Dumbbell TRL', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'A',
        trlInicial: 2,
        trlProyeccion: 4,
        igipInicial: 1.6,
        igipProyeccion: 2.1,
      },
      {
        nombre: 'B',
        trlInicial: 3,
        trlProyeccion: 5,
        igipInicial: 1.7,
        igipProyeccion: 2.2,
      },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);

    const chartTabs = screen.getByRole('tablist', { name: 'Tipo de gráfico' });
    expect(chartTabs).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Dumbbell' }));
    expect(
      screen.getByLabelText(/Avance TRL desde Inicial hacia TRL Proyección/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('TRL 2 → 4: A')).toBeInTheDocument();

    await goToIgipFamily(user);
    await user.click(within(chartTabs).getByRole('tab', { name: 'Sankey' }));
    expect(
      screen.getByLabelText('Sankey IGIP desde Inicial hacia IGIP Proyección'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('1.5-1.75 → 2-2.25: 2 proyectos'),
    ).toBeInTheDocument();
  });

  it('muestra los nombres de los proyectos al pasar el mouse sobre una franja', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      { nombre: 'ClinicApp', trlInicial: 2, trlProyeccion: 4 },
      { nombre: 'Beehappy', trlInicial: 2, trlProyeccion: 4 },
      { nombre: 'AgroTech', trlInicial: 3, trlProyeccion: 5 },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.hover(screen.getByLabelText('TRL 2 → TRL 4: 2 proyectos'));

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Beehappy');
    expect(tooltip).toHaveTextContent('ClinicApp');
    expect(tooltip).not.toHaveTextContent('AgroTech');
    expect(tooltip.querySelectorAll('[aria-hidden]').length).toBe(2);
  });

  it('muestra encabezados IGIP con fondo gris y leyenda fuera de la tarjeta', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      { nombre: 'ClinicApp', igipInicial: 1.2, igipProyeccion: 3.5 },
      { nombre: 'Beehappy', igipInicial: 1.2, igipProyeccion: 3.5 },
      { nombre: 'AgroTech', igipInicial: 4, igipProyeccion: 6 },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);
    await goToIgipFamily(user);

    const nombre = screen.getByText('Nombre Proyecto');
    const variacion = screen.getByText('Variación', {
      selector: 'p.bg-slate-200',
    });
    expect(nombre).toHaveClass('bg-slate-200');
    expect(variacion).toHaveClass('bg-slate-200');
    expect(screen.getByRole('button', { name: 'Ordenar por' })).toBeInTheDocument();
    expect(screen.queryByText('Ordenado por mayor avance')).not.toBeInTheDocument();
    expect(screen.getByText('Inicial')).toBeInTheDocument();
    expect(screen.getByText('Proyección')).toBeInTheDocument();
    expect(screen.getByText('1.5')).toBeInTheDocument();
    expect(screen.getByText('1.75')).toBeInTheDocument();
    expect(screen.getByText('2.25')).toBeInTheDocument();
    expect(
      screen.getByLabelText('IGIP 1.2 → 3.5: ClinicApp'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('IGIP 1.2 → 3.5: Beehappy'),
    ).toBeInTheDocument();

    const clinic = screen.getByLabelText('IGIP 1.2 → 3.5: ClinicApp');
    expect(within(clinic).queryByText('1.2')).not.toBeInTheDocument();
    await user.hover(clinic);
    expect(within(clinic).getByText('1.2')).toBeInTheDocument();
    expect(within(clinic).getByText('3.5')).toBeInTheDocument();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancelar selección' }),
    ).not.toBeInTheDocument();

    await user.hover(screen.getByLabelText('IGIP 4 → 6: AgroTech'));
    expect(
      within(screen.getByLabelText('IGIP 1.2 → 3.5: ClinicApp')).queryByText('1.2'),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText('IGIP 4 → 6: AgroTech')).getByText('4'),
    ).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('IGIP 4 → 6: AgroTech')).getByText('6'),
    ).toBeInTheDocument();
  });

  it('en Dumbbell IGIP usa el índice por defecto y pasa a notas 0–4 con Originalidad', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'ClinicApp',
        igipInicial: 1.2,
        igipProyeccion: 3.5,
        igipInicialOriginalidad: 2,
        igipProyeccionOriginalidad: 4,
      },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);
    await goToIgipFamily(user);

    const metricTabs = screen.getByRole('tablist', { name: 'Métrica del dumbbell' });
    expect(within(metricTabs).getByRole('tab', { name: 'IGIP' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByLabelText('IGIP 1.2 → 3.5: ClinicApp'),
    ).toBeInTheDocument();
    expect(screen.getByText('1.5')).toBeInTheDocument();

    await user.click(within(metricTabs).getByRole('tab', { name: 'Originalidad' }));
    expect(within(metricTabs).getByRole('tab', { name: 'Originalidad' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByLabelText(
        'Avance Originalidad desde Inicial hacia Originalidad Proyección',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Originalidad 2 → 4: ClinicApp'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByTestId('dumbbell-axis-tick').map((el) => el.textContent),
    ).toEqual(['0', '1', '2', '3', '4']);
  });

  it('pone el punto inicial encima cuando no hay variación', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      { nombre: 'NeuroScratch', igipInicial: 3, igipProyeccion: 3 },
      { nombre: 'ClinicApp', igipInicial: 1.2, igipProyeccion: 3.5 },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);
    await goToIgipFamily(user);

    const sinCambio = screen.getByLabelText('IGIP 3 → 3: NeuroScratch');
    expect(within(sinCambio).getByText('sin cambio')).toBeInTheDocument();
    expect(within(sinCambio).getByTestId('dumbbell-dot-from')).toHaveClass('z-10');
    expect(within(sinCambio).getByTestId('dumbbell-dot-to')).toHaveClass('z-0');

    const conAvance = screen.getByLabelText('IGIP 1.2 → 3.5: ClinicApp');
    expect(within(conAvance).getByTestId('dumbbell-dot-from')).not.toHaveClass(
      'z-10',
    );
  });

  it('permite ordenar el gráfico IGIP por nombre o variación', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      { nombre: 'ClinicApp', igipInicial: 2, igipProyeccion: 2.2 },
      { nombre: 'AgroTech', igipInicial: 4, igipProyeccion: 4.5 },
      { nombre: 'Beehappy', igipInicial: 1, igipProyeccion: 3 },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);
    await goToIgipFamily(user);

    expect(screen.getByText('Ordenar por:')).toBeInTheDocument();
    const rows = () =>
      screen
        .getAllByRole('img')
        .map((el) => el.getAttribute('aria-label') ?? '')
        .filter((label) => label.startsWith('IGIP '));

    expect(rows()[0]).toContain('Beehappy');

    await user.click(screen.getByRole('button', { name: 'Ordenar por' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Nombre' }));
    expect(rows()[0]).toContain('AgroTech');
    expect(rows()[1]).toContain('Beehappy');
    expect(rows()[2]).toContain('ClinicApp');
  });

  it('muestra scatter TRL×IGIP al elegir Ambos', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'ClinicApp',
        trlInicial: 2,
        trlProyeccion: 5,
        igipInicial: 1.5,
        igipProyeccion: 3,
      },
      {
        nombre: 'AgroTech',
        trlInicial: 3,
        trlFinal: 7,
        igipInicial: 2,
        igipFinal: 4.5,
      },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);

    await user.click(screen.getByRole('tab', { name: 'Ambos' }));

    expect(screen.getByRole('tab', { name: 'Ambos' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tab', { name: 'Proyección' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.queryByRole('tablist', { name: 'Tipo de gráfico' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Scatter TRL e IGIP desde Inicial hacia Proyección'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Inicial ClinicApp: TRL 2, IGIP 1.5'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Proyección ClinicApp: TRL 5, IGIP 3'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Inicial AgroTech: TRL 3, IGIP 2'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/AgroTech: TRL 7/),
    ).not.toBeInTheDocument();

    const destino = screen.getByRole('tablist', { name: 'Destino indicadores' });
    await user.click(within(destino).getByRole('tab', { name: 'Final' }));
    expect(
      screen.getByLabelText('Scatter TRL e IGIP desde Inicial hacia Final'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Final AgroTech: TRL 7, IGIP 4.5'),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/ClinicApp: TRL 5/),
    ).not.toBeInTheDocument();
  });

  it('al hover de un punto Ambos muestra la línea Inicial → destino', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'ClinicApp',
        trlInicial: 2,
        trlProyeccion: 5,
        igipInicial: 1.5,
        igipProyeccion: 3,
      },
      {
        nombre: 'AgroTech',
        trlInicial: 3,
        trlProyeccion: 6,
        igipInicial: 2,
        igipProyeccion: 4,
      },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);
    await user.click(screen.getByRole('tab', { name: 'Ambos' }));

    expect(
      screen.queryByLabelText(/Trayectoria ClinicApp/),
    ).not.toBeInTheDocument();

    await user.hover(
      screen.getByLabelText('Inicial ClinicApp: TRL 2, IGIP 1.5'),
    );
    expect(
      screen.getByLabelText('Trayectoria ClinicApp: Inicial → Proyección'),
    ).toBeInTheDocument();

    await user.hover(
      screen.getByLabelText('Proyección AgroTech: TRL 6, IGIP 4'),
    );
    expect(
      screen.queryByLabelText(/Trayectoria ClinicApp/),
    ).not.toBeInTheDocument();
    expect(
      screen.getByLabelText('Trayectoria AgroTech: Inicial → Proyección'),
    ).toBeInTheDocument();
  });

  it('muestra todos los nombres aunque varios proyectos compartan destino', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'ClinicApp',
        trlInicial: 2,
        trlProyeccion: 5,
        igipInicial: 1.5,
        igipProyeccion: 3,
      },
      {
        nombre: 'AgroTech',
        trlInicial: 3,
        trlProyeccion: 5,
        igipInicial: 2,
        igipProyeccion: 3,
      },
      {
        nombre: 'Beehappy',
        trlInicial: 1,
        trlProyeccion: 5,
        igipInicial: 1.75,
        igipProyeccion: 3,
      },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);
    await user.click(screen.getByRole('tab', { name: 'Ambos' }));
    await user.click(screen.getByRole('button', { name: 'Mostrar nombres' }));

    expect(screen.getByText('ClinicApp')).toBeInTheDocument();
    expect(screen.getByText('AgroTech')).toBeInTheDocument();
    expect(screen.getByText('Beehappy')).toBeInTheDocument();
  });

  it('en hover muestra solo el proyecto de ese círculo', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'Patagon Emprende 2.0',
        trlInicial: 2,
        trlProyeccion: 5,
        igipInicial: 2,
        igipProyeccion: 3,
      },
      {
        nombre: 'Gestión Inteligente CESFAM',
        trlInicial: 2,
        trlProyeccion: 5,
        igipInicial: 2,
        igipProyeccion: 3,
      },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);
    await user.click(screen.getByRole('tab', { name: 'Ambos' }));

    await user.hover(
      screen.getByLabelText(
        'Proyección Patagon Emprende 2.0: TRL 5, IGIP 3',
      ),
    );

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent('Patagon Emprende 2.0');
    expect(tooltip).not.toHaveTextContent('Gestión Inteligente CESFAM');
    expect(
      screen.getByLabelText(
        'Trayectoria Patagon Emprende 2.0: Inicial → Proyección',
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(
        'Trayectoria Gestión Inteligente CESFAM: Inicial → Proyección',
      ),
    ).not.toBeInTheDocument();
  });

  it('permite mostrar trayectorias y nombres Ambos por separado', async () => {
    const user = userEvent.setup();
    const proyectos = projectsFrom([
      {
        nombre: 'ClinicApp',
        trlInicial: 2,
        trlProyeccion: 5,
        igipInicial: 1.5,
        igipProyeccion: 3,
      },
      {
        nombre: 'AgroTech',
        trlInicial: 3,
        trlProyeccion: 6,
        igipInicial: 2,
        igipProyeccion: 4,
      },
      {
        nombre: 'SoloInicial',
        trlInicial: 1,
        igipInicial: 1.75,
      },
    ]);
    render(<VitrinaIndicadoresDashboard proyectos={proyectos} />);
    await user.click(screen.getByRole('tab', { name: 'Ambos' }));

    const trayectorias = screen.getByRole('button', {
      name: 'Mostrar trayectorias',
    });
    const nombres = screen.getByRole('button', { name: 'Mostrar nombres' });
    expect(trayectorias).toHaveAttribute('aria-pressed', 'false');
    expect(nombres).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.queryByLabelText(/Trayectoria ClinicApp/),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('ClinicApp')).not.toBeInTheDocument();

    await user.click(trayectorias);
    expect(
      screen.getByRole('button', { name: 'Ocultar trayectorias' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByLabelText('Trayectoria ClinicApp: Inicial → Proyección'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Trayectoria AgroTech: Inicial → Proyección'),
    ).toBeInTheDocument();
    expect(screen.queryByText('ClinicApp')).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Trayectoria SoloInicial/),
    ).not.toBeInTheDocument();

    await user.click(nombres);
    expect(
      screen.getByRole('button', { name: 'Ocultar nombres' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('ClinicApp')).toBeInTheDocument();
    expect(screen.getByText('AgroTech')).toBeInTheDocument();
    expect(screen.queryByText('SoloInicial')).not.toBeInTheDocument();
  });

  it('en IGIP ofrece Radial y promedia Inicial; Promedio azul ignora el selector', async () => {
    const user = userEvent.setup();
    const result = normalizeVitrinaProyectos([
      {
        id: 'a',
        nombre: 'Alfa',
        igipInicialOriginalidad: 2,
        igipProyeccionOriginalidad: 3,
      },
      {
        id: 'b',
        nombre: 'Beta',
        igipInicialOriginalidad: 4,
        igipProyeccionOriginalidad: 1,
      },
    ]);
    if (!result.ok) throw new Error(result.error);

    render(<VitrinaIndicadoresDashboard proyectos={result.proyectos} />);

    expect(screen.queryByRole('tab', { name: 'Radial' })).not.toBeInTheDocument();

    await goToIgipFamily(user);
    expect(screen.getByRole('tab', { name: 'Radial' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: 'Radial' }));

    expect(
      screen.getByLabelText(
        'Gráfico radial IGIP desde Inicial hacia IGIP Proyección',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('radar-score-originalidad-inicial')).toHaveTextContent(
      '3.0',
    );
    expect(screen.getByTestId('radar-score-originalidad-destino')).toHaveTextContent(
      '2.0',
    );

    await user.click(screen.getByRole('button', { name: 'Selector de proyectos' }));
    await user.click(screen.getByText('Alfa'));
    expect(screen.getByTestId('radar-score-originalidad-inicial')).toHaveTextContent(
      '2',
    );

    await user.click(screen.getByRole('button', { name: 'Promedio' }));
    expect(screen.getByTestId('radar-score-originalidad-promedio')).toHaveTextContent(
      '3.0',
    );
  });
});