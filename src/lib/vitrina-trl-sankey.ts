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

export type VitrinaTrlSankeyLayout = {
  fromNodes: VitrinaTrlSankeyLayoutNode[];
  toNodes: VitrinaTrlSankeyLayoutNode[];
  links: VitrinaTrlSankeyLayoutLink[];
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

function stackNodes(
  levels: VitrinaTrlSankeyLevel[],
  x: number,
  width: number,
  height: number,
  pad: number,
): VitrinaTrlSankeyLayoutNode[] {
  // Mayor arriba, menor abajo (eje invertido respecto al orden natural).
  const ordered = [...levels].sort((a, b) => b.level - a.level);
  const total = ordered.reduce((sum, item) => sum + item.value, 0);
  const gaps = Math.max(0, ordered.length - 1) * pad;
  const usable = Math.max(1, height - gaps);
  let y = 0;
  return ordered.map((item) => {
    const nodeHeight = total === 0 ? 0 : (item.value / total) * usable;
    const node = {
      level: item.level,
      value: item.value,
      x,
      y,
      width,
      height: Math.max(nodeHeight, 10),
    };
    y += node.height + pad;
    return node;
  });
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
  const fromNodes = stackNodes(
    sankey.fromLevels,
    leftX,
    nodeWidth,
    size.height,
    pad,
  );
  const toNodes = stackNodes(
    sankey.toLevels,
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

  return { fromNodes, toNodes, links };
}
