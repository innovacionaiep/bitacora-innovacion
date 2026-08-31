import type { VitrinaProyecto } from '@/lib/vitrina-proyectos';

export type VitrinaTrlTarget = 'proyeccion' | 'final';

export type VitrinaTrlSankeyLink = {
  from: number;
  to: number;
  value: number;
  nombres: string[];
};

export type VitrinaTrlSankeyLevel = {
  level: number;
  value: number;
};

export type VitrinaTrlSankey = {
  included: number;
  omitted: number;
  fromLevels: VitrinaTrlSankeyLevel[];
  toLevels: VitrinaTrlSankeyLevel[];
  links: VitrinaTrlSankeyLink[];
};

export type VitrinaTrlSankeyLayoutNode = {
  level: number;
  value: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VitrinaTrlSankeyLayoutLink = {
  from: number;
  to: number;
  value: number;
  nombres: string[];
  thickness: number;
  d: string;
};

export type VitrinaTrlSankeyGuide = {
  level: number;
  y: number;
  x1: number;
  x2: number;
};

export type VitrinaTrlSankeyLayout = {
  fromNodes: VitrinaTrlSankeyLayoutNode[];
  toNodes: VitrinaTrlSankeyLayoutNode[];
  links: VitrinaTrlSankeyLayoutLink[];
  guides: VitrinaTrlSankeyGuide[];
};

function targetValue(
  proyecto: VitrinaProyecto,
  target: VitrinaTrlTarget,
): number | null {
  return target === 'proyeccion' ? proyecto.trlProyeccion : proyecto.trlFinal;
}

function sortLevels(counts: Map<number, number>): VitrinaTrlSankeyLevel[] {
  return [...counts.entries()]
    .map(([level, value]) => ({ level, value }))
    .sort((a, b) => a.level - b.level);
}

export function buildVitrinaTrlSankey(
  proyectos: VitrinaProyecto[],
  target: VitrinaTrlTarget,
): VitrinaTrlSankey {
  const linkCounts = new Map<string, VitrinaTrlSankeyLink>();
  const fromCounts = new Map<number, number>();
  const toCounts = new Map<number, number>();
  let included = 0;
  let omitted = 0;

  for (const proyecto of proyectos) {
    const from = proyecto.trlInicial;
    const to = targetValue(proyecto, target);
    if (from === null || to === null) {
      omitted += 1;
      continue;
    }
    included += 1;
    fromCounts.set(from, (fromCounts.get(from) ?? 0) + 1);
    toCounts.set(to, (toCounts.get(to) ?? 0) + 1);
    const key = `${from}:${to}`;
    const current = linkCounts.get(key);
    if (current) {
      current.value += 1;
      current.nombres.push(proyecto.nombre);
    } else {
      linkCounts.set(key, {
        from,
        to,
        value: 1,
        nombres: [proyecto.nombre],
      });
    }
  }

  const links = [...linkCounts.values()]
    .map((link) => ({
      ...link,
      nombres: [...link.nombres].sort((a, b) => a.localeCompare(b, 'es')),
    }))
    .sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      return a.to - b.to;
    });

  return {
    included,
    omitted,
    fromLevels: sortLevels(fromCounts),
    toLevels: sortLevels(toCounts),
    links,
  };
}

const MIN_NODE_HEIGHT = 10;

function sharedLevelSlots(
  fromLevels: VitrinaTrlSankeyLevel[],
  toLevels: VitrinaTrlSankeyLevel[],
  leftX: number,
  rightX: number,
  width: number,
  height: number,
  pad: number,
): {
  fromNodes: VitrinaTrlSankeyLayoutNode[];
  toNodes: VitrinaTrlSankeyLayoutNode[];
} {
  const fromByLevel = new Map(fromLevels.map((item) => [item.level, item.value]));
  const toByLevel = new Map(toLevels.map((item) => [item.level, item.value]));
  // Escala única: el mismo nivel queda a la misma altura; destinos más altos
  // (p. ej. TRL 6/7) ocupan espacio encima aunque no existan a la izquierda.
  const orderedLevels = [
    ...new Set([...fromByLevel.keys(), ...toByLevel.keys()]),
  ].sort((a, b) => b - a);

  const slotWeights = orderedLevels.map((level) =>
    Math.max(fromByLevel.get(level) ?? 0, toByLevel.get(level) ?? 0),
  );
  const total = slotWeights.reduce((sum, weight) => sum + weight, 0);
  const gaps = Math.max(0, orderedLevels.length - 1) * pad;
  const usable = Math.max(1, height - gaps);

  const fromNodes: VitrinaTrlSankeyLayoutNode[] = [];
  const toNodes: VitrinaTrlSankeyLayoutNode[] = [];
  let y = 0;

  orderedLevels.forEach((level, index) => {
    const slotWeight = slotWeights[index] ?? 0;
    const slotHeight = total === 0 ? 0 : (slotWeight / total) * usable;
    const fromValue = fromByLevel.get(level) ?? 0;
    const toValue = toByLevel.get(level) ?? 0;

    const rawFromHeight =
      fromValue > 0 && slotWeight > 0
        ? (fromValue / slotWeight) * slotHeight
        : 0;
    const rawToHeight =
      toValue > 0 && slotWeight > 0
        ? (toValue / slotWeight) * slotHeight
        : 0;
    const fromHeight =
      fromValue > 0 ? Math.max(rawFromHeight, MIN_NODE_HEIGHT) : 0;
    const toHeight = toValue > 0 ? Math.max(rawToHeight, MIN_NODE_HEIGHT) : 0;
    const bandHeight = Math.max(slotHeight, fromHeight, toHeight);
    const midY = y + bandHeight / 2;

    if (fromValue > 0) {
      fromNodes.push({
        level,
        value: fromValue,
        x: leftX,
        y: midY - fromHeight / 2,
        width,
        height: fromHeight,
      });
    }
    if (toValue > 0) {
      toNodes.push({
        level,
        value: toValue,
        x: rightX,
        y: midY - toHeight / 2,
        width,
        height: toHeight,
      });
    }

    y += bandHeight + pad;
  });

  return { fromNodes, toNodes };
}

function linkPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness: number,
): string {
  const half = thickness / 2;
  const midX = (x0 + x1) / 2;
  const top = `C ${midX} ${y0 - half}, ${midX} ${y1 - half}, ${x1} ${y1 - half}`;
  const bottom = `C ${midX} ${y1 + half}, ${midX} ${y0 + half}, ${x0} ${y0 + half}`;
  return `M ${x0} ${y0 - half} ${top} L ${x1} ${y1 + half} ${bottom} Z`;
}

export function layoutVitrinaTrlSankey(
  sankey: VitrinaTrlSankey,
  size: { width: number; height: number },
  options?: { marginX?: number },
): VitrinaTrlSankeyLayout {
  const nodeWidth = 18;
  const pad = 14;
  const marginX = options?.marginX ?? 88;
  const leftX = marginX;
  const rightX = size.width - marginX - nodeWidth;
  const { fromNodes, toNodes } = sharedLevelSlots(
    sankey.fromLevels,
    sankey.toLevels,
    leftX,
    rightX,
    nodeWidth,
    size.height,
    pad,
  );

  const fromByLevel = new Map(fromNodes.map((node) => [node.level, node]));
  const toByLevel = new Map(toNodes.map((node) => [node.level, node]));
  const fromCursor = new Map(fromNodes.map((node) => [node.level, node.y]));
  const toCursor = new Map(toNodes.map((node) => [node.level, node.y]));

  // Dentro de cada nodo, primero los destinos/orígenes más altos para alinear con el eje invertido.
  const orderedLinks = [...sankey.links].sort((a, b) => {
    if (a.from !== b.from) return b.from - a.from;
    return b.to - a.to;
  });

  const links = orderedLinks.map((link) => {
    const fromNode = fromByLevel.get(link.from);
    const toNode = toByLevel.get(link.to);
    if (!fromNode || !toNode) {
      return { ...link, nombres: link.nombres ?? [], thickness: 0, d: 'M 0 0' };
    }
    const fromScale = fromNode.height / Math.max(fromNode.value, 1);
    const toScale = toNode.height / Math.max(toNode.value, 1);
    const fromH = link.value * fromScale;
    const toH = link.value * toScale;
    const thickness = Math.max(2, Math.min(fromH, toH));
    const fromY = fromCursor.get(link.from) ?? fromNode.y;
    const toY = toCursor.get(link.to) ?? toNode.y;
    fromCursor.set(link.from, fromY + fromH);
    toCursor.set(link.to, toY + toH);
    const d = linkPath(
      fromNode.x + fromNode.width,
      fromY + fromH / 2,
      toNode.x,
      toY + toH / 2,
      thickness,
    );
    return { ...link, thickness, d };
  });

  const levels = [
    ...new Set([...fromByLevel.keys(), ...toByLevel.keys()]),
  ].sort((a, b) => b - a);
  const guides = levels.map((level) => {
    const fromNode = fromByLevel.get(level);
    const toNode = toByLevel.get(level);
    const y =
      fromNode != null
        ? fromNode.y + fromNode.height / 2
        : (toNode?.y ?? 0) + (toNode?.height ?? 0) / 2;
    const x1 = (fromNode?.x ?? leftX) + nodeWidth / 2;
    const x2 = (toNode?.x ?? rightX) + nodeWidth / 2;
    return { level, y, x1, x2 };
  });

  return { fromNodes, toNodes, links, guides };
}
