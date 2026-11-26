import { useEffect, useState } from 'react';
import type { LngLat } from '../src/core/types';
import { reversePlace } from './geoClient';

const cache = new Map<string, string>();

export async function placeName(p: LngLat, lang: 'ar' | 'en', signal?: AbortSignal): Promise<string | null> {
  const key = `${lang}:${p[1].toFixed(3)},${p[0].toFixed(3)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const name = await reversePlace(p, lang, signal);
    if (name) cache.set(key, name);
    return name;
  } catch {
    return null;
  }
}

export function usePlaceName(p: LngLat | null, lang: 'ar' | 'en'): string | null {
  const lng = p?.[0], lat = p?.[1];
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    setName(null);
    if (lng === undefined || lat === undefined) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      placeName([lng, lat], lang, ac.signal).then((n) => { if (!ac.signal.aborted) setName(n); });
    }, 400);
    return () => { clearTimeout(t); ac.abort(); };
  }, [lng, lat, lang]);
  return name;
}