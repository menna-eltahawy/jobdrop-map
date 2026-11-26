export interface SymbolConfig {
  _default: string;                       
  _company: string;                       
  _origin: string;                        
  categories: Record<string, string>;     
}
export const imageName = (path: string) => `sym:${path}`;

export async function loadSymbolConfig(base: string): Promise<SymbolConfig> {
  const res = await fetch(`${base}/categories.json`);
  if (!res.ok) throw new Error(`categories.json not found at ${base} (${res.status})`);
  const j = await res.json();
  return { _default: j._default, _company: j._company, _origin: j._origin, categories: j.categories ?? {} };
}
export function uniqueSprites(c: SymbolConfig): string[] {
  return [...new Set([c._default, c._company, c._origin, ...Object.values(c.categories)])];
}
