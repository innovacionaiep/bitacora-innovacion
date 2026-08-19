'use client';

import { useEffect, useState } from 'react';
import { vitrinaTypewriterProgress } from '@/lib/vitrina-typewriter';
import type { VitrinaRotatingItem } from '@/components/vitrina/VitrinaRotatingWord';

export type VitrinaTypewriterPhase = 'typing' | 'holding' | 'deleting';

const TYPE_MS = 55;
const DELETE_MS = 32;

export function useVitrinaTypewriter(
  items: readonly VitrinaRotatingItem[],
  intervalMs = 2000,
) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [phase, setPhase] = useState<VitrinaTypewriterPhase>('typing');

  useEffect(() => {
    const item = items[index];
    if (!item || items.length === 0) return;

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      setDisplayed(item.word);
      if (items.length < 2) return;
      const id = window.setTimeout(() => {
        setIndex((current) => (current + 1) % items.length);
      }, intervalMs);
      return () => window.clearTimeout(id);
    }

    if (phase === 'typing') {
      if (displayed.length >= item.word.length) {
        const id = window.setTimeout(() => setPhase('holding'), 0);
        return () => window.clearTimeout(id);
      }
      const id = window.setTimeout(() => {
        setDisplayed(item.word.slice(0, displayed.length + 1));
      }, TYPE_MS);
      return () => window.clearTimeout(id);
    }

    if (phase === 'holding') {
      if (items.length < 2) return;
      const id = window.setTimeout(() => setPhase('deleting'), intervalMs);
      return () => window.clearTimeout(id);
    }

    if (displayed.length === 0) {
      const id = window.setTimeout(() => {
        setIndex((current) => (current + 1) % items.length);
        setPhase('typing');
      }, 80);
      return () => window.clearTimeout(id);
    }

    const id = window.setTimeout(() => {
      setDisplayed((text) => text.slice(0, -1));
    }, DELETE_MS);
    return () => window.clearTimeout(id);
  }, [displayed, index, items, intervalMs, phase]);

  const current = items[index];
  const progress = current
    ? vitrinaTypewriterProgress(displayed, current.word)
    : 0;

  return { index, displayed, phase, progress, current };
}
