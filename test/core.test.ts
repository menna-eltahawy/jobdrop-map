import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { circlePolygon } from '../src/core/circle';
import { JobDropMap } from '../src/core/JobDropMap';
import { Map as FakeMap } from 'maplibre-gl';
import { imageName } from '../src/core/symbols';
import { isBaseLabelLayer } from '../src/core/labels';

const ROOT = path.resolve(import.meta.dirname, '..');
const PUB = path.join(ROOT, 'public');
const style = JSON.parse(fs.readFileSync(path.join(PUB, 'jobdrop-style.json'), 'utf8'));
const cats = JSON.parse(fs.readFileSync(path.join(PUB, 'symbols/categories.json'), 'utf8'));

// serve /symbols/categories.json from disk for the controller
(globalThis as any).fetch = async (url: string) => {
  const f = path.join(PUB, url.replace(/^\//, ''));
  return fs.existsSync(f) ? { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(f, 'utf8')) } : { ok: false, status: 404, json: async () => ({}) };
};
const hav = (a: number[], b: number[]) => { const R = 6371.0088, r = (d: number) => d * Math.PI / 180;
  const h = Math.sin(r(b[1] - a[1]) / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(r(b[0] - a[0]) / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const tick = () => new Promise((r) => setTimeout(r, 20));
async function makeMap(events: any = {}) {
  const m = new JobDropMap({} as any, { styleUrl: '/s.json', center: [31.2, 30], zoom: 12, rtlPluginUrl: 'x.js' }, events);
  await tick(); return { m, fm: FakeMap.last as any };
}

test('circle: closed ring, every vertex is radiusKm away from the centre', () => {
  for (const [c, r] of [[[31.2109, 30.0381], 1], [[31.4913, 30.0074], 4], [[55.27, 25.2], 10]] as any) {
    const ring = circlePolygon(c, r).geometry.coordinates[0];
    assert.deepEqual(ring[0], ring[ring.length - 1]);
    for (const p of ring) assert.ok(Math.abs(hav(c, p) - r) / r < 0.005, `radius off at ${p}`);
  }
});

test('style: structure is valid and uses the brand palette', () => {
  assert.equal(style.version, 8);
  const ids = style.layers.map((l: any) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate layer ids');
  for (const l of style.layers) {
    if (l.type !== 'background') { assert.ok(style.sources[l.source], `${l.id}: unknown source`); assert.ok(l['source-layer'], `${l.id}: missing source-layer`); }
  }
  assert.ok(style.glyphs?.includes('{fontstack}') && style.glyphs.includes('{range}'));
  const txt = JSON.stringify(style);
  for (const c of ['#F4EBDA', '#F3C793', '#E0AC72', '#B5804F', '#723E21', '#592D16', '#86502B']) assert.ok(txt.includes(c), `palette colour ${c} unused`);
  const labels = style.layers.filter((l: any) => l.type === 'symbol');
  assert.ok(labels.length >= 3);
  for (const l of labels) assert.ok(JSON.stringify(l.layout['text-field']).includes('name:ar'), `${l.id}: Arabic name not preferred`);
  assert.equal(style.sources.openmaptiles.attribution.includes('OpenStreetMap'), true, 'attribution must stay');
});

test('sprites: every file in categories.json exists and is an RGBA PNG', () => {
  const files = new Set([cats._default, cats._company, cats._origin, ...Object.values(cats.categories)] as string[]);
  for (const p of files) {
    const f = path.join(PUB, 'symbols', p + '.png');
    assert.ok(fs.existsSync(f), `missing ${p}`);
    const b = fs.readFileSync(f);
    assert.equal(b.subarray(1, 4).toString(), 'PNG');
    assert.equal(b.readUInt32BE(16), 128, `${p}: width`); assert.equal(b.readUInt32BE(20), 128, `${p}: height`);
    assert.equal(b[25], 6, `${p}: needs alpha channel (RGBA)`);
  }
});

test('controller: registers RTL plugin, sources, layers (in order), images', async () => {
  const { fm } = await makeMap();
  assert.deepEqual(Object.keys(fm.sources).sort(), ['areas', 'circle', 'companies', 'destination', 'origin', 'route']);  const ids = fm.layers.map((l: any) => l.id);
  assert.ok(ids.indexOf('circle-fill') < ids.indexOf('companies-pt') && ids.indexOf('companies-pt') < ids.indexOf('origin-pt'), 'circle below pins, origin on top');
  assert.equal(fm.sources.companies.spec.cluster, true);
  for (const p of new Set([cats._default, cats._company, cats._origin, ...Object.values(cats.categories)] as string[])) assert.ok(fm.images[imageName(p)], `image ${p} not registered`);
  assert.equal(fm.images[imageName(cats._company)].o.pixelRatio, 2);
});

test('controller: icon expression maps every category and falls back to the default', async () => {
  const { fm } = await makeMap();
  const expr = fm.layers.find((l: any) => l.id === 'areas-pt').layout['icon-image'];
  assert.equal(expr[0], 'match'); assert.deepEqual(expr[1], ['get', 'category']);
  for (const [k, p] of Object.entries(cats.categories)) assert.equal(expr[expr.indexOf(k) + 1], imageName(p as string));
  assert.equal(expr[expr.length - 1], imageName(cats._default), 'fallback must be last');
});

test('controller: data goes into the right sources', async () => {
  const { m, fm } = await makeMap();
  await m.setCompanies([{ id: 'c1', name: 'A', lngLat: [31.2, 30.05], locationType: 'hq' }]);
  assert.deepEqual(fm.sources.companies.data.features[0].geometry.coordinates, [31.2, 30.05]);
  await m.setOrigin([31.1, 30.1]); assert.equal(fm.sources.origin.data.features.length, 1);
  await m.setOrigin(null); assert.equal(fm.sources.origin.data.features.length, 0);
  await m.setSearchCircle({ center: [31.2, 30.04], radiusKm: 3 });
  assert.equal(fm.sources.circle.data.features[0].geometry.type, 'Polygon');
  assert.equal(fm.camera.at(-1)[0], 'fitBounds');
  await m.setSearchCircle(null); assert.equal(fm.sources.circle.data.features.length, 0);
});

test('privacy: candidate areas expose only allow-listed fields and the AREA centre', async () => {
  const { m, fm } = await makeMap();
  const leaky: any = { id: 'a1', areaName: 'الوكلاء', areaCenter: [31.3, 30.1], category: 'tech', count: 2,
    homeLngLat: [31.30123, 30.10456], address: '12 Some St', phone: '010' };
  await m.setCandidateAreas([leaky]);
  const f = fm.sources.areas.data.features[0];
assert.deepEqual(Object.keys(f.properties).sort(), ['area', 'category', 'count', 'dx', 'id']);
  assert.deepEqual(f.geometry.coordinates, [31.3, 30.1]);
  assert.ok(!JSON.stringify(fm.sources.areas.data).includes('31.30123'), 'exact home coordinates leaked');
});

test('events: company/area/cluster clicks and origin picking', async () => {
  const got: any = {};
  const { m, fm } = await makeMap({ onSelectCompany: (id: string) => (got.c = id), onSelectArea: (id: string) => (got.a = id), onOriginChange: (p: number[]) => (got.o = p) });
  fm.emit('click', 'companies-pt', { features: [{ properties: { id: 'c9' } }] });
  fm.emit('click', 'areas-pt', { features: [{ properties: { id: 'a3' } }] });
  assert.equal(got.c, 'c9'); assert.equal(got.a, 'a3');
  fm.emit('click', undefined, { lngLat: { lng: 31.5, lat: 30.2 } });
  assert.equal(got.o, undefined, 'must not fire while picking is off');
  m.enableOriginPicking(true); assert.equal(fm.canvas.style.cursor, 'crosshair');
  fm.emit('click', undefined, { lngLat: { lng: 31.5, lat: 30.2 } }); assert.deepEqual(got.o, [31.5, 30.2]);
  fm.emit('click', 'companies-cluster', { point: { x: 1, y: 1 } }); await tick();
  assert.equal(fm.camera.at(-1)[0], 'easeTo');
});

test('destroy removes the map', async () => { const { m, fm } = await makeMap(); m.destroy(); assert.equal(fm.removed, true); });

test('labels: the language switch rewrites only the base-map label layers (Arabic <-> English)', async () => {
  const { m, fm } = await makeMap();
  fm.styleLayers = style.layers;
  const baseIds = style.layers.filter(isBaseLabelLayer).map((l: any) => l.id).sort();
  assert.deepEqual(baseIds, ['place-city', 'place-neighbourhood', 'poi-label', 'road-label']);

  await m.setLabelLanguage('en');
  assert.deepEqual(fm.layoutCalls.map((c: any) => c.id).sort(), baseIds, 'only base labels may change (not pin counts)');
  for (const c of fm.layoutCalls) {
    assert.equal(c.name, 'text-field');
    assert.deepEqual(c.value[1], ['get', 'name:en'], 'English must be preferred');
    assert.ok(JSON.stringify(c.value).includes('"name"'), 'must still fall back to the local name');
  }
  fm.layoutCalls.length = 0;
  await m.setLabelLanguage('ar');
  for (const c of fm.layoutCalls) assert.deepEqual(c.value[1], ['get', 'name:ar'], 'Arabic must be preferred');
});

test('route: the line goes to the route source under the pins, the camera fits it, null clears it', async () => {
  const { m, fm } = await makeMap();
  const ids = fm.layers.map((l: any) => l.id);
  assert.ok(ids.indexOf('route-line') < ids.indexOf('companies-pt'), 'route must be drawn under the pins');
  await m.setRoute([[31.2, 30.0], [31.21, 30.01], [31.22, 30.02]]);
  assert.equal(fm.sources.route.data.features[0].geometry.type, 'LineString');
  assert.equal(fm.camera.at(-1)[0], 'fitBounds');
  const n = fm.camera.length;
  await m.setRoute([[31.2, 30.0], [31.21, 30.01]], false);
  assert.equal(fm.camera.length, n, 'fit=false must not move the camera');
  await m.setRoute(null); assert.equal(fm.sources.route.data.features.length, 0);
  await m.setDestination([31.3, 30.1]);
  assert.deepEqual(fm.sources.destination.data.features[0].geometry.coordinates, [31.3, 30.1]);
  await m.setDestination(null); assert.equal(fm.sources.destination.data.features.length, 0);
});

test('events: onMapClick fires only for taps on empty map while origin picking is off', async () => {
  const got: any = {};
  const { m, fm } = await makeMap({ onMapClick: (p: number[]) => (got.p = p) });
  const ev = { point: { x: 1, y: 1 }, lngLat: { lng: 31.1, lat: 30.1 } };
  fm.queryRenderedFeatures = () => [{}];                 // the tap landed on a pin
  fm.emit('click', undefined, ev);
  assert.equal(got.p, undefined);
  fm.queryRenderedFeatures = () => [];                   // empty map
  fm.emit('click', undefined, ev);
  assert.deepEqual(got.p, [31.1, 30.1]);
  got.p = undefined; m.enableOriginPicking(true);
  fm.emit('click', undefined, ev);
  assert.equal(got.p, undefined, 'while picking the origin, the tap belongs to onOriginChange');
});

test('labels: "both" shows Arabic and English together, one line when they are identical', async () => {
  const { m, fm } = await makeMap();
  fm.styleLayers = style.layers;
  await m.setLabelLanguage('both');
  assert.ok(fm.layoutCalls.length > 0);
  for (const c of fm.layoutCalls) {
    const j = JSON.stringify(c.value);
    assert.equal(c.value[0], 'let');
    for (const k of ['name:ar', 'name:en', '"format"', '"case"']) assert.ok(j.includes(k), `missing ${k}`);
  }
});