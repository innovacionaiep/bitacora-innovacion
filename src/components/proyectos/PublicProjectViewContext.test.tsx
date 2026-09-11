import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  PublicProjectViewProvider,
  usePublicReadOnly,
} from '@/components/proyectos/PublicProjectViewContext';

function Probe() {
  const readOnly = usePublicReadOnly();
  return <span>{readOnly ? 'readonly' : 'editable'}</span>;
}

describe('PublicProjectViewContext', () => {
  it('is editable by default', () => {
    render(<Probe />);
    expect(screen.getByText('editable')).toBeInTheDocument();
  });

  it('is read-only inside the public provider', () => {
    render(
      <PublicProjectViewProvider>
        <Probe />
      </PublicProjectViewProvider>
    );
    expect(screen.getByText('readonly')).toBeInTheDocument();
  });
});
