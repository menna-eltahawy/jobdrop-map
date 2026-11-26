import { GeoError } from './geoClient';

export type PageLang = 'ar' | 'en';

const ar = {
  brand: 'JOB DROP',
  navMap: 'خريطة الوظائف (2D)', navCompanyMap: 'خريطة المتقدمين (2D)',
  startPoint: 'نقطة الانطلاق', startHint: 'اختر أي شركة أو اضغط على الخريطة لحساب المسار',
  noStart: 'لم يتم تحديد موقعك بعد، استخدم زر GPS',
  needStart: 'حدد موقعك أولاً (GPS) عشان يظهر المسار',
  gpsLocation: 'موقعك الحالي (GPS)', backHome: 'العودة لموقعي', gps: 'لقط GPS من الموبايل',
  gpsDenied: 'تم رفض إذن الموقع', gpsFailed: 'تعذّر تحديد موقعك', gpsUnsupported: 'المتصفح لا يدعم تحديد الموقع',
  open: 'متاح للتقديم', job: 'JOB',
  car: 'عربية', motorcycle: 'موتوسيكل', walk: 'مشي',
  eta: 'الوقت المتوقع (ETA)', distance: 'المسافة بالطرق', minutes: 'دقيقة', km: 'كم',
  estimated: 'الوقت تقديري', calculating: 'جاري حساب المسار…',
  from: 'من (موقعك)', to: 'إلى (الوجهة)', universities: 'الجامعات المستهدفة', sla: 'مهلة رد HR', hours: 'ساعة',
  pickPrompt: 'اختر شركة من القائمة أو اضغط على الخريطة لحساب المسار',
  companiesOnMap: 'الشركات المتاحة على الخريطة:', noCompanies: 'لا توجد شركات في نطاق البحث',
  searching: 'جاري البحث…', radius: 'نطاق البحث (كم)',
  hq: 'مقر رئيسي', work_site: 'موقع عمل', hr: 'موارد بشرية',
  customPoint: 'نقطة على الخريطة',
  pinnedTitle: 'موقعك الحالي المثبت:', footer1: 'الخريطة: 2D مسطحة تمامًا', footer2: 'النص العربي: متصل ومضبوط (RTL)',
  mapNames: 'أسماء الخريطة', nameAr: 'عربي', nameEn: 'English', nameBoth: 'الاتنين',
  demoLinks: 'صفحات التجربة', linkApplicant: 'واجهة المتقدم', linkCompany: 'واجهة الشركة', linkTools: 'أدوات التسجيل',
  companyLocation: 'موقع الشركة', companyHint: 'المتقدمون القريبون من موقع الشركة، مجمّعين حسب المحافظة',
  companyId: 'رقم الشركة', locationId: 'رقم الموقع',
  areasNear: 'المتقدمون حسب المحافظة:', noAreas: 'لا يوجد متقدمون في نطاق البحث',
  applicants: 'متقدم', category: 'التخصص',
  unknownGov: 'محافظة غير محددة', resolvingGov: 'جاري تحديد المحافظة…', totalApplicants: 'إجمالي المتقدمين',
  privacy: 'بيظهر للشركة المحافظة بس، مش المناطق ولا بيوت المتقدمين.',
  errNetwork: 'تعذّر الاتصال بالسيرفر', errApi: 'تعذّر الوصول للـ API. تأكدي إنه شغال', errKey: 'مفتاح الـ API غير صحيح',
  errBusy: 'طلبات كتير، جرّبي بعد شوية', errTooFar: 'النقطتين بعيد عن بعض أكتر من اللازم لحساب مسار',
  errNoRoute: 'مفيش مسار بين النقطتين', errNotRoutable: 'إحدى النقطتين بعيدة عن أي طريق',
  errRouting: 'خدمة حساب المسار غير متاحة حاليًا', errRadius: 'نطاق البحث لازم يكون أكبر من صفر وفي الحد المسموح',
  errLocation: 'لم يتم العثور على موقع الشركة',
  posted: 'تاريخ نزول الدروبّاية', directions: 'افتح المسار في Google Maps', yourLocation: 'موقعك', otherLang: 'English',
};

export type Str = typeof ar;

const en: Str = {
  brand: 'JOB DROP',
  navMap: 'Jobs map (2D)', navCompanyMap: 'Applicants map (2D)',
  startPoint: 'Start point', startHint: 'Pick any company or tap the map to calculate the route',
  noStart: 'Your location is not set yet, use the GPS button',
  needStart: 'Set your location first (GPS) to see the route',
  gpsLocation: 'Your location (GPS)', backHome: 'Back to my location', gps: 'Get GPS from phone',
  gpsDenied: 'Location permission denied', gpsFailed: 'Could not get your location', gpsUnsupported: 'Location is not supported by this browser',
  open: 'Open for applications', job: 'JOB',
  car: 'Car', motorcycle: 'Motorcycle', walk: 'Walk',
  eta: 'Estimated time (ETA)', distance: 'Distance by road', minutes: 'min', km: 'km',
  estimated: 'Time is an estimate', calculating: 'Calculating route…',
  from: 'From (you)', to: 'To (destination)', universities: 'Target universities', sla: 'HR reply deadline', hours: 'hours',
  pickPrompt: 'Pick a company from the list or tap the map to calculate a route',
  companiesOnMap: 'Companies on the map:', noCompanies: 'No companies within the search radius',
  searching: 'Searching…', radius: 'Search radius (km)',
  hq: 'Headquarters', work_site: 'Work site', hr: 'HR office',
  customPoint: 'Point on the map',
  pinnedTitle: 'Pinned current location:', footer1: 'Map: fully flat 2D', footer2: 'Arabic text: joined and correct (RTL)',
  mapNames: 'Map names', nameAr: 'Arabic', nameEn: 'English', nameBoth: 'Both',
  demoLinks: 'Demo pages', linkApplicant: 'Applicant view', linkCompany: 'Company view', linkTools: 'Registration tools',
  companyLocation: 'Company location', companyHint: 'Applicants near the company location, grouped by governorate',
  companyId: 'Company ID', locationId: 'Location ID',
  areasNear: 'Applicants by governorate:', noAreas: 'No applicants within the search radius',
  applicants: 'applicants', category: 'Category',
  unknownGov: 'Unknown governorate', resolvingGov: 'Finding governorate…', totalApplicants: 'Total applicants',
  privacy: 'Companies see the governorate only, never areas or applicants\' homes.',
  errNetwork: 'Cannot reach the server', errApi: 'Cannot reach the API. Make sure it is running', errKey: 'Invalid API key',
  errBusy: 'Too many requests, try again shortly', errTooFar: 'The two points are too far apart for a route',
  errNoRoute: 'No route exists between these two points', errNotRoutable: 'One of the points is too far from any road',
  errRouting: 'The routing service is not available right now', errRadius: 'Radius must be greater than 0 and within the allowed maximum',
  errLocation: 'Company location not found',
  posted: 'Job dropped on', directions: 'Open route in Google Maps', yourLocation: 'Your location', otherLang: 'العربية',
};

export const STR: Record<PageLang, Str> = { ar, en };

export function errorMessage(lang: PageLang, e: unknown): string {
  const s = STR[lang];
  if (e instanceof GeoError) {
    switch (e.code) {
      case 'route_too_far': return s.errTooFar;
      case 'route_not_found': return s.errNoRoute;
      case 'point_not_routable': return s.errNotRoutable;
      case 'routing_unavailable':
      case 'routing_timeout': return s.errRouting;
      case 'invalid_radius': return s.errRadius;
      case 'location_not_found': return s.errLocation;
    }
    if (e.status === 401) return s.errKey;
    if (e.status === 429) return s.errBusy;
    if (e.status >= 500) return s.errApi;
    return e.message;
  }
  return s.errNetwork;
}