import type { CompanyPin, CandidateArea, LngLat } from '../src/core/types';

const BASE = '/geo';   

export class GeoError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

async function fail(res: Response): Promise<never> {
  let body: any = {};
  try { body = await res.json(); } catch { /* non-JSON error (e.g. proxy cannot reach the API) */ }
  throw new GeoError(res.status, body.code ?? 'error', body.message ?? res.statusText);
}

async function get<T>(path: string, params: Record<string, string | number> = {}, signal?: AbortSignal): Promise<T> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  const res = await fetch(`${BASE}${path}${qs.size ? `?${qs}` : ''}`, { signal });
  if (!res.ok) await fail(res);
  return res.json() as Promise<T>;
}

async function put(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) await fail(res);
}

// ---------- types ----------
interface PinDto { id: string; companyId: string; name: string; locationType: 'hq' | 'work_site' | 'hr'; lngLat: LngLat; distanceM: number }
interface AreaDto { id: string; areaName: string; areaNameEn: string; areaCenter: LngLat; category: string; count: number }

export interface CompanyHit extends CompanyPin { companyId: string; distanceM: number }
export interface AreaHit extends CandidateArea { areaNameEn: string }
export interface ApplicantState {
  id: string; category: string | null; discoverable: boolean;
  hasResidence: boolean; hasCurrentLocation: boolean; currentLocationUpdatedAt: string | null;
}
export type CompanyKind = 'hq' | 'work_site' | 'hr';
export type TravelMode = 'car' | 'motorcycle' | 'walk';
export interface RouteResult {
  mode: TravelMode; distanceM: number; durationS: number;
  estimated: boolean;            
  geometry: LngLat[];           
  attribution: string;           
}

const toHit = (p: PinDto): CompanyHit =>
  ({ id: p.id, companyId: p.companyId, name: p.name, lngLat: p.lngLat, locationType: p.locationType, distanceM: p.distanceM });

// ---------- search ----------
export async function searchCompanies(origin: LngLat, radiusKm: number, signal?: AbortSignal): Promise<CompanyHit[]> {
  const r = await get<{ items: PinDto[] }>('/search/companies', { lng: origin[0], lat: origin[1], radiusKm }, signal);
  return r.items.map(toHit);
}

export async function searchCompaniesFromApplicant(applicantId: string, from: 'residence' | 'current', radiusKm: number, signal?: AbortSignal): Promise<CompanyHit[]> {
  const r = await get<{ items: PinDto[] }>(`/applicants/${encodeURIComponent(applicantId)}/search-companies`, { from, radiusKm }, signal);
  return r.items.map(toHit);
}

export async function searchApplicantAreas(companyId: string, locationId: string, radiusKm: number, signal?: AbortSignal): Promise<AreaHit[]> {
  const r = await get<{ items: AreaDto[] }>('/search/applicant-areas', { companyId, locationId, radiusKm }, signal);
  return r.items.map((a) => ({ id: a.id, areaName: a.areaName, areaNameEn: a.areaNameEn, areaCenter: a.areaCenter, category: a.category, count: a.count }));
}

export async function reversePlace(p: LngLat, lang: 'ar' | 'en', signal?: AbortSignal): Promise<string | null> {
  const r = await get<{ displayName: string | null }>('/places/reverse', { lng: p[0], lat: p[1], lang }, signal);
  return r.displayName ?? null;
}

export async function getCompanyLocation(companyId: string, locationId: string, signal?: AbortSignal): Promise<CompanyHit> {
  return toHit(await get<PinDto>(`/companies/${encodeURIComponent(companyId)}/locations/${encodeURIComponent(locationId)}`, {}, signal));
}

// ---------- routing ----------
export const getRoute = (from: LngLat, to: LngLat, mode: TravelMode, signal?: AbortSignal) =>
  get<RouteResult>('/route', { fromLng: from[0], fromLat: from[1], toLng: to[0], toLat: to[1], mode }, signal);

export const getApplicantState = (id: string) => get<ApplicantState>(`/applicants/${encodeURIComponent(id)}`);

export const saveApplicantProfile = (id: string, category: string | null, discoverable: boolean) =>
  put(`/applicants/${encodeURIComponent(id)}/profile`, { category, discoverable });
export const saveResidence = (id: string, p: LngLat) =>
  put(`/applicants/${encodeURIComponent(id)}/residence`, { lng: p[0], lat: p[1] });
export const saveCurrentLocation = (id: string, p: LngLat) =>
  put(`/applicants/${encodeURIComponent(id)}/current-location`, { lng: p[0], lat: p[1] });
export const saveCompanyLocation = (companyId: string, locationId: string, kind: CompanyKind, name: string, p: LngLat) =>
  put(`/companies/${encodeURIComponent(companyId)}/locations/${encodeURIComponent(locationId)}`, { kind, name, lng: p[0], lat: p[1] });

// ---------- messages (English, used by the registration tools page) ----------
export function errorText(e: unknown): string {
  if (e instanceof GeoError) {
    if (e.status === 401) return 'Invalid API key. Check .env.local and restart npm run dev';
    switch (e.code) {
      case 'invalid_radius': return 'Radius must be greater than 0 and within the allowed maximum';
      case 'location_not_found': return 'Location not found for this company';
      case 'applicant_not_found': return 'Applicant not found. Save the profile first';
      case 'location_not_set': return 'This applicant has not saved that location yet';
      case 'unknown_reference': return 'Category is not in the approved list';
      case 'outside_approved_area': return 'A work site must be inside an approved area. Pick a point inside one';
      case 'location_owned_by_other_company': return 'This location ID belongs to another company';
      case 'invalid_kind': return 'Invalid location type';
      case 'invalid_name': return 'Location name is required';
      case 'invalid_point': return 'Invalid coordinates';
      case 'invalid_mode': return 'Travel mode must be car, motorcycle or walk';
      case 'route_too_far': return 'The two points are too far apart for a route';
      case 'point_not_routable': return 'One of the points is too far from any road';
      case 'route_not_found': return 'No route exists between these two points';
      case 'routing_unavailable': return 'The routing engine is not reachable right now';
      case 'routing_timeout': return 'The routing engine took too long to answer';
    }
    if (e.status === 429) return 'Too many requests, try again shortly';
    if (e.status >= 500) return 'Cannot reach the API. Make sure it is running in Visual Studio';
    return e.message;
  }
  return 'Cannot reach the server';
}