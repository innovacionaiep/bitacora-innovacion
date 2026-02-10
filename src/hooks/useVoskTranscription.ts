'use client';

import { useEffect, useRef } from 'react';
import { useMeetingLiveOptional } from '@/contexts/MeetingLiveContext';
import { type KaldiRecognizer } from 'vosk-browser';
import { getVoskModel } from '@/lib/vosk-model-loader';

/**
 * Hook that transcribes system/tab audio using Vosk when hasTabAudio is true.
 * Requires the model at public/vosk-model/model.tar.gz (or NEXT_PUBLIC_VOSK_MODEL_URL).
 */
export function useVoskTranscription() {
  const ctx = useMeetingLiveOptional();
  const modelRef = useRef<Awaited<ReturnType<typeof getVoskModel>> | null>(null);
  const recognizerRef = useRef<KaldiRecognizer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const lastInterimRef = useRef<string>('');

  useEffect(() => {
    const meeting = ctx?.meeting ?? null;
    if (!meeting?.hasTabAudio || !ctx) return;

    const stream = ctx.getTabStream();
    if (!stream || stream.getAudioTracks().length === 0) return;

    let cancelled = false;
    lastInterimRef.current = '';

    const init = async () => {
      try {
        const model = modelRef.current ?? (await getVoskModel());
        if (cancelled) return;
        modelRef.current = model;

        const recognizer = new model.KaldiRecognizer(16000);
        recognizerRef.current = recognizer;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognizer.on('result', ((msg: unknown) => {
          if (cancelled) return;
          const m = msg as { result?: { text?: string } };
          const text = m.result?.text?.trim();
          if (text) ctx.appendTranscript(text);
          lastInterimRef.current = '';
        }) as any);

        recognizer.on(
          'partialresult',
          ((msg: { result?: { partial?: string } }) => {
            if (cancelled) return;
            lastInterimRef.current = msg.result?.partial?.trim() ?? '';
          }) as any
        );

        recognizer.on('error', (() => {
          lastInterimRef.current = '';
        }) as any);

        const audioContext = new AudioContext({ sampleRate: 16000 });
        if (cancelled) return;
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = audioContext.createScriptProcessor(4096, 2, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (event) => {
          if (cancelled || !recognizerRef.current) return;
          const input = event.inputBuffer;
          try {
            if (input.numberOfChannels >= 2) {
              const left = input.getChannelData(0);
              const right = input.getChannelData(1);
              const mono = new Float32Array(left.length);
              for (let i = 0; i < left.length; i++)
                mono[i] = (left[i] + right[i]) / 2;
              const monoBuffer = new AudioBuffer({
                length: mono.length,
                numberOfChannels: 1,
                sampleRate: input.sampleRate,
              });
              monoBuffer.copyToChannel(mono, 0);
              recognizerRef.current.acceptWaveform(monoBuffer);
            } else {
              recognizerRef.current.acceptWaveform(input);
            }
          } catch {
            // ignore
          }
        };

        const dest = audioContext.createMediaStreamDestination();
        source.connect(processor);
        processor.connect(dest);
      } catch (err) {
        console.error('Vosk init error:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      processorRef.current?.disconnect();
      processorRef.current = null;
      sourceRef.current?.disconnect();
      sourceRef.current = null;
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
      const pending = lastInterimRef.current.trim();
      if (pending && ctx) ctx.appendTranscript(pending);
      recognizerRef.current?.remove();
      recognizerRef.current = null;
    };
  }, [ctx?.meeting?.hasTabAudio, ctx?.meeting?.reunionId]);
}
