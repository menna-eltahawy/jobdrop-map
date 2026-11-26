import type { LngLat } from './types';
export function circlePolygon(center: LngLat, radiusKm: number, steps = 96): GeoJSON.Feature<GeoJSON.Polygon> {
  const [lng, lat] = center, R = 6371.0088, d = radiusKm / R;
  const φ1 = (lat * Math.PI) / 180, λ1 = (lng * Math.PI) / 180;
  const ring: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const b = (i / steps) * 2 * Math.PI;
    const φ2 = Math.asin(Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(b));
    const λ2 = λ1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(φ1), Math.cos(d) - Math.sin(φ1) * Math.sin(φ2));
    ring.push([(λ2 * 180) / Math.PI, (φ2 * 180) / Math.PI]);
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
}
