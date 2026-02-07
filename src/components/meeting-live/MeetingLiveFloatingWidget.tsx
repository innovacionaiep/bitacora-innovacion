'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { finalizarReunionEnVivo } from '@/lib/actions/seguimiento';
import { useMeetingLive } from '@/contexts/MeetingLiveContext';
import { useMeetingTranscription } from '@/hooks/useMeetingTranscription';
import { useVoskTranscription } from '@/hooks/useVoskTranscription';
import { Maximize2, Minimize2, Square, Loader2, Monitor } from 'lucide-react';

/** Starts transcription when meeting is active. Mic via Web Speech API, system audio via Vosk. */
export function MeetingLiveTranscriptionRunner() {
  useMeetingTranscription();
  useVoskTranscription();
  return null;
}

const MAX_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function MeetingLiveFloatingWidget() {
  const { meeting, endMeeting, setExpanded, startTabCapture } = useMeetingLive();
  const router = useRouter();
  const [elapsedMs, setElapsedMs] = useState(0);
  const [ending, setEnding] = useState(false);
  const [capturingTab, setCapturingTab] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const handleIncluirTab = useCallback(async () => {
    setCapturingTab(true);
    const ok = await startTabCapture();
    setCapturingTab(false);
  }, [startTabCapture]);

  useEffect(() => {
    if (!meeting) return;
    const start = meeting.startedAt.getTime();
    const tick = () => {
      const now = Date.now();
      const elapsed = Math.min(now - start, MAX_DURATION_MS);
      setElapsedMs(elapsed);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [meeting]);

  useEffect(() => {
    if (meeting?.isExpanded && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [meeting?.isExpanded, meeting?.transcripcion]);

  const handleFinalizar = useCallback(async () => {
    if (!meeting) return;
    setEnding(true);
    const duracionMinutos = Math.round(elapsedMs / 60_000);
    const result = await finalizarReunionEnVivo(meeting.reunionId, {
      transcripcion: meeting.transcripcion || undefined,
      duracionMinutos,
    });
    setEnding(false);
    if (result.success) {
      router.refresh();
      endMeeting();
    }
  }, [meeting, elapsedMs, endMeeting, router]);

  if (!meeting) return null;

  const isMaxed = elapsedMs >= MAX_DURATION_MS;

  if (meeting.isExpanded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-background border border-gray-200 rounded-xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[85vh] overflow-hidden">
          <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
            <span className="font-semibold text-gray-800">
              Reunión en curso
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`tabular-nums font-mono text-lg ${isMaxed ? 'text-amber-600' : 'text-emerald-600'}`}
              >
                {formatElapsed(elapsedMs)}
              </span>
              {isMaxed && (
                <span className="text-xs text-amber-600">(máx. 2 h)</span>
              )}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpanded(false)}
                title="Minimizar"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="default"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleFinalizar}
                disabled={ending}
              >
                {ending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Square className="h-4 w-4" />
                    Finalizar reunión
                  </>
                )}
              </Button>
            </div>
          </header>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs text-gray-500">
                Transcripción en tiempo real
              </p>
              <Button
                variant={meeting.hasTabAudio ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={handleIncluirTab}
                disabled={capturingTab || meeting.hasTabAudio}
              >
                {meeting.hasTabAudio ? (
                  <>
                    <Monitor className="h-3.5 w-3.5 mr-1" />
                    Audio capturado
                  </>
                ) : (
                  <>
                    <Monitor className="h-3.5 w-3.5 mr-1" />
                    {capturingTab
                      ? 'Compartiendo...'
                      : 'Incluir audio del sistema'}
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mb-1">
              {meeting.hasTabAudio ? (
                <>
                  Audio del sistema capturado y transcribiendo con Vosk (modelo
                  en <code>/vosk-model/model.tar.gz</code>).
                </>
              ) : (
                <>
                  Para capturar audio del sistema (Meet, Zoom, Teams): elige
                  &quot;Compartir pantalla completa&quot; o la ventana de la
                  reunión y activa &quot;Compartir audio del sistema&quot; en el
                  diálogo del navegador.
                </>
              )}
            </p>
            <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-800 whitespace-pre-wrap min-h-[200px]">
              {meeting.transcripcion || (
                <span className="text-gray-400">Esperando audio...</span>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-xl border border-gray-200 bg-white shadow-lg px-4 py-2">
      <span
        className={`tabular-nums font-mono font-semibold ${isMaxed ? 'text-amber-600' : 'text-emerald-600'}`}
      >
        {formatElapsed(elapsedMs)}
      </span>
      {isMaxed && (
        <span className="text-xs text-amber-600 hidden sm:inline">(máx.)</span>
      )}
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={() => setExpanded(true)}
        title="Maximizar"
      >
        <Maximize2 className="h-4 w-4" />
      </Button>
      <Button
        variant="default"
        size="sm"
        className="h-8 bg-emerald-600 hover:bg-emerald-700"
        onClick={handleFinalizar}
        disabled={ending}
      >
        {ending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          'Finalizar reunión'
        )}
      </Button>
    </div>
  );
}
