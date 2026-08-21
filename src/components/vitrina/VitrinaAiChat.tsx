'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { ChevronDown, Send, Sparkles } from 'lucide-react';
import { chatVitrinaAgent } from '@/lib/actions/vitrina-ai';
import {
  VITRINA_AI_MAX_HISTORY,
  VITRINA_AI_MAX_MESSAGE_CHARS,
} from '@/lib/vitrina-ai-settings';
import type { VitrinaProjectFilters } from '@/lib/vitrina-project-filters';
import { containWheelScroll } from '@/lib/ui/contain-wheel-scroll';
import { parseVitrinaAiInlineMarkdown } from '@/lib/vitrina-ai-chat-format';
import { cn } from '@/lib/utils';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

function VitrinaAiMessageBody({
  role,
  content,
}: {
  role: ChatTurn['role'];
  content: string;
}) {
  if (role === 'user') return content;
  return parseVitrinaAiInlineMarkdown(content).map((segment, index) =>
    segment.type === 'bold' ? (
      <strong key={index} className="font-semibold text-slate-800">
        {segment.value}
      </strong>
    ) : (
      <span key={index}>{segment.value}</span>
    ),
  );
}

const FLOAT_POS = 'absolute bottom-5 right-12 z-20';
const PANEL_SHADOW =
  'shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)]';

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const threadCleanup = useRef<(() => void) | null>(null);

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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          FLOAT_POS,
          PANEL_SHADOW,
          'inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-200/70',
        )}
        aria-expanded={false}
        aria-controls="vitrina-ai-chat-panel"
      >
        <span className="inline-flex items-center gap-1">
          <span className="text-sm font-medium text-violet-500">IA</span>
          <Sparkles className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
        </span>
        {pending ? 'Buscando…' : '¿Qué andas buscando?'}
      </button>
    );
  }

  return (
    <form
      id="vitrina-ai-chat-panel"
      className={cn(
        FLOAT_POS,
        PANEL_SHADOW,
        'flex h-[36rem] w-[20.5rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100',
      )}
      onSubmit={(event) => void handleSubmit(event)}
      aria-label="Chat con IA"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3">
        <p className="flex min-w-0 items-center gap-2 text-sm leading-snug text-slate-700">
          <span className="inline-flex items-center gap-1">
            <span className="font-medium text-violet-500">IA</span>
            <Sparkles className="h-4 w-4 shrink-0 text-violet-500" aria-hidden />
          </span>
          ¿Qué andas buscando?
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white hover:text-slate-800"
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
  );
}
