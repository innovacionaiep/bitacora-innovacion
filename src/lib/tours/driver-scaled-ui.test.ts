import { afterEach, describe, expect, it } from 'vitest';
import { repositionDriverPopover } from '@/lib/tours/driver-scaled-ui';

function mockRect(
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect {
  return {
    x: left,
    y: top,
    top,
    left,
    bottom: top + height,
    right: left + width,
    width,
    height,
    toJSON() {
      return {};
    },
  } as DOMRect;
}

function makePopover(side: string, align: string) {
  const popover = document.createElement('div');
  popover.className = `driver-popover driver-popover-side-${side} driver-popover-align-${align}`;
  popover.style.position = 'fixed';
  Object.defineProperty(popover, 'offsetWidth', { value: 320 });
  Object.defineProperty(popover, 'offsetHeight', { value: 141 });
  popover.getBoundingClientRect = () => {
    const left = Number.parseFloat(popover.style.left || '100');
    const top = Number.parseFloat(popover.style.top || '350');
    return mockRect(left, top, 320, 141);
  };
  const arrow = document.createElement('div');
  arrow.className = 'driver-popover-arrow';
  arrow.style.left = '310px';
  arrow.getBoundingClientRect = () => mockRect(0, 0, 10, 10);
  popover.appendChild(arrow);
  document.body.appendChild(popover);
  return { popover, arrow };
}

describe('repositionDriverPopover', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('fuerza top/left bajo el ancla (side bottom) sin usar bottom', () => {
    const anchor = document.createElement('div');
    anchor.getBoundingClientRect = () => mockRect(100, 200, 400, 60);
    document.body.appendChild(anchor);
    const { popover } = makePopover('bottom', 'start');
    popover.style.bottom = '40px';
    popover.style.top = 'auto';

    repositionDriverPopover(anchor, 10);

    expect(popover.style.bottom).toBe('auto');
    expect(Number.parseFloat(popover.style.top)).toBe(270);
    expect(Number.parseFloat(popover.style.left)).toBe(100);
  });

  it('ancla ancha + align start: caret al inicio del solape', () => {
    const anchor = document.createElement('div');
    anchor.getBoundingClientRect = () => mockRect(100, 200, 1100, 140);
    document.body.appendChild(anchor);
    const { arrow } = makePopover('bottom', 'start');

    repositionDriverPopover(anchor, 10);
    expect(Number.parseFloat(arrow.style.left)).toBe(15);
  });

  it('ancla ancha + align center: caret al centro del popover/solape', () => {
    const anchor = document.createElement('div');
    anchor.getBoundingClientRect = () => mockRect(100, 200, 1100, 140);
    document.body.appendChild(anchor);
    const { arrow } = makePopover('bottom', 'center');

    repositionDriverPopover(anchor, 10);
    const left = Number.parseFloat(arrow.style.left);
    expect(left).toBeGreaterThan(140);
    expect(left).toBeLessThan(170);
  });
});
