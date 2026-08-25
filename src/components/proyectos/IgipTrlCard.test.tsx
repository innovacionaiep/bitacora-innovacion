import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { trlRowAppearance } from '@/lib/igip-trl';

function TrlPreview({ selectedTrl }: { selectedTrl: number | null }) {
  return (
    <div>
      {[1, 2, 3, 4, 5, 6, 7].map((level) => (
        <div
          key={level}
          data-testid={`trl-row-${level}`}
          data-appearance={trlRowAppearance(level, selectedTrl)}
        />
      ))}
    </div>
  );
}

describe('TRL stack highlight', () => {
  afterEach(() => {
    cleanup();
  });

  it('marks only TRL 4 as selected', () => {
    const { getByTestId } = render(<TrlPreview selectedTrl={4} />);
    expect(getByTestId('trl-row-4').getAttribute('data-appearance')).toBe(
      'selected'
    );
    expect(getByTestId('trl-row-1').getAttribute('data-appearance')).toBe(
      'muted'
    );
    expect(getByTestId('trl-row-7').getAttribute('data-appearance')).toBe(
      'muted'
    );
  });

  it('mutes every row when none is assigned', () => {
    const { getByTestId } = render(<TrlPreview selectedTrl={null} />);
    for (const level of [1, 2, 3, 4, 5, 6, 7]) {
      expect(getByTestId(`trl-row-${level}`).getAttribute('data-appearance')).toBe(
        'muted'
      );
    }
  });
});
