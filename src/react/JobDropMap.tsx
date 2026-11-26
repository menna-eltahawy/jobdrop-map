'use client'; // Next.js: the map needs the browser. If SSR still complains: dynamic(() => import('...'), { ssr: false })
import 'maplibre-gl/dist/maplibre-gl.css';
import './jobdrop-map.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { JobDropMap as Core } from '../core/JobDropMap';
import type { CompanyPin, CandidateArea, MapConfig, MapEvents, SearchCircle, LngLat } from '../core/types';
import type { LabelLanguage } from '../core/labels';

interface Props extends MapEvents {
  config: MapConfig;
  companies?: CompanyPin[];
  candidateAreas?: CandidateArea[];
  fitToAreas?: boolean;                                
  origin?: LngLat | null;
  destination?: LngLat | null;                         
  route?: LngLat[] | null;                             
  searchCircle?: SearchCircle | null;
  pickOrigin?: boolean;
  labelLanguage?: LabelLanguage;                       
  flyTo?: { center: LngLat; zoom?: number };          
  symbolsBase?: string;
  originLabel?: string;                                
  popup?: { lngLat: LngLat; content: ReactNode } | null;
  onPopupClose?: () => void;
  className?: string;
}

const NO_ITEMS: never[] = [];                          

export function JobDropMap({ config, companies = NO_ITEMS, candidateAreas = NO_ITEMS, fitToAreas = false, origin = null, destination = null, route = null,
  searchCircle = null, pickOrigin = false, labelLanguage = 'ar', flyTo, symbolsBase, className,
  originLabel, popup = null, onPopupClose, onSelectCompany, onSelectArea, onOriginChange, onMapClick }: Props) {
  const [popupNode, setPopupNode] = useState<HTMLElement | null>(null);   // created in the browser only (SSR safe)
  const el = useRef<HTMLDivElement>(null);
  const core = useRef<Core | null>(null);
  const cb = useRef({ onSelectCompany, onSelectArea, onOriginChange, onMapClick, onPopupClose });
  cb.current = { onSelectCompany, onSelectArea, onOriginChange, onMapClick, onPopupClose };           // always call the latest callbacks

  useEffect(() => {
    core.current = new Core(el.current!, config,
      { onSelectCompany: (id) => cb.current.onSelectCompany?.(id), onSelectArea: (id) => cb.current.onSelectArea?.(id),
        onOriginChange: (p) => cb.current.onOriginChange?.(p), onMapClick: (p) => cb.current.onMapClick?.(p) },
      { symbolsBase });
    return () => { core.current?.destroy(); core.current = null; };
  }, []);
  useEffect(() => { core.current?.setCompanies(companies); }, [companies]);
  useEffect(() => { core.current?.setOrigin(origin, originLabel); }, [origin, originLabel]);
  useEffect(() => { core.current?.setCandidateAreas(candidateAreas, fitToAreas); }, [candidateAreas, fitToAreas, origin]);
  useEffect(() => { setPopupNode(document.createElement('div')); }, []);
  const popupLng = popup?.lngLat[0], popupLat = popup?.lngLat[1];
  useEffect(() => {
    if (!popupNode) return;
    const at: LngLat | null = popupLng === undefined || popupLat === undefined ? null : [popupLng, popupLat];
    core.current?.setPopup(at, popupNode, () => cb.current.onPopupClose?.());
  }, [popupNode, popupLng, popupLat]);
  useEffect(() => { core.current?.refreshPopup(); });
  useEffect(() => { core.current?.setDestination(destination); }, [destination]);
  const circleFits = !(fitToAreas && candidateAreas.length > 0);
  useEffect(() => { core.current?.setSearchCircle(searchCircle, circleFits); }, [searchCircle, circleFits]);
  useEffect(() => { core.current?.setRoute(route); }, [route]);
  useEffect(() => { core.current?.enableOriginPicking(pickOrigin); }, [pickOrigin]);
  useEffect(() => { core.current?.setLabelLanguage(labelLanguage); }, [labelLanguage]);
  useEffect(() => { if (flyTo) core.current?.flyTo(flyTo.center, flyTo.zoom); }, [flyTo]);

  return (
    <>
      <div ref={el} className={className} style={{ width: '100%', height: '100%', minHeight: 320 }} />
      {popup && popupNode ? createPortal(popup.content, popupNode) : null}
    </>
  );
}