import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchPlaces } from '../demo/geocoder';
import { getRoute, GeoError } from '../demo/geoClient';



test('geocoder: limited to the PDF countries, English, and converts lat/lon strings to [lng, lat]', async () => {
  let seen = '';
  (globalThis as any).fetch = async (url: URL | string) => {
    seen = String(url);
    return { ok: true, status: 200, json: async () => [{ lat: '30.0381', lon: '31.2109', display_name: 'Dokki, Giza, Egypt' }] };
  };
  const r = await searchPlaces('Dokki');
  const u = new URL(seen);
  assert.equal(u.searchParams.get('q'), 'Dokki');
  assert.equal(u.searchParams.get('countrycodes'), 'eg,ae,sa,qa,bh');
  assert.equal(u.searchParams.get('accept-language'), 'en');
  assert.deepEqual(r, [{ name: 'Dokki, Giza, Egypt', lngLat: [31.2109, 30.0381] }]);

  (globalThis as any).fetch = async () => ({ ok: false, status: 429, json: async () => ({}) });
  await assert.rejects(() => searchPlaces('x'), /429/);
});

test('route client: sends both points and the mode, returns the line, maps API errors', async () => {
  let seen = '';
  (globalThis as any).fetch = async (url: string) => {
    seen = String(url);
    return { ok: true, status: 200, json: async () => ({ mode: 'walk', distanceM: 5060, durationS: 3660, estimated: false,
      geometry: [[31.2, 30.0], [31.21, 30.01]], attribution: 'x' }) };
  };
  const r = await getRoute([31.2109, 30.0381], [31.2049, 30.0571], 'walk');
  const u = new URL(seen, 'http://x');
  assert.equal(u.pathname, '/geo/route');
  assert.equal(u.searchParams.get('fromLng'), '31.2109');
  assert.equal(u.searchParams.get('fromLat'), '30.0381');
  assert.equal(u.searchParams.get('toLng'), '31.2049');
  assert.equal(u.searchParams.get('toLat'), '30.0571');
  assert.equal(u.searchParams.get('mode'), 'walk');
  assert.equal(r.durationS, 3660);
  assert.equal(r.geometry.length, 2);

  (globalThis as any).fetch = async () => ({ ok: false, status: 422, statusText: 'x', json: async () => ({ code: 'route_too_far', message: 'far' }) });
  await assert.rejects(() => getRoute([0, 0], [50, 50], 'car'), (e: any) => e instanceof GeoError && e.code === 'route_too_far');
});