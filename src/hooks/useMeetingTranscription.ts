'use client';

import { useEffect, useRef } from 'react';
import { useMeetingLiveOptional } from '@/contexts/MeetingLiveContext';

declare global {
  interface Window {
    SpeechRecognition?: typeof SpeechRecognition;
    webkitSpeechRecognition?: typeof SpeechRecognition;
  }
}

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;

/**
 * Hook that runs when a meeting is active: captures microphone and uses
 * Web Speech API to transcribe in real time, appending to meeting context.
 * Optionally supports "tab capture" via getDisplayMedia (user shares the
 * meeting tab so we get that audio too); tab audio is transcribed with
 * a second recognition instance (Chrome uses default input for recognition,
 * so we only use mic for now; tab capture can be added later with backend STT).
 */
export function useMeetingTranscription() {
  const ctx = useMeetingLiveOptional();
  const recognitionRef = useRef<InstanceType<
    NonNullable<typeof SpeechRecognitionAPI>
  > | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastInterimRef = useRef<string>('');

  useEffect(() => {
    const meeting = ctx?.meeting ?? null;
    if (!meeting || !ctx) return;

    const appendTranscript = ctx.appendTranscript;
    if (!SpeechRecognitionAPI) {
      return;
    }

    let cancelled = false;
    lastInterimRef.current = '';

    const startMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
      } catch (err) {
        console.error('Error getting microphone:', err);
        return;
      }

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'es-CL';
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        if (cancelled) return;
        const result = event.results[event.resultIndex];
        const text = result[0]?.transcript?.trim();
        if (!text) return;
        if (result.isFinal) {
          appendTranscript(text);
          lastInterimRef.current = '';
        } else {
          lastInterimRef.current = text;
        }
      };
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        console.warn('Speech recognition error:', event.error);
      };
      recognition.onend = () => {
        if (!cancelled && ctx?.meeting) {
          const pending = lastInterimRef.current.trim();
          if (pending) {
            appendTranscript(pending);
            lastInterimRef.current = '';
          }
          try {
            recognition.start();
          } catch {
            // may throw if already started or revoked
          }
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (err) {
        console.warn('Speech recognition start error:', err);
      }
    };

    startMic();

    return () => {
      cancelled = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [ctx?.meeting?.reunionId]); // re-run when meeting identity changes
}
