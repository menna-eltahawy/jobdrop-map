import type { LngLat } from '../src/core/types';

const GEOCODER_URL = 'https://nominatim.openstreetmap.org/search';
const COUNTRIES = 'eg,ae,sa,qa,bh';   // Egypt, UAE, Saudi Arabia, Qatar, Bahrain (the countries in the approved-areas PDF)

export interface Place { name: string; lngLat: LngLat }

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const url = new URL(GEOCODER_URL);
  url.search = new URLSearchParams({
    q: query, format: 'jsonv2', limit: '6', countrycodes: COUNTRIES, 'accept-language': 'en',
  }).toString();
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return rows.map((r) => ({ name: r.display_name, lngLat: [Number(r.lon), Number(r.lat)] as LngLat }));
}