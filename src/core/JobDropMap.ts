import maplibregl, { Map as MLMap } from 'maplibre-gl';
import type { CompanyPin, CandidateArea, MapConfig, MapEvents, MapOptions, SearchCircle, LngLat } from './types';
import { SymbolConfig, loadSymbolConfig, uniqueSprites, imageName } from './symbols';
import { circlePolygon } from './circle';
import { LabelLanguage, labelExpression, isBaseLabelLayer } from './labels';

const empty = (): GeoJSON.FeatureCollection => ({ type: 'FeatureCollection', features: [] });
let rtlRequested = false;
function ensureRtl(url?: string) {
  if (!url || rtlRequested) return;
  rtlRequested = true;                                   
  try { Promise.resolve(maplibregl.setRTLTextPlugin(url, true)).catch((e) => console.warn('RTL plugin failed', e)); } catch { /* already set */ }
}

const AREA_SIZE = 0.5;
const HALF_STEP_PX = 19;

export class JobDropMap {
  readonly map: MLMap;
  private ready: Promise<void>;
  private symbols!: SymbolConfig;
  private picking = false;
  private base: string;
  private popup: maplibregl.Popup | null = null;
  private originMarker: maplibregl.Marker | null = null;
  private originPoint: LngLat | null = null;

  constructor(container: HTMLElement, cfg: MapConfig, private events: MapEvents = {}, opts: MapOptions = {}) {
    this.base = opts.symbolsBase ?? '/symbols';
    ensureRtl(cfg.rtlPluginUrl);
    this.map = new maplibregl.Map({ container, style: cfg.styleUrl, center: cfg.center, zoom: cfg.zoom, attributionControl: { compact: true } });
    this.map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');
    this.ready = new Promise((resolve, reject) => this.map.on('load', () => this.init().then(resolve, reject)));
  }

  private async init() {
    this.symbols = await loadSymbolConfig(this.base);
    await Promise.all(uniqueSprites(this.symbols).map(async (p) => {
      try {
        const { data } = await this.map.loadImage(`${this.base}/${p}.png`);
        if (!this.map.hasImage(imageName(p))) this.map.addImage(imageName(p), data, { pixelRatio: 2 });
      } catch (e) { console.warn(`[JobDropMap] sprite failed: ${p}`, e); }
    }));
    this.map.on('styleimagemissing', (e: any) => console.warn('[JobDropMap] missing image', e.id));

    this.map.addSource('circle', { type: 'geojson', data: empty() });
    this.map.addSource('route', { type: 'geojson', data: empty() });
    this.map.addSource('destination', { type: 'geojson', data: empty() });
    this.map.addSource('companies', { type: 'geojson', data: empty(), cluster: true, clusterRadius: 40, clusterMaxZoom: 15 });
    this.map.addSource('areas', { type: 'geojson', data: empty() });
    this.map.addSource('origin', { type: 'geojson', data: empty() });

    const size = ['interpolate', ['linear'], ['zoom'], 9, 0.32, 15, 0.7] as any;
    this.map.addLayer({ id: 'circle-fill', type: 'fill', source: 'circle', paint: { 'fill-color': '#B5804F', 'fill-opacity': 0.14 } });
    this.map.addLayer({ id: 'circle-line', type: 'line', source: 'circle', paint: { 'line-color': '#723E21', 'line-width': 2, 'line-dasharray': [2, 2] } });
    // route line (casing + line) sits under the pins
    this.map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#F4EBDA', 'line-width': 9 } });
    this.map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#723E21', 'line-width': 5 } });
    // selected destination: a halo behind the company icon, or a dot for a free point on the map
    this.map.addLayer({ id: 'destination-halo', type: 'circle', source: 'destination',
      paint: { 'circle-radius': 22, 'circle-color': '#F3C793', 'circle-opacity': 0.55, 'circle-stroke-color': '#592D16', 'circle-stroke-width': 3 } });
    this.map.addLayer({ id: 'destination-dot', type: 'circle', source: 'destination',
      paint: { 'circle-radius': 5, 'circle-color': '#592D16' } });
    this.map.addLayer({ id: 'companies-cluster', type: 'circle', source: 'companies', filter: ['has', 'point_count'],
      paint: { 'circle-color': '#592D16', 'circle-radius': 16, 'circle-stroke-color': '#F4EBDA', 'circle-stroke-width': 2 } });
    this.map.addLayer({ id: 'companies-cluster-count', type: 'symbol', source: 'companies', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12 }, paint: { 'text-color': '#F4EBDA' } });
    this.map.addLayer({ id: 'companies-pt', type: 'symbol', source: 'companies', filter: ['!', ['has', 'point_count']],
      layout: { 'icon-image': imageName(this.symbols._company), 'icon-allow-overlap': true, 'icon-size': size } });
    this.map.addLayer({ id: 'areas-pt', type: 'symbol', source: 'areas',
      layout: { 'icon-image': this.categoryExpression(), 'icon-allow-overlap': true, 'icon-size': AREA_SIZE, 'icon-offset': this.slotOffset('icon') } });
    this.map.addLayer({ id: 'areas-count', type: 'symbol', source: 'areas', filter: ['>', ['coalesce', ['get', 'count'], 0], 1],
      layout: { 'text-field': ['to-string', ['get', 'count']], 'text-font': ['Noto Sans Bold'], 'text-size': 11, 'text-offset': this.slotOffset('text'), 'text-allow-overlap': true },
      paint: { 'text-color': '#592D16', 'text-halo-color': '#F4EBDA', 'text-halo-width': 1.5 } });
    this.map.addLayer({ id: 'origin-halo', type: 'circle', source: 'origin',
      paint: { 'circle-radius': 30, 'circle-color': '#E0AC72', 'circle-opacity': 0.3, 'circle-stroke-color': '#B5804F', 'circle-stroke-width': 1 } });
    this.map.addLayer({ id: 'origin-pt', type: 'symbol', source: 'origin', layout: { 'icon-image': imageName(this.symbols._origin), 'icon-allow-overlap': true, 'icon-anchor': 'bottom', 'icon-size': 0.6 } });

    this.map.on('click', 'companies-pt', (e) => { const id = e.features?.[0]?.properties?.id; if (id) this.events.onSelectCompany?.(String(id)); });
    this.map.on('click', 'areas-pt', (e) => { const id = e.features?.[0]?.properties?.id; if (id) this.events.onSelectArea?.(String(id)); });
    this.map.on('click', 'companies-cluster', async (e) => {
      const f = this.map.queryRenderedFeatures(e.point, { layers: ['companies-cluster'] })[0];
      if (!f) return;
      const zoom = await (this.map.getSource('companies') as maplibregl.GeoJSONSource).getClusterExpansionZoom(f.properties!.cluster_id);
      this.map.easeTo({ center: (f.geometry as any).coordinates, zoom });
    });
    this.map.on('click', (e) => {
      const p: LngLat = [e.lngLat.lng, e.lngLat.lat];
      if (this.picking) { this.events.onOriginChange?.(p); return; }   // origin picking: tap the map to choose the search origin
      const onPin = this.map.queryRenderedFeatures(e.point, { layers: ['companies-pt', 'companies-cluster', 'areas-pt'] }).length > 0;
      if (!onPin) this.events.onMapClick?.(p);
    });
    for (const l of ['companies-pt', 'areas-pt', 'companies-cluster']) {
      this.map.on('mouseenter', l, () => (this.map.getCanvas().style.cursor = 'pointer'));
      this.map.on('mouseleave', l, () => (this.map.getCanvas().style.cursor = this.picking ? 'crosshair' : ''));
    }
  }

  categoryExpression(): any {
    const e: any[] = ['match', ['get', 'category']];
    for (const [k, p] of Object.entries(this.symbols.categories)) e.push(k, imageName(p));
    if (e.length === 2) return imageName(this.symbols._default);
    e.push(imageName(this.symbols._default));
    return e;
  }

  private slotOffset(kind: 'icon' | 'text'): any {
    const e: any[] = ['match', ['get', 'dx']];
    for (let i = -12; i <= 12; i++) {
      e.push(i, ['literal', kind === 'icon' ? [(i * HALF_STEP_PX) / AREA_SIZE, 0] : [(i * HALF_STEP_PX + 15) / 11, -1.4]]);
    }
    e.push(['literal', kind === 'icon' ? [0, 0] : [1.4, -1.4]]);
    return e;
  }

  private async set(src: string, data: GeoJSON.FeatureCollection) {
    await this.ready;
    (this.map.getSource(src) as maplibregl.GeoJSONSource).setData(data);
  }
  setCompanies(items: CompanyPin[]) {
    return this.set('companies', { type: 'FeatureCollection', features: items.map((c) => ({
      type: 'Feature', geometry: { type: 'Point', coordinates: c.lngLat }, properties: { id: c.id, name: c.name, type: c.locationType ?? '' } })) });
  }
  async setCandidateAreas(items: CandidateArea[], fit = false) {
    const key = (a: CandidateArea) => `${a.areaCenter[0]},${a.areaCenter[1]}`;
    const total = new Map<string, number>();
    for (const a of items) total.set(key(a), (total.get(key(a)) ?? 0) + 1);
    const used = new Map<string, number>();
    await this.set('areas', { type: 'FeatureCollection', features: items.map((a) => {
      const k = key(a);
      const slot = used.get(k) ?? 0;
      used.set(k, slot + 1);
      const dx = 2 * slot - ((total.get(k) ?? 1) - 1);
      return { type: 'Feature', geometry: { type: 'Point', coordinates: a.areaCenter },
        properties: { id: a.id, area: a.areaName, category: a.category, count: a.count ?? 1, dx } };
    }) });
    if (fit && items.length > 0) {
      const b = new maplibregl.LngLatBounds();
      items.forEach((a) => b.extend(a.areaCenter));
      if (this.originPoint) b.extend(this.originPoint);
      this.map.fitBounds(b, { padding: 70, maxZoom: 12, duration: 600 });
    }
  }
  setOrigin(p: LngLat | null, label?: string) {
    this.originPoint = p;
    this.originMarker?.remove();
    this.originMarker = null;
    if (p && label) {
      const el = document.createElement('div');
      el.className = 'jd-origin-label';
      el.textContent = label;                              // textContent: never parsed as HTML
      this.originMarker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -42] }).setLngLat(p).addTo(this.map);
    }
    return this.set('origin', { type: 'FeatureCollection', features: p ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} }] : [] });
  }
  setDestination(p: LngLat | null) {
    return this.set('destination', { type: 'FeatureCollection', features: p ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: p }, properties: {} }] : [] });
  }
  async setRoute(line: LngLat[] | null, fit = true) {
    const ok = !!line && line.length > 1;
    await this.set('route', { type: 'FeatureCollection', features: ok ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: line! }, properties: {} }] : [] });
    if (ok && fit) {
      const b = new maplibregl.LngLatBounds();
      line!.forEach((p) => b.extend(p));
      this.map.fitBounds(b, { padding: 70, duration: 600 });
    }
  }
  async setSearchCircle(c: SearchCircle | null, fit = true) {
    const poly = c ? circlePolygon(c.center, c.radiusKm) : null;
    await this.set('circle', { type: 'FeatureCollection', features: poly ? [poly] : [] });
    if (poly && fit) {
      const b = new maplibregl.LngLatBounds();
      (poly.geometry.coordinates[0] as LngLat[]).forEach((p) => b.extend(p));
      this.map.fitBounds(b, { padding: 40, duration: 600 });
    }
  }

  async setLabelLanguage(lang: LabelLanguage) {
    await this.ready;
    const expr = labelExpression(lang);
    for (const l of this.map.getStyle().layers) if (isBaseLabelLayer(l)) this.map.setLayoutProperty(l.id, 'text-field', expr);
  }

  setPopup(at: LngLat | null, content: HTMLElement, onClose?: () => void) {
    this.removePopup();
    if (!at) return;
    const popup = new maplibregl.Popup({ closeOnClick: false, offset: 28, maxWidth: '290px', className: 'jd-popup' });
    popup.setLngLat(at).setDOMContent(content).addTo(this.map);
    popup.on('close', () => { if (this.popup === popup) { this.popup = null; onClose?.(); } });
    this.popup = popup;
  }
  refreshPopup() { if (this.popup) this.popup.setLngLat(this.popup.getLngLat()); }
  private removePopup() { const p = this.popup; this.popup = null; p?.remove(); }

  enableOriginPicking(on: boolean) { this.picking = on; this.map.getCanvas().style.cursor = on ? 'crosshair' : ''; }
  flyTo(p: LngLat, zoom = 14) { this.map.flyTo({ center: p, zoom }); }
  destroy() { this.removePopup(); this.originMarker?.remove(); this.map.remove(); }
}