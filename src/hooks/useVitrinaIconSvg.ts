'use client';

import { useEffect, useState } from 'react';
import {
  extractSvgDrawData,
  VITRINA_IMPACT_ICONS,
  vitrinaImpactIcon,
  type VitrinaIconDrawData,
} from '@/lib/vitrina-impact-icons';

const cache = new Map<string, VitrinaIconDrawData>();
const ICON_REV = '3';

async function loadIcon(file: string): Promise<VitrinaIconDrawData> {
  const key = `${file}?${ICON_REV}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const response = await fetch(`/${file}?v=${ICON_REV}`, { cache: 'no-store' });
  const svg = await response.text();
  const data = extractSvgDrawData(svg);
  cache.set(key, data);
  return data;
}

export function prefetchVitrinaImpactIcons() {
  for (const { file } of Object.values(VITRINA_IMPACT_ICONS)) {
    void loadIcon(file);
  }
}

export function useVitrinaIconSvg(word: string) {
  const { file } = vitrinaImpactIcon(word);
  const [data, setData] = useState<VitrinaIconDrawData | null>(
    () => cache.get(`${file}?${ICON_REV}`) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    const cached = cache.get(`${file}?${ICON_REV}`);
    if (cached) {
      setData(cached);
      return;
    }
    void loadIcon(file).then((next) => {
      if (!cancelled) setData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  return data;
}
