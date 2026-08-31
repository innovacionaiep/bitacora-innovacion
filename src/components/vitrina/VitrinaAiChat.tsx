'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ChevronDown, Send, Sparkles } from 'lucide-react';
import { chatVitrinaAgent } from '@/lib/actions/vitrina-ai';
import {
  VITRINA_AI_MAX_HISTORY,
  VITRINA_AI_MAX_MESSAGE_CHARS,
} from '@/lib/vitrina-ai-settings';
import type { VitrinaProjectFilters } from '@/lib/vitrina-project-filters';
import { containWheelScroll } from '@/lib/ui/contain-wheel-scroll';
import {
  flattenVitrinaAiMarkdownTables,
  parseVitrinaAiInlineMarkdown,
} from '@/lib/vitrina-ai-chat-format';
import {
  clampVitrinaAiChatPos,
  parseVitrinaAiChatPos,
  serializeVitrinaAiChatPos,
  vitrinaAiChatDragExceeded,
  VITRINA_AI_CHAT_POS_KEY,
  type VitrinaAiChatPos,
} from '@/lib/vitrina-ai-chat-position';
import { cn } from '@/lib/utils';
import '@/components/vitrina/vitrina-ai-chat.css';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

type DragSession = {
  pointerId: number;
  startX: number;
  startY: number;
  origin: VitrinaAiChatPos;
  moved: boolean;
};

function VitrinaAiMessageBody({
  role,
  content,
}: {
  role: ChatTurn['role'];
  content: string;
}) {
  if (role === 'user') return content;
  return (
    <span className="whitespace-pre-wrap">
      {parseVitrinaAiInlineMarkdown(
        flattenVitrinaAiMarkdownTables(content),
      ).map((segment, index) =>
        segment.type === 'bold' ? (
          <strong key={index} className="font-semibold text-slate-800">
            {segment.value}
          </strong>
        ) : (
          <span key={index}>{segment.value}</span>
        ),
      )}
    </span>
  );
}

const FLOAT_POS_DEFAULT = 'absolute bottom-5 right-12 z-20';
const FLOAT_POS_CUSTOM = 'absolute z-20';
const PANEL_SHADOW =
  'shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)]';

function measureRelativePos(el: HTMLElement): VitrinaAiChatPos {
  const parent = el.offsetParent as HTMLElement | null;
  const parentRect = parent?.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (!parentRect) {
    return { left: el.offsetLeft, top: el.offsetTop };
  }
  return {
    left: rect.left - parentRect.left,
    top: rect.top - parentRect.top,
  };
}

function clampToParent(
  pos: VitrinaAiChatPos,
  el: HTMLElement,
): VitrinaAiChatPos {
  const parent = el.offsetParent as HTMLElement | null;
  if (!parent) return pos;
  return clampVitrinaAiChatPos(
    pos,
    { width: el.offsetWidth, height: el.offsetHeight },
    { width: parent.clientWidth, height: parent.clientHeight },
  );
}

export function VitrinaAiChat({
  configured,
  filters,
  matchIds,
  onResult,
}: {
  configured: boolean;
  filters: VitrinaProjectFilters;
  matchIds: string[] | null;
  onResult: (filters: VitrinaProjectFilters, matchIds: string[] | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [pos, setPos] = useState<VitrinaAiChatPos | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const threadCleanup = useRef<(() => void) | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragSession | null>(null);
  const skipClickRef = useRef(false);
  const hydratedRef = useRef(false);

  const setThreadNode = useCallback((node: HTMLDivElement | null) => {
    threadCleanup.current?.();
    threadCleanup.current = null;
    threadRef.current = node;
    if (node) threadCleanup.current = containWheelScroll(node);
  }, []);

  useEffect(() => {
    return () => {
      threadCleanup.current?.();
      threadCleanup.current = null;
    };
  }, []);

  useEffect(() => {
    const node = threadRef.current;
    if (!node || !open) return;
    node.scrollTop = node.scrollHeight;
  }, [turns, pending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const persistPos = useCallback((next: VitrinaAiChatPos) => {
    try {
      localStorage.setItem(VITRINA_AI_CHAT_POS_KEY, serializeVitrinaAiChatPos(next));
    } catch {
      /* private mode / quota */
    }
  }, []);

  const reclamp = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    setPos((current) => {
      if (!current) return current;
      const next = clampToParent(current, el);
      if (next.left === current.left && next.top === current.top) return current;
      persistPos(next);
      return next;
    });
  }, [persistPos]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      let stored: VitrinaAiChatPos | null = null;
      try {
        stored = parseVitrinaAiChatPos(
          localStorage.getItem(VITRINA_AI_CHAT_POS_KEY),
        );
      } catch {
        stored = null;
      }
      if (stored) {
        setPos(clampToParent(stored, el));
        return;
      }
    }
    reclamp();
  }, [open, reclamp]);

  useEffect(() => {
    const el = rootRef.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!parent) return;
    const observer = new ResizeObserver(() => reclamp());
    observer.observe(parent);
    observer.observe(el);
    return () => observer.disconnect();
  }, [reclamp]);

  const endDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
      skipClickRef.current = drag.moved;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* already released */
      }
      const el = rootRef.current;
      if (!el) return;
      setPos((current) => {
        if (!current) return current;
        const next = clampToParent(current, el);
        persistPos(next);
        return next;
      });
    },
    [persistPos],
  );

  const onDragPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      const el = rootRef.current;
      if (!el) return;
      const origin = pos ?? measureRelativePos(el);
      if (!pos) setPos(origin);
      skipClickRef.current = false;
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origin,
        moved: false,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [pos],
  );

  const onDragPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      const el = rootRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !el) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      if (!drag.moved && !vitrinaAiChatDragExceeded(dx, dy)) return;
      drag.moved = true;
      setDragging(true);
      event.preventDefault();
      setPos(clampToParent({
        left: drag.origin.left + dx,
        top: drag.origin.top + dy,
      }, el));
    },
    [],
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!configured || pending) return;
    const message = draft.trim();
    if (!message) return;

    setDraft('');
    setError('');
    setPending(true);
    setOpen(true);
    const history = turns.slice(-VITRINA_AI_MAX_HISTORY);
    setTurns((current) => [...current, { role: 'user', content: message }]);

    const result = await chatVitrinaAgent({
      message,
      history,
      filters,
      matchIds,
    });
    setPending(false);
    setOpen(true);

    if (!result.success) {
      setError(result.error ?? 'No pude consultar el asistente');
      return;
    }

    const reply = result.reply?.trim() || 'Revisé los proyectos de la vitrina.';
    setTurns((current) => [...current, { role: 'assistant', content: reply }]);
    if (result.filters) {
      onResult(result.filters, result.matchIds ?? null);
    }
  }

  const dragHandlers = {
    onPointerDown: onDragPointerDown,
    onPointerMove: onDragPointerMove,
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        pos ? FLOAT_POS_CUSTOM : FLOAT_POS_DEFAULT,
        'vitrina-ai-halo w-fit',
        open ? 'rounded-2xl' : 'rounded-full',
        dragging && 'cursor-grabbing',
      )}
      style={pos ? { left: pos.left, top: pos.top } : undefined}
    >
      <span className="vitrina-ai-halo__glow" aria-hidden />
      <span className="vitrina-ai-halo__ring" aria-hidden />
      {open ? (
        <form
          id="vitrina-ai-chat-panel"
          className={cn(
            PANEL_SHADOW,
            'relative z-[1] flex h-[36rem] w-[20.5rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100',
          )}
          onSubmit={(event) => void handleSubmit(event)}
          aria-label="Chat con IA"
        >
          <div
            className={cn(
              'flex shrink-0 touch-none items-center justify-between gap-2 px-4 pt-3',
              dragging ? 'cursor-grabbing' : 'cursor-grab',
            )}
            {...dragHandlers}
          >
            <p className="flex min-w-0 select-none items-center gap-2 text-sm leading-snug text-slate-700">
              <span className="inline-flex items-center gap-1">
                <span className="font-medium text-violet-500">IA</span>
                <Sparkles
                  className="h-4 w-4 shrink-0 text-violet-500"
                  aria-hidden
                />
              </span>
              ¿Qué estás buscando?
            </p>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setOpen(false)}
              className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-slate-800"
              aria-label="Colapsar chat"
            >
              <ChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <div
            ref={setThreadNode}
            className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-3"
          >
            {turns.map((turn, index) => (
              <p
                key={`${turn.role}-${index}`}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs leading-snug',
                  turn.role === 'user'
                    ? 'ml-4 bg-violet-500/10 text-slate-800'
                    : 'mr-2 bg-white text-slate-700',
                )}
              >
                <VitrinaAiMessageBody role={turn.role} content={turn.content} />
              </p>
            ))}
            {pending ? (
              <p className="mr-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-400">
                Buscando…
              </p>
            ) : null}
          </div>

          <div className="shrink-0 px-4 pb-4">
            <div className="flex items-center rounded-full border border-slate-200 bg-white px-3 py-2">
              <input
                ref={inputRef}
                type="text"
                value={draft}
                maxLength={VITRINA_AI_MAX_MESSAGE_CHARS}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!configured || pending}
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
                placeholder={
                  configured
                    ? 'Busco un proyecto que...'
                    : 'El asistente aún no está configurado'
                }
                aria-label="Busco un proyecto que..."
              />
              <button
                type="submit"
                disabled={!configured || pending || !draft.trim()}
                className="ml-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-violet-500 hover:bg-violet-50 disabled:text-slate-300"
                aria-label="Enviar"
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (skipClickRef.current) {
              skipClickRef.current = false;
              return;
            }
            setOpen(true);
          }}
          className={cn(
            PANEL_SHADOW,
            'relative z-[1] inline-flex touch-none select-none items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-200/70',
            dragging ? 'cursor-grabbing' : 'cursor-grab',
          )}
          aria-expanded={false}
          aria-controls="vitrina-ai-chat-panel"
          aria-label="¿Qué estás buscando? Arrastra para mover"
          {...dragHandlers}
        >
          <span className="inline-flex items-center gap-1">
            <span className="text-sm font-medium text-violet-500">IA</span>
            <Sparkles className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
          </span>
          {pending ? 'Buscando…' : '¿Qué estás buscando?'}
        </button>
      )}
    </div>
  );
}
