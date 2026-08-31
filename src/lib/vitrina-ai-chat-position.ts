export const VITRINA_AI_CHAT_POS_KEY = 'vitrina-ai-chat-pos';
export const VITRINA_AI_CHAT_DRAG_THRESHOLD_PX = 6;
export const VITRINA_AI_CHAT_POS_MARGIN_PX = 8;

export type VitrinaAiChatPos = { left: number; top: number };

export function parseVitrinaAiChatPos(
  raw: string | null | undefined,
): VitrinaAiChatPos | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const left = (parsed as { left?: unknown }).left;
    const top = (parsed as { top?: unknown }).top;
    if (typeof left !== 'number' || typeof top !== 'number') return null;
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
    return { left, top };
  } catch {
    return null;
  }
}

export function serializeVitrinaAiChatPos(pos: VitrinaAiChatPos): string {
  return JSON.stringify({ left: pos.left, top: pos.top });
}

export function clampVitrinaAiChatPos(
  pos: VitrinaAiChatPos,
  widget: { width: number; height: number },
  parent: { width: number; height: number },
  margin = VITRINA_AI_CHAT_POS_MARGIN_PX,
): VitrinaAiChatPos {
  const maxLeft = Math.max(margin, parent.width - widget.width - margin);
  const maxTop = Math.max(margin, parent.height - widget.height - margin);
  return {
    left: Math.min(maxLeft, Math.max(margin, pos.left)),
    top: Math.min(maxTop, Math.max(margin, pos.top)),
  };
}

export function vitrinaAiChatDragExceeded(
  dx: number,
  dy: number,
  threshold = VITRINA_AI_CHAT_DRAG_THRESHOLD_PX,
): boolean {
  return dx * dx + dy * dy >= threshold * threshold;
}
