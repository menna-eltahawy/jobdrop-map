import type { LngLat } from '../src/core/types';
import type { TravelMode } from './geoClient';

const TRAVEL: Record<TravelMode, string> = { car: 'driving', motorcycle: 'two-wheeler', walk: 'walking' };
const latLng = (p: LngLat) => `${p[1]},${p[0]}`;   // Google wants lat,lng

export function googleDirectionsUrl(from: LngLat | null, to: LngLat, mode: TravelMode): string {
  const q: Record<string, string> = { api: '1', destination: latLng(to), travelmode: TRAVEL[mode] };
  if (from) q.origin = latLng(from);
  return `https://www.google.com/maps/dir/?${new URLSearchParams(q)}`;
}