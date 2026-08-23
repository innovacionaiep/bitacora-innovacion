export type VitrinaAiInlineSegment = {
  type: 'text' | 'bold';
  value: string;
};

const BOLD_CHUNK = /\*\*([^*]+)\*\*/g;

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
    .filter(Boolean);
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = tableCells(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
  );
}

function isMarkdownTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith('|') && trimmed.includes('|', 1);
}

export function flattenVitrinaAiMarkdownTables(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!isMarkdownTableRow(lines[index] ?? '')) {
      out.push(lines[index] ?? '');
      index += 1;
      continue;
    }
    const block: string[] = [];
    while (index < lines.length && isMarkdownTableRow(lines[index] ?? '')) {
      block.push(lines[index] ?? '');
      index += 1;
    }
    const dataRows = block.filter((line) => !isMarkdownTableSeparator(line));
    if (dataRows.length === 0) continue;
    const header = tableCells(dataRows[0] ?? '');
    const body = dataRows.slice(1);
    const rows = body.length > 0 ? body : dataRows;
    for (const row of rows) {
      const cells = tableCells(row);
      if (cells.length === 0) continue;
      if (body.length > 0 && header.length > 0) {
        const title = cells[0];
        const rest = cells.slice(1).filter(Boolean);
        out.push(
          rest.length > 0 ? `- **${title}**: ${rest.join(' — ')}` : `- **${title}**`,
        );
      } else {
        out.push(`- ${cells.join(' — ')}`);
      }
    }
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function parseVitrinaAiInlineMarkdown(
  content: string,
): VitrinaAiInlineSegment[] {
  const segments: VitrinaAiInlineSegment[] = [];
  let cursor = 0;

  for (const match of content.matchAll(BOLD_CHUNK)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      segments.push({ type: 'text', value: content.slice(cursor, start) });
    }
    segments.push({ type: 'bold', value: match[1] ?? '' });
    cursor = start + match[0].length;
  }

  if (cursor < content.length) {
    segments.push({ type: 'text', value: content.slice(cursor) });
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: content }];
}
