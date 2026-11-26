export type LngLat = [number, number]; 

export interface CompanyPin {
  id: string;              
  name: string;
  lngLat: LngLat;            
  locationType?: 'hq' | 'work_site' | 'hr';
}
export interface CandidateArea {
  id: string;                 
  areaName: string;           
  areaCenter: LngLat;         
  category: string;           
  count?: number;             
}
export interface MapConfig {
  styleUrl: string;           
  center: LngLat;
  zoom: number;
  rtlPluginUrl?: string;
}
export interface MapOptions { symbolsBase?: string }
export interface SearchCircle { center: LngLat; radiusKm: number }
export interface MapEvents {
  onSelectCompany?: (id: string) => void;
  onSelectArea?: (id: string) => void;
  onOriginChange?: (lngLat: LngLat) => void;   
  onMapClick?: (lngLat: LngLat) => void;       
}