'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getSupportMessages,
  getSupportConversationsForAdmin,
  sendSupportMessage,
} from '@/lib/actions/support-chat';
import type {
  SupportMessageRow,
  SupportConversationItem,
} from '@/lib/actions/support-chat';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { parseRealtimeSupportMessage } from '@/lib/support-chat-realtime';
import { Loader2, Send } from 'lucide-react';
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

export function AdminChatPanel() {
  const [conversations, setConversations] = useState<SupportConversationItem[]>(
    []
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const listEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    const result = await getSupportConversationsForAdmin();
    setLoadingConvs(false);
    if (result.success && result.data) {
      setConversations(result.data);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (uid: string) => {
    setLoadingMessages(true);
    const result = await getSupportMessages(uid);
    setLoadingMessages(false);
    if (result.success && result.data) {
      setMessages(result.data);
    }
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
    } else {
      setMessages([]);
    }
  }, [selectedUserId, loadMessages]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime: subscribe to all support_messages INSERTs; filter by selectedUserId for message list, and refresh conversations on any new message
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel('support-messages-admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          const row = parseRealtimeSupportMessage(payload);
          if (row && row.user_id === selectedUserId) {
            const msg = normalizeMessage(row);
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
          if (row) loadConversations();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedUserId, loadConversations]);

  const handleSend = useCallback(async () => {
    if (!selectedUserId || !inputValue.trim() || sending) return;
    const contenido = inputValue.trim();
    setInputValue('');
    setSending(true);
    const result = await sendSupportMessage({
      userId: selectedUserId,
      contenido,
      isFromAdmin: true,
    });
    setSending(false);
    if (result.success && result.data) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === result.data!.id)) return prev;
        return [...prev, result.data!];
      });
      loadConversations();
    }
  }, [selectedUserId, inputValue, sending, loadConversations]);

  const selectedConv = conversations.find((c) => c.userId === selectedUserId);

  return (
    <div className="flex h-full min-h-0 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
      <aside className="w-72 border-r border-gray-200 flex flex-col bg-gray-50/50">
        <div className="p-2 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800 text-sm">
            Conversaciones
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-gray-500 p-4 text-center">
              Aún no hay conversaciones.
            </p>
          ) : (
            <ul className="p-1">
              {conversations.map((c) => (
                <li key={c.userId}>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(c.userId)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedUserId === c.userId
                        ? 'bg-blue-100 text-blue-900'
                        : 'hover:bg-gray-100 text-gray-800'
                    }`}
                  >
                    <div className="font-medium truncate">
                      {c.userName || c.userEmail || c.userId}
                    </div>
                    {c.userName && c.userEmail && (
                      <div className="text-xs text-gray-500 truncate">
                        {c.userEmail}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5 truncate">
                      {c.lastMessagePreview}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        {selectedUserId ? (
          <>
            <header className="px-4 py-2 border-b border-gray-200 bg-gray-50">
              <p className="font-medium text-gray-800 text-sm">
                {selectedConv?.userName || selectedConv?.userEmail || selectedUserId}
              </p>
              {selectedConv?.userEmail && selectedConv?.userName && (
                <p className="text-xs text-gray-500">{selectedConv.userEmail}</p>
              )}
            </header>
            <div className="flex-1 overflow-y-auto p-4 min-h-0 flex flex-col w-full gap-2">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[85%] ${
                      m.isFromAdmin ? 'self-end' : 'self-start'
                    }`}
                  >
                    <div
                      className={`rounded-lg px-3 py-2 text-sm flex flex-wrap items-end gap-x-2 gap-y-0 ${
                        m.isFromAdmin
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <span className="break-words max-w-full">{m.contenido}</span>
                      <span
                        className={`text-[10px] leading-none shrink-0 ${
                          m.isFromAdmin ? 'text-blue-200' : 'text-gray-500'
                        }`}
                      >
                        {format(m.createdAt, 'HH:mm', { locale: es })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={listEndRef} />
            </div>
            <div className="p-2 border-t border-gray-200 flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Escribe tu respuesta..."
                className="flex-1"
                disabled={sending}
              />
              <Button
                size="icon"
                className="shrink-0"
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
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
            Selecciona una conversación
          </div>
        )}
      </div>
    </div>
  );
}
