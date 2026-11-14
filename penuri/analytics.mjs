// This GA4 stream belongs to the Penuri Firebase project. No Firebase secret is required.
export const MEASUREMENT_ID = 'G-D363V9189T';
export const CANONICAL_URL = 'https://everpinej.com/penuri/';
export const CONSENT_KEY = 'penuri.analytics-consent.v1';
const EVENTS = new Set(['page_view', 'app_promo_view', 'app_promo_apple_click', 'app_promo_google_click']);

export function safeReferrer(value) {
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.origin + '/' : ''; }
  catch { return ''; }
}

// Accept event names only; search terms, records, form contents and coordinates never enter this API.
export function eventPayload(name, referrer = '') {
  if (!EVENTS.has(name)) return null;
  return { page_location: CANONICAL_URL, page_title: '페누리', page_referrer: safeReferrer(referrer) };
}

export function createAnalytics(win, doc) {
  let allowed = false, started = false, pageViewed = false;
  const production = win.location.hostname === 'everpinej.com' && win.location.protocol === 'https:';
  const disabledKey = 'ga-disable-' + MEASUREMENT_ID;
  function command() { win.dataLayer.push(arguments); }
  function track(name) {
    const payload = eventPayload(name, doc.referrer);
    if (!allowed || !production || !payload) return false;
    command('event', name, { ...payload, send_to: MEASUREMENT_ID });
    return true;
  }
  function consent(granted) {
    allowed = granted === true;
    win[disabledKey] = !allowed;
    if (!production) return;
    if (!allowed) {
      // Disable before deleting this stream's cookies. Do not delete other apps' cookies.
      for (const name of ['penuri_ga', 'penuri_ga_D363V9189T']) {
        for (const domain of ['', '; Domain=everpinej.com', '; Domain=.everpinej.com']) {
          doc.cookie = `${name}=; Max-Age=0; Path=/penuri/; SameSite=Lax${domain}`;
        }
      }
      if (started) command('consent', 'update', { analytics_storage: 'denied' });
      return;
    }
    if (!started) {
      started = true;
      win.dataLayer = win.dataLayer || [];
      command('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      command('js', new Date());
      command('config', MEASUREMENT_ID, {
        ...eventPayload('page_view', doc.referrer),
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_prefix: 'penuri',
        cookie_path: '/penuri/',
        cookie_domain: 'none',
        cookie_flags: 'SameSite=Lax;Secure',
        cookie_expires: 60 * 60 * 24 * 180,
        campaign_source: '', campaign_medium: '', campaign_name: '', campaign_id: '', campaign_term: '', campaign_content: '',
      });
      const script = doc.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      script.referrerPolicy = 'origin';
      doc.head.append(script);
    } else command('consent', 'update', { analytics_storage: 'granted' });
    if (!pageViewed) { pageViewed = true; track('page_view'); }
  }
  return { consent, track };
}

export function mountAnalytics(win, doc) {
  const analytics = createAnalytics(win, doc);
  const panel = doc.querySelector('#analytics-consent');
  const settings = doc.querySelector('#analytics-settings');
  const status = doc.querySelector('#analytics-status');
  let choice = null, promoVisible = false, promoViewed = false;
  try { choice = win.localStorage.getItem(CONSENT_KEY); } catch { /* Private browsing may block storage. */ }
  function impression() {
    if (promoVisible && !promoViewed && analytics.track('app_promo_view')) promoViewed = true;
  }
  function apply(value) {
    choice = value;
    analytics.consent(value === 'granted');
    panel.hidden = value === 'granted' || value === 'denied';
    status.textContent = value === 'granted' ? '방문 통계 수집을 허용했어요.' : value === 'denied' ? '방문 통계 수집을 사용하지 않아요.' : '통계 쿠키 사용 여부를 선택할 수 있어요.';
    impression();
  }
  apply(choice);
  panel.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => {
    const value = button.dataset.consent;
    try { win.localStorage.setItem(CONSENT_KEY, value); } catch { /* Choice applies to this page even without storage. */ }
    apply(value);
  }));
  settings.addEventListener('click', () => { panel.hidden = false; panel.querySelector('button').focus(); });
  panel.querySelector('a').addEventListener('click', () => {
    doc.querySelector('#privacy-details').open = true;
    panel.hidden = true;
  });
  win.addEventListener('storage', event => { if (event.key === CONSENT_KEY) apply(event.newValue); });
  doc.addEventListener('click', event => {
    const link = event.target.closest?.('.app-promo [data-app-store]');
    if (link) analytics.track(`app_promo_${link.dataset.appStore}_click`);
  });
  if ('IntersectionObserver' in win) {
    const visiblePromos = new Set();
    const observer = new win.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= .5) visiblePromos.add(entry.target);
        else visiblePromos.delete(entry.target);
      }
      promoVisible = visiblePromos.size > 0;
      impression();
    }, { threshold: .5 });
    const watchPromos = () => {
      observer.disconnect();
      visiblePromos.clear();
      promoVisible = false;
      doc.querySelectorAll('.app-promo').forEach(promo => observer.observe(promo));
    };
    doc.addEventListener('penuri:results-rendered', watchPromos);
    watchPromos();
  }
  return analytics;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') mountAnalytics(window, document);
