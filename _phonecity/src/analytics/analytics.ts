// Dedicated Phone City property; never route events to another service.
export const MEASUREMENT_ID = 'G-NV579L5P1K';
export const CANONICAL_URL = 'https://everpinej.com/phonecity/';
export const CONSENT_KEY = 'phone-city/v1/analytics-consent';
export const EVENTS = ['page_view', 'phonecity_walk_start', 'phonecity_building_enter', 'phonecity_rooftop_reached', 'phonecity_city_saved', 'phonecity_photo_saved', 'phonecity_share', 'phonecity_flag_planted'] as const;
export type AnalyticsEvent = typeof EVENTS[number];
export type Consent = 'granted' | 'denied' | null;
interface AnalyticsHost {
  location: { hostname: string; protocol: string; pathname: string };
  dataLayer?: unknown[];
  [key: string]: unknown;
}

export function safeReferrer(value: string): string {
  try { const u = new URL(value); return /^https?:$/.test(u.protocol) ? u.origin + '/' : ''; }
  catch { return ''; }
}

/** Fixed event names only. Never accept visitor-entered values or a city payload. */
export function eventPayload(name: string, referrer = '') {
  if (!(EVENTS as readonly string[]).includes(name)) return null;
  return { page_location: CANONICAL_URL, page_title: '달콤한 나의 폰도시', page_referrer: safeReferrer(referrer) };
}

export function createAnalytics(win: AnalyticsHost, doc: Pick<Document, 'referrer' | 'cookie' | 'createElement' | 'head'>) {
  let allowed = false, started = false, pageViewed = false;
  const production = win.location.hostname === 'everpinej.com' && win.location.protocol === 'https:'
    && (win.location.pathname === '/phonecity' || win.location.pathname.startsWith('/phonecity/'));
  const disabled = `ga-disable-${MEASUREMENT_ID}`;
  function command(..._args: unknown[]) { win.dataLayer!.push(arguments); }
  function track(name: AnalyticsEvent) {
    const payload = eventPayload(name, doc.referrer);
    if (!allowed || !production || !payload) return false;
    command('event', name, { ...payload, send_to: MEASUREMENT_ID });
    return true;
  }
  function consent(granted: boolean) {
    allowed = granted === true;
    win[disabled] = !allowed;
    if (!production) return;
    if (!allowed) {
      for (const name of ['phonecity_ga', `phonecity_ga_${MEASUREMENT_ID.slice(2)}`]) {
        doc.cookie = `${name}=; Max-Age=0; Path=/phonecity/; SameSite=Lax; Secure`;
      }
      if (started) command('consent', 'update', { analytics_storage: 'denied' });
      return;
    }
    if (!started) {
      started = true;
      win.dataLayer = win.dataLayer || [];
      command('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      const settings = {
        ...eventPayload('page_view', doc.referrer), send_page_view: false,
        allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_prefix: 'phonecity', cookie_path: '/phonecity/', cookie_domain: 'none',
        cookie_flags: 'SameSite=Lax;Secure', cookie_expires: 60 * 60 * 24 * 180,
        campaign_source: '', campaign_medium: '', campaign_name: '', campaign_id: '', campaign_term: '', campaign_content: '',
      };
      // Upgraded Google tags can initialize before a destination config command.
      // Apply privacy and page-view defaults before any tag initialization.
      command('set', settings);
      command('js', new Date());
      command('config', MEASUREMENT_ID, settings);
      const script = doc.createElement('script');
      script.async = true; script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      script.referrerPolicy = 'origin'; doc.head.append(script);
    } else command('consent', 'update', { analytics_storage: 'granted' });
    if (!pageViewed) { pageViewed = true; track('page_view'); }
  }
  return { consent, track };
}

const analytics = typeof window !== 'undefined' ? createAnalytics(window as unknown as AnalyticsHost, document) : null;
export function readConsent(): Consent {
  try { const v = localStorage.getItem(CONSENT_KEY); return v === 'granted' || v === 'denied' ? v : null; } catch { return null; }
}
export function applyConsent(value: Consent) { analytics?.consent(value === 'granted'); }
export function saveConsent(value: Consent) {
  try { if (value) localStorage.setItem(CONSENT_KEY, value); } catch { /* The current choice still applies. */ }
  applyConsent(value);
}
export function track(name: AnalyticsEvent) { return analytics?.track(name) ?? false; }
