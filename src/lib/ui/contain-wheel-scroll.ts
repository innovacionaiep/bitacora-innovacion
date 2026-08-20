/**
 * Confina el wheel a un nodo con overflow. Evita que un Dialog (react-remove-scroll)
 * o un padre overflow-auto (tabla ancha) se queden con la rueda del mouse.
 */
export function containWheelScroll(node: HTMLElement | null): () => void {
  if (!node) return () => {};

  const onWheel = (event: WheelEvent) => {
    event.stopPropagation();

    const canY = node.scrollHeight - node.clientHeight > 1;
    const canX = node.scrollWidth - node.clientWidth > 1;
    if (!canY && !canX) return;

    const dy = event.deltaY;
    const dx = event.deltaX;
    let moved = false;

    if (canY && dy !== 0) {
      const maxTop = node.scrollHeight - node.clientHeight;
      const next = Math.min(maxTop, Math.max(0, node.scrollTop + dy));
      if (next !== node.scrollTop) {
        node.scrollTop = next;
        moved = true;
      }
    }

    if (canX && dx !== 0) {
      const maxLeft = node.scrollWidth - node.clientWidth;
      const next = Math.min(maxLeft, Math.max(0, node.scrollLeft + dx));
      if (next !== node.scrollLeft) {
        node.scrollLeft = next;
        moved = true;
      }
    }

    if (moved) event.preventDefault();
  };

  node.addEventListener('wheel', onWheel, { passive: false, capture: true });
  return () => node.removeEventListener('wheel', onWheel, true);
}
