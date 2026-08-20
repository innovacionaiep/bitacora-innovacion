import { afterEach, describe, expect, it } from 'vitest';
import { containWheelScroll } from '@/lib/ui/contain-wheel-scroll';

describe('containWheelScroll', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('no deja que el wheel burbujee al contenedor padre', () => {
    const parent = document.createElement('div');
    const child = document.createElement('div');
    parent.appendChild(child);
    document.body.appendChild(parent);

    Object.defineProperty(child, 'scrollHeight', { value: 400, configurable: true });
    Object.defineProperty(child, 'clientHeight', { value: 100, configurable: true });
    child.scrollTop = 0;

    let parentSawWheel = false;
    parent.addEventListener('wheel', () => {
      parentSawWheel = true;
    });

    const detach = containWheelScroll(child);
    child.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 40, bubbles: true, cancelable: true }),
    );

    expect(parentSawWheel).toBe(false);
    expect(child.scrollTop).toBe(40);
    detach();
  });

  it('no hace nada si el nodo no desborda', () => {
    const child = document.createElement('div');
    document.body.appendChild(child);
    Object.defineProperty(child, 'scrollHeight', { value: 100, configurable: true });
    Object.defineProperty(child, 'clientHeight', { value: 100, configurable: true });
    child.scrollTop = 0;

    const detach = containWheelScroll(child);
    const event = new WheelEvent('wheel', {
      deltaY: 40,
      bubbles: true,
      cancelable: true,
    });
    child.dispatchEvent(event);

    expect(child.scrollTop).toBe(0);
    detach();
  });
});
