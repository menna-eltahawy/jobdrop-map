import type { CSSProperties, ReactNode } from 'react';
import type { LngLat } from '../src/core/types';
import type { RouteResult, TravelMode } from './geoClient';
import { STR, errorMessage, type PageLang } from './i18n';

export const C = {
  cream: '#F4EBDA', sand: '#E6CBA8', line: '#E5D3B8', tan: '#E0AC72', brown: '#B5804F', dark: '#723E21', darkest: '#592D16',
  side: '#46210F', card: '#F8F0E1', panel: '#FBF5E8', muted: '#9A7A62', error: '#a33',
};
export const FONT = "'Cairo', 'Segoe UI', Tahoma, system-ui, sans-serif";

export const fmtMin = (sec: number) => Math.max(1, Math.round(sec / 60));
export const fmtKm = (m: number) => (m / 1000).toFixed(2);
export const fmtPoint = (p: LngLat) => `${p[1].toFixed(5)}, ${p[0].toFixed(5)}`;

export const topBtn = (bg: string): CSSProperties => ({
  cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, background: bg, color: '#fff',
  border: 'none', borderRadius: 9, padding: '8px 16px', whiteSpace: 'nowrap',
});
export const box: CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: 14, marginBottom: 12 };
export const listBtn = (active: boolean): CSSProperties => ({
  width: '100%', textAlign: 'start', cursor: 'pointer', fontFamily: 'inherit', padding: 10, borderRadius: 12,
  border: `1px solid ${C.darkest}`, background: active ? C.sand : '#fff', color: C.darkest,
});

// ---------------- layout shared by the applicant and the company pages ----------------
export interface NavItem { key: string; label: string; active: boolean; onClick: () => void }
interface ShellProps {
  lang: PageLang; setLang: (l: PageLang) => void;
  nav: NavItem[]; topBar: ReactNode; map: ReactNode; side: ReactNode; footer?: ReactNode;
}

function Logo() {
  return (
    <svg width="64" height="62" viewBox="0 0 64 62" aria-hidden="true" style={{ alignSelf: 'center', flexShrink: 0 }}>
      <path d="M12 22 C14 -1 50 -1 52 22 Z" fill={C.tan} />
      <path d="M12 22 L27 36 M52 22 L37 36 M32 22 L32 34" stroke={C.cream} strokeWidth="1.5" fill="none" />
      <rect x="26" y="33" width="12" height="11" rx="1.5" fill={C.brown} />
      <ellipse cx="32" cy="52" rx="21" ry="8" fill="none" stroke={C.cream} strokeWidth="2" />
      <text x="32" y="55.5" textAnchor="middle" fontSize="10" fontWeight="800" fill={C.cream}>H</text>
    </svg>
  );
}

export function Shell({ lang, setLang, nav, topBar, map, side, footer }: ShellProps) {
  const s = STR[lang];
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{ display: 'grid', gridTemplateColumns: '215px minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)', height: '100%', fontFamily: FONT, color: C.darkest, background: C.cream }}>
      <aside style={{ background: C.side, color: C.cream, display: 'flex', flexDirection: 'column', padding: '20px 14px 14px', gap: 6, minHeight: 0, overflow: 'auto' }}>
        <Logo />
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 16, paddingBottom: 18, marginBottom: 12, borderBottom: '1px solid #6B3A22' }}>{s.brand}</div>
        {nav.map((n) => (
          <button key={n.key} onClick={n.onClick}
            style={{ cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 11, padding: '12px 10px',
              background: n.active ? C.sand : 'transparent', color: n.active ? C.darkest : C.cream }}>
            {n.label}
          </button>))}
        <div style={{ flex: 1 }} />
        {footer && <div style={{ borderTop: '1px solid #6B3A22', paddingTop: 12, fontSize: 12, lineHeight: 1.7 }}>{footer}</div>}
      </aside>

      <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '9px 18px', borderBottom: `1px solid ${C.line}` }}>
          {topBar}
          <button onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')} style={{ ...topBtn(C.darkest), padding: '8px 12px' }}>{s.otherLang}</button>
        </header>
        <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gridTemplateRows: 'minmax(0, 1fr)', gap: 18, padding: '13px 16px' }}>
          <div style={{ minHeight: 0, border: `2px solid ${C.line}`, borderRadius: 16, overflow: 'hidden' }}>{map}</div>
          <section style={{ minHeight: 0, overflow: 'auto', background: C.panel, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16 }}>{side}</section>
        </div>
      </main>
    </div>
  );
}

// ---------------- small pieces ----------------
export const MODES: { key: TravelMode }[] = [{ key: 'car' }, { key: 'motorcycle' }, { key: 'walk' }];

export function ModeButtons({ lang, mode, onChange }: { lang: PageLang; mode: TravelMode; onChange: (m: TravelMode) => void }) {
  const s = STR[lang];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, background: C.sand, padding: 4, borderRadius: 10, margin: '12px 0' }}>
      {MODES.map((m) => (
        <button key={m.key} onClick={() => onChange(m.key)}
          style={{ cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 7, padding: '10px 4px',
            background: mode === m.key ? C.darkest : 'transparent', color: mode === m.key ? '#fff' : C.darkest }}>
          {s[m.key]}
        </button>))}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><div style={{ fontSize: 12, color: C.muted }}>{label}</div><div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div></div>;
}

export function RouteStats({ lang, loading, error, data }: { lang: PageLang; loading: boolean; error: unknown; data: RouteResult | null }) {
  const s = STR[lang];
  return (
    <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <Stat label={s.eta} value={data ? `${fmtMin(data.durationS)} ${s.minutes}` : '—'} />
        <Stat label={s.distance} value={data ? `${fmtKm(data.distanceM)} ${s.km}` : '—'} />
      </div>
      {loading && <small>{s.calculating}</small>}
      {data?.estimated && <div><small>{s.estimated}</small></div>}
      {!!error && <div style={{ color: C.error }}>{errorMessage(lang, error)}</div>}
    </div>
  );
}

export const Row = ({ k, v }: { k: string; v: ReactNode }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '8px 0', borderBottom: `1px dashed ${C.line}`, fontSize: 13 }}>
    <span style={{ color: C.muted }}>{k}</span><b style={{ textAlign: 'end' }}>{v}</b>
  </div>
);