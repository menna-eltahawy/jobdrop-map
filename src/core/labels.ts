export type LabelLanguage = 'ar' | 'en' | 'both';

const ar = (): any[] => ['coalesce', ['get', 'name:ar'], ['get', 'name']];
const en = (): any[] => ['coalesce', ['get', 'name:en'], ['get', 'name_en'], ['get', 'name:latin'], ['get', 'name']];

export function labelExpression(lang: LabelLanguage): any[] {
  if (lang === 'en') return en();
  if (lang === 'ar') return ar();
  return ['let', 'ar', ar(), 'en', en(),
    ['case', ['==', ['var', 'ar'], ['var', 'en']], ['var', 'ar'],
      ['format', ['var', 'ar'], {}, '\n', {}, ['var', 'en'], {}]]];
}

export function isBaseLabelLayer(l: any): boolean {
  return l.type === 'symbol' && !!l['source-layer'] && l.layout?.['text-field'] !== undefined;
}