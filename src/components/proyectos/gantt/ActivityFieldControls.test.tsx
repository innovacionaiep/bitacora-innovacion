import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityHoverEditButton } from './ActivityFieldControls';
import { PublicProjectViewProvider } from '@/components/proyectos/PublicProjectViewContext';

describe('ActivityHoverEditButton', () => {
  it('hides the pencil in public read-only view', () => {
    render(
      <PublicProjectViewProvider>
        <ActivityHoverEditButton onClick={() => undefined} tooltip="Editar" />
      </PublicProjectViewProvider>
    );
    expect(screen.queryByLabelText('Editar')).not.toBeInTheDocument();
  });

  it('shows the pencil when editable', () => {
    render(
      <ActivityHoverEditButton onClick={() => undefined} tooltip="Editar" />
    );
    expect(screen.getByLabelText('Editar')).toBeInTheDocument();
  });
});
