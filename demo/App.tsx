import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { JobDropMap } from '../src/react/JobDropMap';
import type { CandidateArea, LngLat, MapConfig } from '../src/core/types';
import type { LabelLanguage } from '../src/core/labels';
import { Place, searchPlaces } from './geocoder';
import {
  CompanyHit, CompanyKind, ApplicantState, errorText, getApplicantState, getCompanyLocation,
  saveApplicantProfile, saveCompanyLocation, saveCurrentLocation, saveResidence,
  searchApplicantAreas, searchCompanies, searchCompaniesFromApplicant,
} from './geoClient';

const DEFAULT_CENTER: LngLat = [31.2001, 30.0131];

const CONFIG: MapConfig = {
  styleUrl: '/jobdrop-style.json',
  center: DEFAULT_CENTER, zoom: 12,
  // Self-host this file in production. Needed for correct Arabic letter joining on the map.
  rtlPluginUrl: 'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
};

type Tab = 'search' | 'applicant' | 'company';
type Source = 'residence' | 'current' | 'map';
const KIND_LABEL: Record<string, string> = { hq: 'HQ', work_site: 'Work site', hr: 'HR' };
const box: CSSProperties = { border: '1px solid #E0AC72', borderRadius: 6, padding: 8, marginTop: 8, background: '#fffdf7' };
const overlay: CSSProperties = { position: 'absolute', zIndex: 2, background: '#fff8ea', border: '1px solid #E0AC72', borderRadius: 6, padding: 6 };

export function App() {
  const [tab, setTab] = useState<Tab>('search');
  const [lang, setLang] = useState<LabelLanguage>('ar');
  const [fly, setFly] = useState<{ center: LngLat; zoom?: number } | undefined>();

  // ---- place search box ----
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Place[]>([]);
  const [hitsMsg, setHitsMsg] = useState('');
  const [finding, setFinding] = useState(false);

  // ---- search state ----
  const [mode, setMode] = useState<'applicant' | 'company'>('applicant');
  const [source, setSource] = useState<Source>('map');
  const [origin, setOrigin] = useState<LngLat>(DEFAULT_CENTER);
  const [radiusText, setRadiusText] = useState('3');
  const [searchApplicantId, setSearchApplicantId] = useState('ap-200');
  const [companyId, setCompanyId] = useState('comp-nile');
  const [locationId, setLocationId] = useState('loc-nile-hq');
  const [pick, setPick] = useState(false);
  const [selected, setSelected] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyHit[]>([]);
  const [areas, setAreas] = useState<CandidateArea[]>([]);

  // ---- registration state ----
  const [picked, setPicked] = useState<LngLat | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [regApplicantId, setRegApplicantId] = useState('ap-200');
  const [regCategory, setRegCategory] = useState('tech');
  const [regDiscoverable, setRegDiscoverable] = useState(true);
  const [state, setState] = useState<ApplicantState | null>(null);
  const [regCompanyId, setRegCompanyId] = useState('comp-test');
  const [regLocationId, setRegLocationId] = useState('loc-test-1');
  const [regKind, setRegKind] = useState<CompanyKind>('work_site');
  const [regName, setRegName] = useState('Test Company');
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const radius = Number(radiusText);
  const radiusOk = radiusText.trim() !== '' && Number.isFinite(radius) && radius > 0;
  const storedSource = mode === 'applicant' && source !== 'map';
  const searching = tab === 'search';

  useEffect(() => {
    fetch('/symbols/categories.json').then((r) => r.json()).then((j) => setCats(Object.keys(j.categories ?? {}))).catch(() => setCats([]));
  }, []);

  useEffect(() => {
    if (!searching || mode !== 'applicant' || !radiusOk) { setCompanies([]); return; }
    const ac = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      const req = source === 'map'
        ? searchCompanies(origin, radius, ac.signal)
        : searchCompaniesFromApplicant(searchApplicantId, source, radius, ac.signal);
      req.then((r) => { setCompanies([...r].sort((a, b) => a.distanceM - b.distanceM)); setError(''); })
        .catch((e) => { if (!ac.signal.aborted) { setCompanies([]); setError(errorText(e)); } })
        .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    }, 300);
    return () => { clearTimeout(t); ac.abort(); };
  }, [searching, mode, source, searchApplicantId, source === 'map' ? origin : null, radius, radiusOk]);

  useEffect(() => {
    if (!searching || mode !== 'company') return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      getCompanyLocation(companyId, locationId, ac.signal)
        .then((p) => { setOrigin(p.lngLat); })
        .catch((e) => { if (!ac.signal.aborted) { setAreas([]); setError(errorText(e)); } });
    }, 400);
    return () => { clearTimeout(t); ac.abort(); };
  }, [searching, mode, companyId, locationId]);

  useEffect(() => {
    if (!searching || mode !== 'company' || !radiusOk) { setAreas([]); return; }
    const ac = new AbortController();
    const t = setTimeout(() => {
      setLoading(true);
      searchApplicantAreas(companyId, locationId, radius, ac.signal)
        .then((r) => { setAreas(r); setError(''); })
        .catch((e) => { if (!ac.signal.aborted) { setAreas([]); setError(errorText(e)); } })
        .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    }, 400);
    return () => { clearTimeout(t); ac.abort(); };
  }, [searching, mode, companyId, locationId, radius, radiusOk]);

  const circle = useMemo(
    () => (searching && !storedSource ? { center: origin, radiusKm: radiusOk ? radius : 0.001 } : null),
    [searching, storedSource, origin, radius, radiusOk]);
  const mapOrigin = !searching ? picked : storedSource ? null : origin;
  const total = mode === 'applicant' ? companies.length : areas.reduce((s, a) => s + (a.count ?? 1), 0);

  const gps = (onOk: (p: LngLat) => void) => {
    if (!navigator.geolocation) return setMsg('Location is not supported by this browser');
    navigator.geolocation.getCurrentPosition(
      (p) => { onOk([p.coords.longitude, p.coords.latitude]); setMsg(''); },
      (e) => setMsg(e.code === 1 ? 'Location permission denied' : 'Could not get your location'),
      { enableHighAccuracy: true, timeout: 10000 });
  };

  const run = async (fn: () => Promise<unknown>, okText: string) => {
    setBusy(true);
    try { await fn(); setStatus({ ok: true, text: okText }); return true; }
    catch (e) { setStatus({ ok: false, text: errorText(e) }); return false; }
    finally { setBusy(false); }
  };
  const refreshState = async () => {
    try { setState(await getApplicantState(regApplicantId)); } catch { setState(null); }
  };

  const findPlace = async () => {
    const text = q.trim();
    if (text.length < 2) return;
    setFinding(true); setHitsMsg('');
    try {
      const r = await searchPlaces(text);
      setHits(r);
      if (!r.length) setHitsMsg('No results');
    } catch { setHits([]); setHitsMsg('Place search is unavailable right now'); }
    finally { setFinding(false); }
  };
  const choosePlace = (p: Place) => {
    setHits([]); setHitsMsg(''); setQ(p.name.split(',')[0]);
    if (searching && mode === 'applicant' && source === 'map') { setOrigin(p.lngLat); }  // circle fits the view
    else setFly({ center: p.lngLat, zoom: 14 });
  };

  const changeTab = (t: Tab) => { setTab(t); setStatus(null); setMsg(''); setError(''); setSelected(''); setPick(false); };
  const pill = (t: Tab, label: string) => (
    <button key={t} onClick={() => changeTab(t)} style={{ fontWeight: tab === t ? 700 : 400, background: tab === t ? '#E0AC72' : '#fff', border: '1px solid #E0AC72', padding: '4px 8px', marginInlineEnd: 4 }}>{label}</button>
  );
  const langBtn = (l: LabelLanguage, label: string) => (
    <button key={l} onClick={() => setLang(l)} style={{ fontWeight: lang === l ? 700 : 400, background: lang === l ? '#E0AC72' : '#fff', border: '1px solid #E0AC72', padding: '4px 8px' }}>{label}</button>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', height: '100%' }}>
      <aside style={{ padding: 16, background: '#fff8ea', borderInlineEnd: '1px solid #E0AC72', overflow: 'auto', lineHeight: 1.9 }}>
        <h3 style={{ marginTop: 0 }}>Job Drop</h3>
        <div>{pill('search', 'Search')}{pill('applicant', 'Applicant')}{pill('company', 'Company')}</div>

        {/* ================= SEARCH ================= */}
        {tab === 'search' && (
          <>
            <label>Mode: <select value={mode} onChange={(e) => { setMode(e.target.value as 'applicant' | 'company'); setError(''); setSelected(''); }}>
              <option value="applicant">Applicant (find companies)</option><option value="company">Company (find applicants)</option></select></label><br />

            {mode === 'applicant' ? (
              <>
                <label>Search from: <select value={source} onChange={(e) => { setSource(e.target.value as Source); setError(''); }}>
                  <option value="map">Map point</option>
                  <option value="residence">Saved residence</option>
                  <option value="current">Saved current location</option></select></label><br />
                {source === 'map' ? (
                  <>
                    <small>Select a starting point by clicking on the map, searching for a place, or using GPS.</small><br />
                    <button onClick={() => gps((p) => setOrigin(p))}>Use my GPS location</button>{' '}
                    <label><input type="checkbox" checked={pick} onChange={(e) => setPick(e.target.checked)} /> Pick on map</label><br />
                  </>
                ) : (
                  <label>Applicant ID: <input value={searchApplicantId} onChange={(e) => setSearchApplicantId(e.target.value.trim())} style={{ width: 120 }} /></label>
                )}
              </>
            ) : (
              <>
                <label>Company ID: <input value={companyId} onChange={(e) => setCompanyId(e.target.value.trim())} style={{ width: 130 }} /></label><br />
                <label>Location ID: <input value={locationId} onChange={(e) => setLocationId(e.target.value.trim())} style={{ width: 130 }} /></label><br />
              </>
            )}

            <label>Radius (km): <input type="number" min="0" step="any" value={radiusText}
              onChange={(e) => setRadiusText(e.target.value)} style={{ width: 80 }} /></label>
            {!radiusOk && <div style={{ color: '#a33' }}>Enter a number greater than 0</div>}

            <p><b>Results: {total}</b> {loading && <small>Searching…</small>}</p>
            {error && <p style={{ color: '#a33' }}>{error}</p>}
            {msg && <p style={{ color: '#a33' }}>{msg}</p>}
            {selected && <p>{selected}</p>}

            {mode === 'applicant' && companies.length > 0 && (
              <div style={box}><b>Companies (nearest first)</b>
                <ol style={{ margin: 0, paddingInlineStart: 20 }}>
                  {companies.map((c) => <li key={c.id}>{c.name} – {KIND_LABEL[c.locationType ?? ''] ?? ''} – {(c.distanceM / 1000).toFixed(2)} km</li>)}
                </ol></div>
            )}
            {mode === 'company' && areas.length > 0 && (
              <div style={box}><b>Applicant areas</b>
                <ol style={{ margin: 0, paddingInlineStart: 20 }}>
                  {areas.map((a) => <li key={a.id}>{a.areaName} – {a.category} ({a.count})</li>)}
                </ol></div>
            )}
          </>
        )}

        {/* ================= REGISTER APPLICANT ================= */}
        {tab === 'applicant' && (
          <>
            <label>Applicant ID: <input value={regApplicantId} onChange={(e) => { setRegApplicantId(e.target.value.trim()); setState(null); }} style={{ width: 120 }} /></label><br />
            <label>Category: <select value={regCategory} onChange={(e) => setRegCategory(e.target.value)}>
              <option value="">(none)</option>{cats.map((c) => <option key={c}>{c}</option>)}</select></label><br />
            <label><input type="checkbox" checked={regDiscoverable} onChange={(e) => setRegDiscoverable(e.target.checked)} /> Visible to companies (area only)</label><br />
            <button disabled={busy || !regApplicantId} onClick={async () => { if (await run(() => saveApplicantProfile(regApplicantId, regCategory || null, regDiscoverable), 'Profile saved')) refreshState(); }}>1) Save profile</button>

            <div style={box}>
              <b>2) Click the map</b><br />
              {picked ? <small>{picked[1].toFixed(5)}, {picked[0].toFixed(5)}</small> : <small>No point selected</small>}<br />
              <button onClick={() => gps(setPicked)}>Use my GPS location</button>
            </div>
            <button disabled={busy || !picked || !regApplicantId} onClick={async () => { if (await run(() => saveResidence(regApplicantId, picked!), 'Residence saved')) refreshState(); }}>3a) Save as residence</button>{' '}
            <button disabled={busy || !picked || !regApplicantId} onClick={async () => { if (await run(() => saveCurrentLocation(regApplicantId, picked!), 'Current location saved')) refreshState(); }}>3b) Save as current location</button>
            <br /><button onClick={refreshState} style={{ marginTop: 6 }}>Show status</button>

            {state && (
              <div style={box}>
                <b>{state.id}</b><br />
                Category: {state.category ?? '—'}<br />
                Visible to companies: {state.discoverable ? 'Yes' : 'No'}<br />
                Residence: {state.hasResidence ? 'Saved' : 'Not saved'}<br />
                Current location: {state.hasCurrentLocation ? `Saved (${state.currentLocationUpdatedAt ?? ''})` : 'Not saved'}
              </div>
            )}
            {status && <p style={{ color: status.ok ? '#2a6b2a' : '#a33' }}>{status.text}</p>}
            {msg && <p style={{ color: '#a33' }}>{msg}</p>}
          </>
        )}

        {/* ================= REGISTER COMPANY ================= */}
        {tab === 'company' && (
          <>
            <label>Company ID: <input value={regCompanyId} onChange={(e) => setRegCompanyId(e.target.value.trim())} style={{ width: 120 }} /></label><br />
            <label>Location ID: <input value={regLocationId} onChange={(e) => setRegLocationId(e.target.value.trim())} style={{ width: 120 }} /></label><br />
            <label>Type: <select value={regKind} onChange={(e) => setRegKind(e.target.value as CompanyKind)}>
              <option value="hq">HQ</option><option value="work_site">Work site</option><option value="hr">HR</option></select></label><br />
            <label>Name: <input value={regName} onChange={(e) => setRegName(e.target.value)} style={{ width: 170 }} /></label>
            <div style={box}>
              {picked ? <small>{picked[1].toFixed(5)}, {picked[0].toFixed(5)}</small> : <small>Click the map to set the location</small>}<br />
              <button onClick={() => gps(setPicked)}>Use my GPS location</button>
            </div>
            <button disabled={busy || !picked || !regCompanyId || !regLocationId} onClick={() => run(() => saveCompanyLocation(regCompanyId, regLocationId, regKind, regName, picked!), 'Location saved')}>Save location</button>
            {status && <p style={{ color: status.ok ? '#2a6b2a' : '#a33' }}>{status.text}</p>}
            {msg && <p style={{ color: '#a33' }}>{msg}</p>}
          </>
        )}
      </aside>

      <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
        <JobDropMap config={CONFIG}
          companies={searching && mode === 'applicant' ? companies : []}
          candidateAreas={searching && mode === 'company' ? areas : []}
          origin={mapOrigin} searchCircle={circle}
          pickOrigin={!searching || (mode === 'applicant' && source === 'map' && pick)}
          labelLanguage={lang} flyTo={fly}
          onSelectCompany={(id) => setSelected('Company: ' + (companies.find((c) => c.id === id)?.name ?? id))}
          onSelectArea={(id) => { const a = areas.find((x) => x.id === id); setSelected(a ? `${a.areaName} – ${a.category} (${a.count})` : id); }}
          onOriginChange={(p) => { if (searching) { setOrigin(p); setPick(false); } else { setPicked(p); } }} />

        <div style={{ ...overlay, top: 10, right: 10, width: 300 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <input value={q} placeholder="Search for a place" onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') findPlace(); }} style={{ flex: 1, minWidth: 0 }} />
            <button onClick={findPlace} disabled={finding}>{finding ? '…' : 'Go'}</button>
          </div>
          {hitsMsg && <div style={{ color: '#a33' }}>{hitsMsg}</div>}
          {hits.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '6px 0 0', padding: 0, maxHeight: 220, overflow: 'auto' }}>
              {hits.map((h, i) => (
                <li key={i} onClick={() => choosePlace(h)} style={{ cursor: 'pointer', padding: '4px 2px', borderTop: i ? '1px solid #eadbc2' : 'none', fontSize: 13 }}>{h.name}</li>))}
            </ul>)}
        </div>

        <div style={{ ...overlay, bottom: 28, left: 10, display: 'flex', gap: 4 }}>
          {langBtn('ar', 'Arabic names')}{langBtn('en', 'English names')}
        </div>
      </div>
    </div>
  );
}