# Job Drop — Geo Part (map component, Geo API, routing)

This document is for the Job Drop web teams (Next.js and NestJS). It describes the part of the platform that was built separately by the GIS developer, what is running on your server, and how to connect it to the rest of the site. The GIS developer is not part of your team and owns only what is listed here: the base map and its symbology, the map component, the Geo API with its PostGIS database, and the routing engine setup. Login, jobs, applications, billing and every other page stay with your teams.

## What you receive

| Piece | What it is | How you get it |
|---|---|---|
| **Geo API** | A .NET 10 service with its own PostGIS database. Stores applicant and company locations, searches by radius, calculates routes. | Already running on your server. You receive a base URL and an API key (the key is sent privately, never in this file). |
| **Routing engine** | Two OSRM containers (car and foot) with road data for the approved Cairo areas and Gulf cities, running next to the API. | Already running on your server, used only by the Geo API. |
| **Map component** | MapLibre GL JS map with the brand style, symbols per job category, search circle, company pins, route line and popup. Framework-free core plus a React wrapper for Next.js. | Folder `jobdrop-map/`: copy `src/` and `public/` into the Next.js project. |
| **Reference demo** | A working applicant page and company page showing how everything fits together, with fictitious data. | Folder `jobdrop-map/demo/` (do not ship it; copy ideas from it). |

## How the parts talk to each other

```
Browser ──► Next.js ──► NestJS ──► Geo API (127.0.0.1:5080) ──► PostGIS
                                        └──► OSRM car / OSRM foot
```

The Geo API is not open to the internet. It listens on port 5080 of the server itself and every request needs the header `X-Api-Key`. That key must live only in NestJS. The browser talks to NestJS, and NestJS forwards the call to the Geo API after checking who the user is. This is the same thing the demo does with the Vite proxy in `vite.config.ts`: the browser calls `/geo/...` and the proxy adds the key. In production NestJS plays the role of that proxy.

If NestJS runs directly on the server (not in Docker), use `http://127.0.0.1:5080` as the base URL. If NestJS runs in Docker, join its container to the existing Docker network named `jobdrop-net` and use `http://api:5080`. Do not publish port 5080 to the internet: the key and the coordinates would travel without encryption.

## Privacy rules built into the API

An applicant's exact home location is never returned by any endpoint. Companies only receive approximate areas (area name, area centre, job category, count) and never a person. Because the API never returns a stored residence, a route must always start from a point the user supplies right now: browser GPS, a tap on the map, or a company location. Do not build a route from a saved residence, because the first point of the line would reveal it.

Search is also restricted by role. A job seeker only searches companies, and a company only searches applicants, always from one of its own registered locations. The API trusts the ids it is given, so NestJS must take `applicantId` and `companyId` from the logged-in session and never from the browser request.

## Geo API reference

Base URL: the one you were given. Every endpoint except `/health` needs `X-Api-Key: <key>`. Coordinates are always `lng`, `lat` (longitude first). Distances are in metres, durations in seconds, radius in kilometres (any positive decimal up to 100). Errors come as JSON `{ "code": "...", "message": "..." }` with these status codes: 401 wrong or missing key, 404 not found, 422 invalid input, 429 too many requests, 502/504 routing engine problem.

### Read endpoints (safe to expose to the browser through NestJS)

| Endpoint | Purpose | Answer |
|---|---|---|
| `GET /health` | Service status, no key needed. | `{ status, regions, placeholderRegions }` |
| `GET /search/companies?lng&lat&radiusKm` | Company locations around a point. | `{ radiusKm, total, items: [{ id, companyId, name, locationType, lngLat, distanceM }] }` |
| `GET /applicants/{id}/search-companies?from=residence\|current&radiusKm` | Same search, starting from the applicant's stored home or live location. The point never leaves the server. | same as above |
| `GET /search/applicant-areas?companyId&locationId&radiusKm[&minGroup]` | A company searches applicants around one of its own locations. Only discoverable applicants appear, grouped by area and category. | `{ radiusKm, total, items: [{ id, areaName, areaNameEn, areaCenter, category, count }] }` |
| `GET /route?fromLng&fromLat&toLng&toLat&mode=car\|motorcycle\|walk` | Route line, distance and time between two explicit points. | `{ mode, distanceM, durationS, estimated, geometry: [[lng,lat],...], attribution }` |
| `GET /places/reverse?lng&lat&lang=ar\|en` | Readable name of a point ("district, governorate"). | `{ displayName, governorate }` |
| `GET /companies/{companyId}/locations/{locationId}` | One company location. | pin object as in the company search |
| `GET /regions` | Approved regions (Egypt areas and Gulf cities). | list |
| `GET /applicants/{id}` | Registration state of an applicant (has residence, has live location, discoverable). | `{ id, category, discoverable, hasResidence, hasCurrentLocation, currentLocationUpdatedAt }` |

### Write endpoints (call from NestJS only, never from the browser)

| Endpoint | Body | Purpose |
|---|---|---|
| `PUT /applicants/{id}/profile` | `{ "category": "tech", "discoverable": true }` | Job category and consent to appear in company searches. `discoverable` defaults to false. |
| `PUT /applicants/{id}/residence` | `{ "lng": 31.2, "lat": 30.06 }` | Permanent home. Stored as a point, only its area is ever shown to companies. |
| `PUT /applicants/{id}/current-location` | `{ "lng": 31.2, "lat": 30.06 }` | Optional live location. |
| `PUT /companies/{companyId}/locations/{locationId}` | `{ "kind": "hq\|work_site\|hr", "name": "...", "lng": 0, "lat": 0 }` | Create or update a company location. A `work_site` must be inside an approved area (error `outside_approved_area`). |
| `DELETE /applicants/{id}` · `DELETE /companies/{companyId}` · `DELETE /companies/{companyId}/locations/{locationId}` | — | Remove data, for account deletion. |

The write endpoints answer 204 with no body. The Geo API is a location store: it does not know about jobs, users or logins. Your main database remains the source of truth for those, and you only mirror ids and points here when they change.

The global limit is 600 requests per minute for the whole key. Because all browsers share one key, cache repeated answers in NestJS (for example reverse place names) and rate limit per user there.

## Connecting from NestJS

A thin service is enough. The snippet below is an example of the shape, adapt it to your conventions.

```ts
@Injectable()
export class GeoService {
  private base = process.env.GEO_API_URL!;   // http://127.0.0.1:5080
  private key = process.env.GEO_API_KEY!;

  async get<T>(path: string, params: Record<string, string | number> = {}): Promise<T> {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const res = await fetch(`${this.base}${path}?${qs}`, { headers: { 'X-Api-Key': this.key } });
    if (!res.ok) throw new HttpException(await res.json().catch(() => ({})), res.status);
    return res.json() as Promise<T>;
  }

  async put(path: string, body: unknown): Promise<void> {
    const res = await fetch(`${this.base}${path}`, {
      method: 'PUT',
      headers: { 'X-Api-Key': this.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new HttpException(await res.json().catch(() => ({})), res.status);
  }
}

// controller: the user id comes from the session, not from the request
@Get('geo/companies')
search(@User() user, @Query('radiusKm') radiusKm: string) {
  return this.geo.get(`/applicants/${user.id}/search-companies`, { from: 'current', radiusKm });
}
```

Expose to the browser only the read endpoints you need and keep the same paths and parameter names, so `jobdrop-map/demo/geoClient.ts` can be reused unchanged: it is a small typed client whose `BASE` constant (`'/geo'`) is the only thing to point at your NestJS route.

## Map component

Install `maplibre-gl` in the Next.js project (React 18 is assumed) and copy `jobdrop-map/src/` and `jobdrop-map/public/` into it. The style, the symbols and `categories.json` are served as static files from `public/`.

```tsx
import { JobDropMap } from '@/jobdrop-map/src/react/JobDropMap';

<JobDropMap
  config={{ styleUrl: '/jobdrop-style.json', center: [31.2357, 30.0444], zoom: 13,
            rtlPluginUrl: '/mapbox-gl-rtl-text.min.js' }}
  companies={companies}              // [{ id, name, lngLat, locationType? }]
  candidateAreas={areas}             // [{ id, areaName, areaCenter, category, count }]  approximate areas only
  origin={originLngLat}              // the "you are here" pin
  destination={destLngLat}           // highlighted target (company or free point)
  route={routeGeometry}              // geometry from GET /route, the camera fits it
  searchCircle={{ center: originLngLat, radiusKm: 3 }}
  popup={{ lngLat: destLngLat, content: <MyPopup /> }}
  onPopupClose={() => {}}
  labelLanguage="ar"                 // 'ar' | 'en' | 'both' for the base map names
  pickOrigin={false}                 // true: the next tap on the map becomes the origin
  onSelectCompany={(id) => {}}
  onSelectArea={(id) => {}}
  onOriginChange={(lngLat) => {}}
  onMapClick={(lngLat) => {}}
/>
```

The component has no hard-coded data and no keys. It receives everything through props and reports user actions through the callbacks above. Pass stable objects (memoised arrays and objects), otherwise the map redraws on every render. If Next.js complains about `window`, load it with `dynamic(() => import('...'), { ssr: false })`. The wrapper copies only allow-listed fields from the data you pass, so extra fields (an applicant id for example) never reach the map layers.

Symbols: each applicant area is drawn with the sprite mapped to its `category` in `public/symbols/categories.json` (category code to sprite path). The file currently holds sample codes. Replace the keys with your real category codes: no code change is needed. Unknown codes fall back to `_default`. Company pins use the "H" symbol and the origin uses the pin from the same file.

Base map: `public/jobdrop-style.json` is a MapLibre style in the brand palette (cream background, brown roads and text), Arabic names first. Water and green colours are not part of the brand palette and still need the designer's approval.

## Popup, route and Google Maps link

The demo shows the complete flow in `demo/ApplicantPage.tsx` and `demo/DropPopup.tsx`: the user picks a company, the page asks `GET /route` for the chosen mode, draws the returned geometry through `route`, and opens a popup with the job title, the date the drop was posted, the time and distance, and a Google Maps button. The link is built in `demo/gmaps.ts` from the two points and needs no Google key. Google calculates its own route when the link opens, so its time and distance can differ slightly from the numbers shown on the map. Motorcycle is not a profile of the free engine: its time is the car time multiplied by a factor (`Routing:MotorcycleDurationFactor`, default 0.85) and the response says `estimated: true`.

The job data in the demo (title, address, target universities, HR deadline, posted date) is fictitious and lives in `demo/jobs.ts`. The Geo API does not know jobs. In the real site your backend sends this data with the company, and `postedAt` should come from the job record.

## What runs on the server

The server holds a folder `jobdrop-server/` with a Docker Compose setup in `deploy/`. It runs four containers on one private Docker network: the PostGIS database (no published port), the Geo API (published on 127.0.0.1:5080 only), and the OSRM car and foot engines. The secrets (database password and API key) are generated on the server into `deploy/.env` and are not part of any file you receive.

| Task | Command (run inside `jobdrop-server/deploy`) |
|---|---|
| Status | `docker compose --profile routing ps` |
| Logs | `docker compose logs --tail=100 api` |
| Rebuild and restart the API after a code change | `bash deploy.sh` |
| Database backup (keeps the last 14) | `bash backup.sh` |
| Refresh the road data | `bash prepare-routing.sh` |

The database dump that seeds the first start contains the regions and reference data. Applicants and company locations start empty and are filled through the write endpoints. The seed only runs when the database volume is empty, so a later change to the dump does not alter an existing database.

## Production notes

The following services are public and free, and you should decide whether they are acceptable for production traffic. The base map tiles and fonts come from OpenFreeMap (no SLA), the reverse place names come from the public Nominatim service through the Geo API (cached, limited to about one request per second, and the policy forbids heavy use), the Arabic text shaping plugin is loaded from unpkg in the demo and should be copied into `public/` and referenced by `rtlPluginUrl`, and the demo place search in `demo/geocoder.ts` calls Nominatim straight from the browser, which is acceptable for a demo only. Tile hosting and a self-hosted geocoder can replace these later by changing URLs, with no change to the component API.

The routing engines only know the road data that was loaded (the approved Cairo areas and Gulf cities, with a margin around them). Routes longer than 100 km in a straight line are refused (`Routing:MaxStraightLineKm`). The `User-Agent` in `appsettings.json` identifies the service to Nominatim: set a contact that belongs to your team.

Keep the OpenStreetMap and OpenFreeMap attribution visible on the map, and show the `attribution` string returned by `/route` near the route.

## Open items on your side

The real job category codes for `categories.json`, the final approved-area list and its boundaries if they change, the symbols for new categories (the slicing tool is in `jobdrop-map/tools/`), where NestJS runs (same host or Docker) so the base URL is final, and a decision on the free public services above before launch.
