import { useEffect, useMemo, useState } from 'react';
import { JobDropMap } from '../src/react/JobDropMap';
import type { LngLat } from '../src/core/types';
import type { CompanyHit, RouteResult, TravelMode } from './geoClient';
import { getRoute, searchCompanies } from './geoClient';
import { STR, errorMessage, type PageLang } from './i18n';
import { DEMO_HOME, MAP_CONFIG, NAV_AREAS, jobFor, type HomeLocation } from './jobs';
import { DropPopup } from './DropPopup';
import { usePlaceName } from './places';
import { C, ModeButtons, NavItem, Row, RouteStats, Shell, box, fmtKm, listBtn, topBtn } from './ui';

export function ApplicantPage({ home = DEMO_HOME }: { home?: HomeLocation | null }) {
  const [lang, setLang] = useState<PageLang>('ar');
  const s = STR[lang];

  const homeLng = home?.point[0], homeLat = home?.point[1];
  const homePoint = useMemo<LngLat | null>(
    () => (homeLng === undefined || homeLat === undefined ? null : [homeLng, homeLat]), [homeLng, homeLat]);

  const [start, setStart] = useState<LngLat | null>(homePoint);
  const [fromGps, setFromGps] = useState(false);
  const [gpsMsg, setGpsMsg] = useState('');
  const [navKey, setNavKey] = useState('map');
  const [searchCenter, setSearchCenter] = useState<LngLat>(homePoint ?? MAP_CONFIG.center);
  const [radiusText, setRadiusText] = useState('3');

  const [companies, setCompanies] = useState<CompanyHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState<unknown>(null);

  const [picked, setPicked] = useState<CompanyHit | null>(null);
  const [customDest, setCustomDest] = useState<LngLat | null>(null);
  const [mode, setMode] = useState<TravelMode>('walk');
  const [routeData, setRouteData] = useState<RouteResult | null>(null);
  const [routing, setRouting] = useState(false);
  const [routeErr, setRouteErr] = useState<unknown>(null);

  const [popupOpen, setPopupOpen] = useState(false);

  const radius = Number(radiusText);
  const radiusOk = radiusText.trim() !== '' && Number.isFinite(radius) && radius > 0;
  const dest: LngLat | null = picked?.lngLat ?? customDest;
  const job = picked ? jobFor(picked.companyId) : null;
  const mapConfig = useMemo(() => ({ ...MAP_CONFIG, center: homePoint ?? MAP_CONFIG.center }), [homePoint]);

  const startPlace = usePlaceName(fromGps ? start : null, lang);
  const destPlace = usePlaceName(picked ? null : customDest, lang);
  const destTitle = picked ? picked.name : (destPlace ?? s.customPoint);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  useEffect(() => {
    if (fromGps) return;
    setStart(homePoint);
    setSearchCenter(homePoint ?? MAP_CONFIG.center);
  }, [homePoint]);

  useEffect(() => {
    if (!radiusOk) { setCompanies([]); return; }
    const ac = new AbortController();
    const t = setTimeout(() => {
      setSearching(true);
      searchCompanies(searchCenter, radius, ac.signal)
        .then((r) => { setCompanies([...r].sort((a, b) => a.distanceM - b.distanceM)); setSearchErr(null); })
        .catch((e) => { if (!ac.signal.aborted) { setCompanies([]); setSearchErr(e); } })
        .finally(() => { if (!ac.signal.aborted) setSearching(false); });
    }, 300);
    return () => { clearTimeout(t); ac.abort(); };
  }, [searchCenter, radius, radiusOk]);

  useEffect(() => {
    setRouteData(null); setRouteErr(null);          
    if (!dest || !start) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      setRouting(true);
      getRoute(start, dest, mode, ac.signal)
        .then((r) => { setRouteData(r); setRouteErr(null); })
        .catch((e) => { if (!ac.signal.aborted) { setRouteData(null); setRouteErr(e); } })
        .finally(() => { if (!ac.signal.aborted) setRouting(false); });
    }, 300);
    return () => { clearTimeout(t); ac.abort(); };
  }, [start, dest, mode]);

  const circle = useMemo(() => ({ center: searchCenter, radiusKm: radiusOk ? radius : 0.001 }), [searchCenter, radius, radiusOk]);

  const goNav = (key: string) => {
    setNavKey(key); setPicked(null); setCustomDest(null); setPopupOpen(false);
    setSearchCenter(NAV_AREAS.find((a) => a.key === key)?.center ?? start ?? MAP_CONFIG.center);
  };
  const backHome = () => {
    if (!homePoint) return;
    setStart(homePoint); setFromGps(false); setGpsMsg(''); setNavKey('map'); setSearchCenter(homePoint);
  };
  const locateMe = () => {
    if (!navigator.geolocation) return setGpsMsg(s.gpsUnsupported);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pt: LngLat = [p.coords.longitude, p.coords.latitude];
        setStart(pt); setFromGps(true); setGpsMsg(''); setNavKey('map'); setSearchCenter(pt);
      },
      (e) => setGpsMsg(e.code === 1 ? s.gpsDenied : s.gpsFailed),
      { enableHighAccuracy: true, timeout: 10000 });
  };
  const choose = (c: CompanyHit) => { setPicked(c); setCustomDest(null); setPopupOpen(true); };

  // GPS start: the district / governorate (never the coordinates); until it is found: "Your location (GPS)"
  const startText = fromGps && start ? (startPlace ?? s.gpsLocation) : home ? home.address[lang] : s.noStart;
  const nav: NavItem[] = [
    { key: 'map', label: s.navMap, active: navKey === 'map', onClick: () => goNav('map') },
    ...NAV_AREAS.map((a) => ({ key: a.key, label: a.label[lang], active: navKey === a.key, onClick: () => goNav(a.key) })),
  ];

  const side = (
    <>
      {!dest && <div style={box}>{s.pickPrompt}</div>}

      {dest && (
        <>
          <div style={box}>
            {picked && job && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <small style={{ fontWeight: 700 }}>{s.job} #{job.jobNo}</small>
                <span style={{ background: '#DDEBD5', color: '#2a6b2a', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{s.open}</span>
              </div>)}
            <h3 style={{ margin: '8px 0 4px' }}>{destTitle}</h3>
            {picked && job && (<><div style={{ color: C.dark, fontWeight: 700, fontSize: 14 }}>{job.title[lang]}</div><small>{job.address[lang]}</small></>)}
            <ModeButtons lang={lang} mode={mode} onChange={setMode} />
            {start
              ? <RouteStats lang={lang} loading={routing} error={routeErr} data={routeData} />
              : <div style={{ color: C.error, fontSize: 13 }}>{s.needStart}</div>}
          </div>
          <Row k={s.from} v={startText} />
          <Row k={s.to} v={picked && job ? job.shortAddress[lang] : (destPlace ?? s.customPoint)} />
          {picked && job && <Row k={s.universities} v={job.universities[lang]} />}
          {picked && job && <Row k={s.sla} v={`${job.hrSlaHours} ${s.hours} (SLA)`} />}
          {routeData && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>{routeData.attribution}</div>}
        </>
      )}

      <h4 style={{ marginBottom: 6 }}>{s.companiesOnMap}</h4>
      <label style={{ fontSize: 13 }}>{s.radius}: <input type="number" min="0" step="any" value={radiusText}
        onChange={(e) => setRadiusText(e.target.value)} style={{ width: 70 }} /></label>
      {searching && <div><small>{s.searching}</small></div>}
      {!!searchErr && <div style={{ color: C.error }}>{errorMessage(lang, searchErr)}</div>}
      {!searching && !searchErr && radiusOk && companies.length === 0 && <div><small>{s.noCompanies}</small></div>}
      <ol style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {companies.map((c) => (
          <li key={c.id}>
            <button onClick={() => choose(c)} style={listBtn(picked?.id === c.id)}>
              <b>{c.name}</b><br />
              <small>{c.locationType ? s[c.locationType] : ''} · {fmtKm(c.distanceM)} {s.km}</small>
            </button>
          </li>))}
      </ol>
    </>
  );

  return (
    <Shell lang={lang} setLang={setLang} nav={nav}
      topBar={<>
        <div style={{ flex: 1, minWidth: 220, fontWeight: 700, fontSize: 15 }}>
          {s.startPoint}: {startText} — {s.startHint}
          {gpsMsg && <span style={{ color: C.error }}> · {gpsMsg}</span>}
        </div>
        {home && <button onClick={backHome} style={topBtn(C.brown)}>{s.backHome}</button>}
        <button onClick={locateMe} style={topBtn(C.dark)}>{s.gps}</button>
      </>}
      map={
        <JobDropMap config={mapConfig} labelLanguage={lang}
          companies={companies} origin={start} originLabel={start ? s.yourLocation : undefined} destination={dest}
          route={routeData?.geometry ?? null}
          searchCircle={dest ? null : circle}
          popup={popupOpen && dest ? {
            lngLat: dest,
            content: <DropPopup lang={lang} title={destTitle} subtitle={job?.title[lang]} postedAt={job?.postedAt}
              from={start} to={dest} mode={mode} loading={routing} error={routeErr} data={routeData} />,
          } : null}
          onPopupClose={() => setPopupOpen(false)}
          onSelectCompany={(id) => { const c = companies.find((x) => x.id === id); if (c) choose(c); }}
          onMapClick={(p) => { setPicked(null); setCustomDest(p); setPopupOpen(true); }} />}
      side={side}
      footer={<>
        <b style={{ color: C.tan }}>{s.pinnedTitle}</b>
        <div>{startText}</div>
        <div>• {s.footer1}</div>
        <div>• {s.footer2}</div>
      </>} />
  );
}