import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { EvidenciasCargadasPill } from './EvidenciasCargadasPill';

afterEach(() => cleanup());

describe('EvidenciasCargadasPill', () => {
  it('no renderiza si no hay evidencias', () => {
    const { container } = render(<EvidenciasCargadasPill visible={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('muestra el texto y el icono de check', () => {
    render(<EvidenciasCargadasPill visible />);
    expect(screen.getByText('Evidencias cargadas')).toBeInTheDocument();
    expect(screen.getByLabelText('Evidencias cargadas')).toBeInTheDocument();
  });
});
