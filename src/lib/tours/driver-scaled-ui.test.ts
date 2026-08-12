import { afterEach, describe, expect, it } from 'vitest';
import { repositionDriverPopover } from '@/lib/tours/driver-scaled-ui';

describe('repositionDriverPopover', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fuerza top/left bajo el ancla (side bottom) sin usar bottom', () => {
    const anchor = document.createElement('div');
    anchor.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 200,
        top: 200,
        left: 100,
        bottom: 260,
        right: 500,
        width: 400,
        height: 60,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    document.body.appendChild(anchor);

    const popover = document.createElement('div');
    popover.className =
      'driver-popover driver-popover-side-bottom driver-popover-align-start';
    popover.style.position = 'fixed';
    popover.style.bottom = '40px';
    popover.style.top = 'auto';
    popover.getBoundingClientRect = () =>
      ({
        x: 100,
        y: 400,
        top: 400,
        left: 100,
        bottom: 520,
        right: 380,
        width: 280,
        height: 120,
        toJSON() {
          return {};
        },
      }) as DOMRect;
    document.body.appendChild(popover);

    repositionDriverPopover(anchor, 10);

    expect(popover.style.bottom).toBe('auto');
    expect(popover.style.right).toBe('auto');
    expect(popover.style.top).toBe('270px'); // 260 + 10
    expect(popover.style.left).toBe('100px');
  });
});
