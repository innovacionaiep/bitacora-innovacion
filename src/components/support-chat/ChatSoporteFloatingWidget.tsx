'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getSupportMessages, sendSupportMessage } from '@/lib/actions/support-chat';
import type { SupportMessageRow } from '@/lib/actions/support-chat';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { parseRealtimeSupportMessage } from '@/lib/support-chat-realtime';
import { MessageCircle, X, Send, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function normalizeMessage(payload: {
  id: string;
  user_id: string;
  contenido: string;
  is_from_admin: boolean;
  created_at: string;
}): SupportMessageRow {
  return {
    id: payload.id,
    userId: payload.user_id,
    contenido: payload.contenido,
    isFromAdmin: payload.is_from_admin,
    createdAt: new Date(payload.created_at),
  };
}

const HINT_INITIAL_DELAY_MS = 5_000;
const HINT_INTERVAL_MS = 10 * 60 * 1_000;
const HINT_VISIBLE_MS = 8_000;

export function ChatSoporteFloatingWidget() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  const hintHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userId = session?.user?.id ?? null;

  openRef.current = open;

  const revealHint = useCallback(() => {
    if (openRef.current) return;
    if (hintHideTimeoutRef.current) {
      clearTimeout(hintHideTimeoutRef.current);
    }
    setShowHint(true);
    hintHideTimeoutRef.current = setTimeout(() => {
      setShowHint(false);
      hintHideTimeoutRef.current = null;
    }, HINT_VISIBLE_MS);
  }, []);

  // Nudge: 5 s tras la primera carga/recarga, y luego cada 10 minutos
  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;

    const initialTimer = setTimeout(revealHint, HINT_INITIAL_DELAY_MS);
    const intervalId = setInterval(revealHint, HINT_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
      if (hintHideTimeoutRef.current) {
        clearTimeout(hintHideTimeoutRef.current);
        hintHideTimeoutRef.current = null;
      }
    };
  }, [status, userId, revealHint]);

  useEffect(() => {
    if (open) {
      setShowHint(false);
      if (hintHideTimeoutRef.current) {
        clearTimeout(hintHideTimeoutRef.current);
        hintHideTimeoutRef.current = null;
      }
    }
  }, [open]);

  const loadMessages = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const result = await getSupportMessages(userId);
    setLoading(false);
    if (result.success && result.data) {
      setMessages(result.data);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      loadMessages();
    }
  }, [open, userId, loadMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime: subscribe to new messages for this user's thread
  useEffect(() => {
    if (!open || !userId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`support-messages-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          const row = parseRealtimeSupportMessage(payload);
          if (!row || row.user_id !== userId) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [...prev, normalizeMessage(row)];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, userId]);

  const handleSend = useCallback(async () => {
    if (!userId || !inputValue.trim() || sending) return;
    const contenido = inputValue.trim();
    setInputValue('');
    setSending(true);
    const result = await sendSupportMessage({
      userId,
      contenido,
      isFromAdmin: false,
    });
    setSending(false);
    if (result.success && result.data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.data!.id)) return prev;
        return [...prev, result.data!];
      });
    }
  }, [userId, inputValue, sending]);

  if (status === 'loading' || !session?.user) return null;

  if (!open) {
    return (
      <div
        id="tour-chat-soporte"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2"
      >
        {showHint && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="soporte-chat-hint inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-emerald-600 px-4 py-2.5 text-left text-base font-medium text-white shadow-lg"
            aria-label="Abrir chat de soporte"
          >
            ¿Tienes dudas? Contáctanos aquí
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-emerald-600/30 bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
          title="Chat de soporte"
          aria-label="Abrir chat de soporte"
        >
          <MessageCircle className="h-7 w-7" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="tour-chat-soporte"
      className="fixed bottom-4 right-4 z-50 flex flex-col w-full max-w-md rounded-xl border border-sidebar-border bg-white shadow-xl overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <span className="font-semibold text-sm">Chat de soporte</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => setOpen(false)}
          aria-label="Cerrar chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="flex flex-col min-h-[340px] max-h-[440px]">
        <div className="flex-1 overflow-y-auto p-4 min-h-[260px] flex flex-col w-full gap-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Escribe un mensaje y te responderemos pronto.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${m.isFromAdmin ? 'self-start' : 'self-end'}`}
              >
                <div
                  className={`rounded-lg px-3 py-2 text-sm flex flex-wrap items-end gap-x-2 gap-y-0 ${
                    m.isFromAdmin
                      ? 'bg-gray-100 text-gray-900'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <span className="break-words max-w-full">{m.contenido}</span>
                  <span
                    className={`text-[10px] leading-none shrink-0 ${m.isFromAdmin ? 'text-gray-500' : 'text-emerald-200'}`}
                  >
                    {format(m.createdAt, 'HH:mm', { locale: es })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={listEndRef} />
        </div>
        <div className="p-3 border-t border-gray-200 bg-gray-50 flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Escribe tu mensaje..."
            className="flex-1 text-sm"
            disabled={sending}
          />
          <Button
            size="icon"
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSend}
            disabled={sending || !inputValue.trim()}
            aria-label="Enviar"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
