'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { chatVitrinaAgent } from '@/lib/actions/vitrina-ai';
import {
  VITRINA_AI_MAX_HISTORY,
  VITRINA_AI_MAX_MESSAGE_CHARS,
} from '@/lib/vitrina-ai-settings';
import type { VitrinaProjectFilters } from '@/lib/vitrina-project-filters';
import { containWheelScroll } from '@/lib/ui/contain-wheel-scroll';
import { cn } from '@/lib/utils';

type ChatTurn = { role: 'user' | 'assistant'; content: string };

export function VitrinaAiChat({
  configured,
  onResult,
}: {
  configured: boolean;
  onResult: (filters: VitrinaProjectFilters, matchIds: string[] | null) => void;
}) {
  const [draft, setDraft] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
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
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [turns, pending]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!configured || pending) return;
    const message = draft.trim();
    if (!message) return;

    setDraft('');
    setError('');
    setPending(true);
    const history = turns.slice(-VITRINA_AI_MAX_HISTORY);
    setTurns((current) => [...current, { role: 'user', content: message }]);

    const result = await chatVitrinaAgent({ message, history });
    setPending(false);

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

  return (
    <form
      className="flex h-full min-h-0 flex-col border-t border-slate-200 bg-slate-100"
      onSubmit={(event) => void handleSubmit(event)}
      aria-label="Chat con I.A."
    >
      <div
        ref={setThreadNode}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4"
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
            {turn.content}
          </p>
        ))}
        {pending ? (
          <p className="mr-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-400">
            Buscando…
          </p>
        ) : null}
      </div>

      <div className="shrink-0 px-5 pb-4 pt-3">
        <p className="flex items-start gap-2 text-sm leading-snug text-slate-700">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0 text-violet-500"
            aria-hidden
          />
          ¿Qué andas buscando?
        </p>
        <div className="mt-3 flex items-center rounded-full border border-slate-200 bg-white px-3 py-2">
          <input
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
