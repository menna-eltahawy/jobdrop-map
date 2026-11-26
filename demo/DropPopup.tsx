import type { LngLat } from '../src/core/types';
import type { RouteResult, TravelMode } from './geoClient';
import { googleDirectionsUrl } from './gmaps';
import { STR, errorMessage, type PageLang } from './i18n';
import { C, FONT, fmtKm, fmtMin } from './ui';

function postedText(lang: PageLang, isoDay: string) {
  const [y, m, d] = isoDay.split('-').map(Number);
  const day = new Date(y, m - 1, d);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const date = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(day);
  const ago = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.min(0, diff), 'day');
  return `${date} (${ago})`;
}

interface Props {
  lang: PageLang; title: string; subtitle?: string; postedAt?: string;
  from: LngLat | null; to: LngLat; mode: TravelMode;
  loading: boolean; error: unknown; data: RouteResult | null;
}

export function DropPopup({ lang, title, subtitle, postedAt, from, to, mode, loading, error, data }: Props) {
  const s = STR[lang];
  return (
    <div dir={lang === 'ar' ? 'rtl' : 'ltr'} style={{ fontFamily: FONT, color: C.darkest, width: 250 }}>
      <div style={{ fontWeight: 800, fontSize: 15, paddingInlineEnd: 18 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13 }}>{subtitle}</div>}
      {postedAt && (
        <div style={{ fontSize: 12, marginTop: 8, background: C.sand, borderRadius: 8, padding: '6px 8px' }}>
          {s.posted}:<br /><b>{postedText(lang, postedAt)}</b>
        </div>)}
      <div style={{ fontSize: 13, fontWeight: 700, margin: '8px 0' }}>
        {s[mode]}: {data ? `${fmtMin(data.durationS)} ${s.minutes} · ${fmtKm(data.distanceM)} ${s.km}` : loading ? s.calculating : from ? '—' : s.needStart}
        {!!error && <div style={{ color: C.error }}>{errorMessage(lang, error)}</div>}
      </div>
      <a href={googleDirectionsUrl(from, to, mode)} target="_blank" rel="noopener noreferrer"
        style={{ display: 'block', textAlign: 'center', background: C.darkest, color: '#fff', borderRadius: 8, padding: '8px 10px', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
        {s.directions}
      </a>
    </div>
  );
}