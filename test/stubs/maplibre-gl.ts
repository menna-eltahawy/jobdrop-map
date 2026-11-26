// Minimal fake of maplibre-gl, ONLY for unit tests (no browser/WebGL/network needed).
export class FakeSource { data: any = null; setData(d: any) { this.data = d; } getClusterExpansionZoom(_id: number) { return Promise.resolve(14); } }
export class Map {
  static last: Map;
  handlers: { type: string; layer?: string; fn: Function }[] = [];
  sources: Record<string, any> = {}; layers: any[] = []; images: Record<string, any> = {}; loaded: string[] = [];
  camera: any[] = []; controls: any[] = []; removed = false; styleLayers: any[] = []; layoutCalls: any[] = []; canvas = { style: { cursor: '' } };
  constructor(public opts: any) { Map.last = this; }
  on(type: string, a: any, b?: any) { const layer = typeof a === 'string' ? a : undefined; const fn = layer ? b : a; this.handlers.push({ type, layer, fn }); if (type === 'load') queueMicrotask(() => fn()); return this; }
  emit(type: string, layer?: string, ev: any = {}) { this.handlers.filter((h) => h.type === type && h.layer === layer).forEach((h) => h.fn(ev)); }
  addControl(c: any, pos: string) { this.controls.push([c, pos]); }
  addSource(id: string, spec: any) { this.sources[id] = Object.assign(new FakeSource(), { spec }); }
  getSource(id: string) { return this.sources[id]; }
  addLayer(l: any) { if (l.source && !this.sources[l.source]) throw new Error(`layer ${l.id}: unknown source ${l.source}`); this.layers.push(l); }
  async loadImage(url: string) { this.loaded.push(url); return { data: { url } }; }
  hasImage(n: string) { return n in this.images; }
  addImage(n: string, d: any, o: any) { this.images[n] = { d, o }; }
  queryRenderedFeatures() { return [{ properties: { cluster_id: 7 }, geometry: { coordinates: [31, 30] } }]; }
  easeTo(o: any) { this.camera.push(['easeTo', o]); } flyTo(o: any) { this.camera.push(['flyTo', o]); } fitBounds(b: any, o: any) { this.camera.push(['fitBounds', b, o]); }
  getStyle() { return { layers: [...this.styleLayers, ...this.layers] }; }
  setLayoutProperty(id: string, name: string, value: any) { this.layoutCalls.push({ id, name, value }); }
  getCanvas() { return this.canvas; } remove() { this.removed = true; }
}
export class NavigationControl { constructor(public o: any) {} }
export class LngLatBounds { pts: number[][] = []; extend(p: number[]) { this.pts.push(p); } }
export const setRTLTextPlugin = (..._a: any[]) => Promise.resolve();
export default { Map, NavigationControl, LngLatBounds, setRTLTextPlugin };