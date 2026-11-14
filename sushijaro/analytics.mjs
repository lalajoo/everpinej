// 스시자로 전용 GA4. 기본으로 방문을 세고(거절하면 끔), 정해 둔 이벤트 이름만 보냅니다.
// 검색어·위치·진료 카드 내용·인증 양식 내용은 이 모듈로 들어오지 않습니다.
export const MEASUREMENT_ID = 'G-ZW9WT05S2W';
export const CONSENT_KEY = 'sushijaro.analytics-consent.v1';
const ORIGIN = 'https://everpinej.com';
const PAGES = { '/sushijaro/': '스시자로', '/sushijaro/guide/': '스시자로 처방받는 법', '/sushijaro/notice/': '스시자로 이용 안내' };
const EVENTS = new Set(['page_view', 'app_promo_view', 'app_promo_apple_click', 'app_promo_google_click', 'filter_online', 'card_created', 'receipt_form_open', 'penuri_promo_pharmacy_click', 'penuri_promo_mounjaro_click', 'share_click', 'notes_tab', 'map_view', 'app_promo_inline_view', 'booking_click', 'booking_tip_copy']);

export function safeReferrer(value) {
  try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.origin + '/' : ''; }
  catch { return ''; }
}

// 쿼리스트링(검색어·필터)과 해시는 버리고 정해 둔 페이지 주소만 씁니다.
export function pagePath(pathname) {
  const path = String(pathname || '').replace(/index\.html$/, '');
  return PAGES[path] ? path : '/sushijaro/';
}

export function eventPayload(name, pathname, referrer = '') {
  if (!EVENTS.has(name)) return null;
  const path = pagePath(pathname);
  return { page_location: ORIGIN + path, page_title: PAGES[path], page_referrer: safeReferrer(referrer) };
}

export function createAnalytics(win, doc, id = MEASUREMENT_ID) {
  let allowed = false, started = false, pageViewed = false;
  const enabled = /^G-[A-Z0-9]{6,}$/.test(id);
  const production = enabled && win.location.hostname === 'everpinej.com' && win.location.protocol === 'https:';
  const disabledKey = 'ga-disable-' + id;
  const cookieId = id.replace(/^G-/, '');
  function command() { win.dataLayer.push(arguments); }
  function track(name) {
    const payload = eventPayload(name, win.location.pathname, doc.referrer);
    if (!allowed || !production || !payload) return false;
    command('event', name, { ...payload, send_to: id });
    return true;
  }
  function consent(granted) {
    allowed = granted === true;
    if (!production) return;
    win[disabledKey] = !allowed;
    if (!allowed) {
      for (const name of ['sushijaro_ga', 'sushijaro_ga_' + cookieId]) {
        for (const domain of ['', '; Domain=everpinej.com', '; Domain=.everpinej.com']) {
          doc.cookie = `${name}=; Max-Age=0; Path=/sushijaro/; SameSite=Lax${domain}`;
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
      command('config', id, {
        ...eventPayload('page_view', win.location.pathname, doc.referrer),
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        cookie_prefix: 'sushijaro',
        cookie_path: '/sushijaro/',
        cookie_domain: 'none',
        cookie_flags: 'SameSite=Lax;Secure',
        cookie_expires: 60 * 60 * 24 * 180,
        campaign_source: '', campaign_medium: '', campaign_name: '', campaign_id: '', campaign_term: '', campaign_content: '',
      });
      const script = doc.createElement('script');
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
      script.referrerPolicy = 'origin';
      doc.head.append(script);
    } else command('consent', 'update', { analytics_storage: 'granted' });
    if (!pageViewed) { pageViewed = true; track('page_view'); }
  }
  return { consent, track, enabled };
}

// 저장된 선택이 없으면 센다. '거절'을 눌렀거나 브라우저의 추적 거부 신호(GPC)가 켜져 있으면 세지 않는다.
export function effectiveChoice(stored, gpc = false) {
  if (stored === 'denied' || stored === 'granted') return stored;
  return gpc ? 'denied' : 'granted';
}

export function mountAnalytics(win, doc) {
  const analytics = createAnalytics(win, doc);
  win.sushijaroTrack = name => analytics.track(name);
  const panel = doc.querySelector('#analytics-consent');
  const settings = doc.querySelector('#analytics-settings');
  if (!analytics.enabled || !panel) { if (settings) settings.hidden = true; return analytics; }
  let choice = null, promoVisible = false, promoViewed = false;
  try { choice = win.localStorage.getItem(CONSENT_KEY); } catch { /* 사생활 보호 모드에서는 저장이 막힐 수 있어요. */ }
  function impression() { if (promoVisible && !promoViewed && analytics.track('app_promo_view')) promoViewed = true; }
  function apply(value) {
    choice = value;
    analytics.consent(effectiveChoice(value, win.navigator?.globalPrivacyControl === true) === 'granted');
    panel.hidden = value === 'granted' || value === 'denied';
    impression();
  }
  apply(choice);
  panel.querySelectorAll('[data-consent]').forEach(button => button.addEventListener('click', () => {
    try { win.localStorage.setItem(CONSENT_KEY, button.dataset.consent); } catch { /* 이 페이지에서만 적용 */ }
    apply(button.dataset.consent);
  }));
  if (settings) { settings.hidden = false; settings.addEventListener('click', () => { panel.hidden = false; panel.querySelector('button').focus(); }); }
  win.addEventListener('storage', event => { if (event.key === CONSENT_KEY) apply(event.newValue); });
  doc.querySelectorAll('[data-penuri]').forEach(link => link.addEventListener('click', () => analytics.track(`penuri_promo_${link.dataset.penuri}_click`)));
  doc.querySelectorAll('[data-app-store]').forEach(link => link.addEventListener('click', () => analytics.track(`app_promo_${link.dataset.appStore}_click`)));
  const promo = doc.querySelector('#majeunjaro-promo');
  if (promo && 'IntersectionObserver' in win) {
    new win.IntersectionObserver(entries => { promoVisible = entries[0].isIntersecting && entries[0].intersectionRatio >= .5; impression(); }, { threshold: .5 }).observe(promo);
  }
  return analytics;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') mountAnalytics(window, document);
