export type VitrinaAiInlineSegment = {
  type: 'text' | 'bold';
  value: string;
};

const BOLD_CHUNK = /\*\*([^*]+)\*\*/g;

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
