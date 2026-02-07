'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type MeetingLiveState = {
  reunionId: string;
  proyectoId: string;
  startedAt: Date;
  transcripcion: string;
  isExpanded: boolean;
  hasTabAudio: boolean;
} | null;

type MeetingLiveContextValue = {
  meeting: MeetingLiveState;
  startMeeting: (reunionId: string, proyectoId: string) => void;
  endMeeting: () => void;
  appendTranscript: (text: string) => void;
  setExpanded: (expanded: boolean) => void;
  setOnMeetingEnded: (cb: ((proyectoId: string) => void) | null) => void;
  startTabCapture: () => Promise<boolean>;
  getTabStream: () => MediaStream | null;
};

const MeetingLiveContext = createContext<MeetingLiveContextValue | null>(null);

export function MeetingLiveProvider({ children }: { children: ReactNode }) {
  const [meeting, setMeeting] = useState<MeetingLiveState>(null);
  const onMeetingEndedRef = useRef<((proyectoId: string) => void) | null>(null);

  const tabStreamRef = useRef<MediaStream | null>(null);

  const startMeeting = useCallback((reunionId: string, proyectoId: string) => {
    tabStreamRef.current?.getTracks().forEach((t) => t.stop());
    tabStreamRef.current = null;
    setMeeting({
      reunionId,
      proyectoId,
      startedAt: new Date(),
      transcripcion: '',
      isExpanded: false,
      hasTabAudio: false,
    });
  }, []);

  const startTabCapture = useCallback(async (): Promise<boolean> => {
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            suppressLocalAudioPlayback: false,
          },
          systemAudio: 'include',
          monitorTypeSurfaces: 'include',
          preferCurrentTab: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
      }
      tabStreamRef.current?.getTracks().forEach((t) => t.stop());
      tabStreamRef.current = stream;
      stream.getVideoTracks().forEach((t) => t.stop());
      setMeeting((prev) => (prev ? { ...prev, hasTabAudio: true } : null));
      return true;
    } catch {
      return false;
    }
  }, []);

  const cleanupTabStream = useCallback(() => {
    tabStreamRef.current?.getTracks().forEach((t) => t.stop());
    tabStreamRef.current = null;
  }, []);

  const endMeeting = useCallback(() => {
    cleanupTabStream();
    setMeeting((prev) => {
      if (prev) {
        const proyectoId = prev.proyectoId;
        queueMicrotask(() => onMeetingEndedRef.current?.(proyectoId));
      }
      return null;
    });
  }, [cleanupTabStream]);

  const setOnMeetingEnded = useCallback(
    (cb: ((proyectoId: string) => void) | null) => {
      onMeetingEndedRef.current = cb;
    },
    []
  );

  const appendTranscript = useCallback((text: string) => {
    if (!text.trim()) return;
    setMeeting((prev) =>
      prev
        ? {
            ...prev,
            transcripcion: prev.transcripcion
              ? `${prev.transcripcion} ${text.trim()}`
              : text.trim(),
          }
        : null
    );
  }, []);

  const setExpanded = useCallback((expanded: boolean) => {
    setMeeting((prev) => (prev ? { ...prev, isExpanded: expanded } : null));
  }, []);

  const getTabStream = useCallback(() => tabStreamRef.current, []);

  const value = useMemo<MeetingLiveContextValue>(
    () => ({
      meeting,
      startMeeting,
      endMeeting,
      appendTranscript,
      setExpanded,
      setOnMeetingEnded,
      startTabCapture,
      getTabStream,
    }),
    [
      meeting,
      startMeeting,
      endMeeting,
      appendTranscript,
      setExpanded,
      setOnMeetingEnded,
      startTabCapture,
      getTabStream,
    ]
  );

  return (
    <MeetingLiveContext.Provider value={value}>
      {children}
    </MeetingLiveContext.Provider>
  );
}

export function useMeetingLive() {
  const ctx = useContext(MeetingLiveContext);
  if (!ctx) {
    throw new Error('useMeetingLive must be used within MeetingLiveProvider');
  }
  return ctx;
}

export function useMeetingLiveOptional() {
  return useContext(MeetingLiveContext);
}
