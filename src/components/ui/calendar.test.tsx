import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar } from './calendar';

afterEach(() => {
  cleanup();
});

describe('Calendar fechas de tarea', () => {
  it('muestra 24-09-2026 cuando el valor guardado es 2026-09-24', () => {
    render(<Calendar value="2026-09-24" />);
    expect(
      screen.getByRole('button', { name: /24-09-2026/ })
    ).toBeInTheDocument();
  });

  it('permite elegir el mismo día de término que el inicio', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Calendar
        compact
        value="2026-09-24"
        minDate="2026-09-24"
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /24-09-2026/ }));
    const day24 = screen
      .getAllByText('24')
      .find((el) => !el.className.includes('cursor-not-allowed'));
    expect(day24).toBeTruthy();
    await user.click(day24!);
    expect(onChange).toHaveBeenCalledWith('2026-09-24');
  });

  it('no permite un término anterior al inicio', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Calendar
        compact
        value="2026-09-24"
        minDate="2026-09-24"
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /24-09-2026/ }));
    const day23 = screen
      .getAllByText('23')
      .find((el) => el.className.includes('cursor-not-allowed'));
    expect(day23).toBeTruthy();
    await user.click(day23!);
    expect(onChange).not.toHaveBeenCalled();
  });
});
