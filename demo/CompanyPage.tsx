import { useEffect, useMemo, useState } from 'react';
import { JobDropMap } from '../src/react/JobDropMap';
import type { LngLat } from '../src/core/types';
import type { AreaHit, CompanyHit } from './geoClient';
import { getCompanyLocation, searchApplicantAreas } from './geoClient';
import { STR, errorMessage, type PageLang } from './i18n';
import { MAP_CONFIG } from './jobs';
import { C, Shell, box, listBtn } from './ui';

interface Group { nameAr: string; nameEn: string; center: LngLat; count: number; cats: Map<string, number> }

export function CompanyPage() {
  const [lang, setLang] = useState<PageLang>('ar');
  const s = STR[lang];

  const [companyId, setCompanyId] = useState('comp-nile');
  const [locationId, setLocationId] = useState('loc-nile-hq');
  const [radiusText, setRadiusText] = useState('3');

  const [site, setSite] = useState<CompanyHit | null>(null);
  const [siteErr, setSiteErr] = useState<unknown>(null);
  const [areas, setAreas] = useState<AreaHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [areasErr, setAreasErr] = useState<unknown>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);   // the selected governorate (its Arabic name)
  const [fly, setFly] = useState<{ center: LngLat; zoom: number } | undefined>(undefined);

  const radius = Number(radiusText);
  const radiusOk = radiusText.trim() !== '' && Number.isFinite(radius) && radius > 0;

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // the company's own location
  useEffect(() => {
    const ac = new AbortController();
    const t = setTimeout(() => {
      getCompanyLocation(companyId, locationId, ac.signal)
        .then((p) => { setSite(p); setSiteErr(null); })
        .catch((e) => { if (!ac.signal.aborted) { setSite(null); setSiteErr(e); } });
    }, 400);
    return () => { clearTimeout(t); ac.abort(); };
  }, [companyId, locationId]);

  useEffect(() => {
    if (!radiusOk) { setAreas([]); return; }
    const ac = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      searchApplicantAreas(companyId, locationId, radius, ac.signal)
        .then((r) => { setAreas(r); setAreasErr(null); setActiveKey(null); })
        .catch((e) => { if (!ac.signal.aborted) { setAreas([]); setAreasErr(e); } })
        .finally(() => { if (!ac.signal.aborted) setSearching(false); });
    }, 400);
    return () => { clearTimeout(t); ac.abort(); };
  }, [companyId, locationId, radius, radiusOk]);

  const groups = useMemo(() => {
    const m = new Map<string, Group>();
    for (const a of areas) {
      const g = m.get(a.areaName)
        ?? { nameAr: a.areaName, nameEn: a.areaNameEn || a.areaName, center: a.areaCenter, count: 0, cats: new Map<string, number>() };
      const n = a.count ?? 1;
      g.count += n;
      g.cats.set(a.category, (g.cats.get(a.category) ?? 0) + n);
      m.set(a.areaName, g);
    }
    return [...m.values()].sort((x, y) => y.count - x.count);
  }, [areas]);

  const total = areas.reduce((n, a) => n + (a.count ?? 1), 0);
  const circle = useMemo(
    () => (site ? { center: site.lngLat, radiusKm: radiusOk ? radius : 0.001 } : null),
    [site, radius, radiusOk]);
  const sep = lang === 'ar' ? '، ' : ', ';

  const side = (
    <>
      <div style={box}>
        <label style={{ fontSize: 13 }}>{s.companyId}: <input value={companyId} onChange={(e) => setCompanyId(e.target.value.trim())} style={{ width: 110 }} /></label><br />
        <label style={{ fontSize: 13 }}>{s.locationId}: <input value={locationId} onChange={(e) => setLocationId(e.target.value.trim())} style={{ width: 110 }} /></label><br />
        <label style={{ fontSize: 13 }}>{s.radius}: <input type="number" min="0" step="any" value={radiusText}
          onChange={(e) => setRadiusText(e.target.value)} style={{ width: 70 }} /></label>
        {!!siteErr && <div style={{ color: C.error }}>{errorMessage(lang, siteErr)}</div>}
      </div>

      <h4 style={{ marginBottom: 6 }}>{s.areasNear}</h4>
      {searching && <div><small>{s.searching}</small></div>}
      {!!areasErr && <div style={{ color: C.error }}>{errorMessage(lang, areasErr)}</div>}
      {!searching && !areasErr && radiusOk && areas.length === 0 && <div><small>{s.noAreas}</small></div>}
      {areas.length > 0 && <div style={{ fontSize: 13, marginBottom: 6 }}>{s.totalApplicants}: <b>{total}</b></div>}
      <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {groups.map((g) => (
          <li key={g.nameAr}>
            <button onClick={() => { setActiveKey(g.nameAr); setFly({ center: g.center, zoom: 9 }); }} style={listBtn(activeKey === g.nameAr)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <b>{lang === 'ar' ? g.nameAr : g.nameEn}</b><span>{g.count} {s.applicants}</span>
              </div>
              <small>{s.category}: {[...g.cats.entries()].map(([c, n]) => `${c} (${n})`).join(sep)}</small>
            </button>
          </li>))}
      </ol>
      <p style={{ fontSize: 12, opacity: 0.8 }}>{s.privacy}</p>
    </>
  );

  return (
    <Shell lang={lang} setLang={setLang}
      nav={[{ key: 'map', label: s.navCompanyMap, active: true, onClick: () => undefined }]}
      topBar={
        <div style={{ flex: 1, minWidth: 220, fontWeight: 700, fontSize: 15 }}>
          {s.companyLocation}: {site?.name ?? '—'} — {s.companyHint}
        </div>}
      map={
        <JobDropMap config={MAP_CONFIG} labelLanguage={lang}
          candidateAreas={areas} fitToAreas
          origin={site?.lngLat ?? null} originLabel={site?.name}
          searchCircle={circle} flyTo={fly}
          onSelectArea={(id) => { const a = areas.find((x) => x.id === id); if (a) setActiveKey(a.areaName); }} />}
      side={side}
      footer={<><b style={{ color: C.tan }}>{s.companyLocation}</b><div>{site?.name ?? '—'}</div><div>{s.privacy}</div></>} />
  );
}