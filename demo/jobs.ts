import type { LngLat, MapConfig } from '../src/core/types';

export type L = { ar: string; en: string };

export interface JobInfo { jobNo: string; title: L; address: L; shortAddress: L; universities: L; hrSlaHours: number; postedAt: string }

export const JOBS: Record<string, JobInfo> = {
  'comp-nile': {
    jobNo: 'DK-101',
    title: { ar: 'مهندس نظم معلومات جغرافية (GIS Specialist)', en: 'GIS Specialist' },
    address: { ar: '٣ شارع جزيرة العرب، المهندسين', en: '3 Gazirat El-Arab St, Mohandessin' },
    universities: { ar: 'جامعة القاهرة، ITI، عين شمس', en: 'Cairo University, ITI, Ain Shams' },
    shortAddress: { ar: '٣ ش جزيرة العرب', en: '3 Gazirat El-Arab St' },
    hrSlaHours: 48,
    postedAt: '2026-11-22',
  },
};

export const jobFor = (companyId: string): JobInfo => JOBS[companyId] ?? {
  jobNo: 'DK-000',
  title: { ar: 'وظيفة متاحة', en: 'Open position' },
  address: { ar: '—', en: '—' },
  shortAddress: { ar: '—', en: '—' },
  universities: { ar: '—', en: '—' },
  hrSlaHours: 48,
  postedAt: '2026-11-20',
};

export interface HomeLocation { point: LngLat; address: L }

export const DEMO_HOME: HomeLocation = {
  point: [31.2005, 30.06],
  address: { ar: '32 شارع محمد علي العسيري، أرض اللواء', en: '32 Mohamed Ali El-Osairy St, Ard El-Lewa' },
};

export const NAV_AREAS: { key: string; center: LngLat; label: L }[] = [
  { key: 'dokki', center: [31.2079, 30.0476], label: { ar: 'الدقي والعجوزة', en: 'Dokki & Agouza' } },
  { key: 'smart', center: [31.0171, 30.0713], label: { ar: 'القرية الذكية', en: 'Smart Village' } },
  { key: 'fifth', center: [31.4913, 30.0074], label: { ar: 'التجمع الخامس', en: 'Fifth Settlement' } },
];

export const MAP_CONFIG: MapConfig = {
  styleUrl: '/jobdrop-style.json',
  center: [31.2357, 30.0444], zoom: 14,
  rtlPluginUrl: 'https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js',
};