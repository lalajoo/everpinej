import { describe, expect, it } from 'vitest';
import { createAnalytics, eventPayload, safeReferrer, CANONICAL_URL, MEASUREMENT_ID } from './analytics';
function setup(hostname = 'everpinej.com', protocol = 'https:', pathname = '/phonecity/') {
  const scripts: unknown[] = [], cookies: string[] = [];
  const win = { location: { hostname, protocol, pathname }, dataLayer: [] as unknown[], [`ga-disable-${MEASUREMENT_ID}`]: true };
  const doc = { referrer: 'https://search.example/results?q=private', createElement: () => ({}), head: { append: (s: unknown) => scripts.push(s) }, set cookie(v: string) { cookies.push(v); } };
  const analytics = createAnalytics(win, doc as unknown as Document);
  return { win, doc, scripts, cookies, analytics };
}
describe('consent-based analytics', () => {
  it('sends nothing and loads no Google script before permission or after refusal', () => {
    const e = setup(); expect(e.analytics.track('phonecity_walk_start')).toBe(false);
    e.analytics.consent(false); expect(e.scripts).toHaveLength(0); expect(e.win.dataLayer).toHaveLength(0);
  });
  it('loads once, records one page view, and stops immediately after withdrawal', () => {
    const e = setup(); e.analytics.consent(true); e.analytics.consent(true);
    expect(e.scripts).toHaveLength(1);
    expect(e.win.dataLayer.filter(v => (v as IArguments)[1] === 'page_view')).toHaveLength(1);
    expect(e.analytics.track('phonecity_walk_start')).toBe(true);
    e.analytics.consent(false); expect(e.analytics.track('phonecity_city_saved')).toBe(false);
    expect(e.win[`ga-disable-${MEASUREMENT_ID}`]).toBe(true);
    expect(e.cookies.every(v => v.startsWith('phonecity_ga') && v.includes('Path=/phonecity/'))).toBe(true);
  });
  it('routes the script, configuration and every event only to the dedicated Phone City property', () => {
    const e = setup(); e.analytics.consent(true); e.analytics.track('phonecity_walk_start');
    expect(MEASUREMENT_ID).toBe('G-NV579L5P1K');
    expect(e.scripts).toEqual([expect.objectContaining({src: `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`})]);
    const commands = e.win.dataLayer.map(value => Array.from(value as IArguments));
    expect(commands.filter(command => command[0] === 'config').map(command => command[1])).toEqual([MEASUREMENT_ID]);
    expect(commands.filter(command => command[0] === 'event')).toEqual([
      ['event', 'page_view', expect.objectContaining({send_to: MEASUREMENT_ID})],
      ['event', 'phonecity_walk_start', expect.objectContaining({send_to: MEASUREMENT_ID})],
    ]);
  });
  it('never records local previews, other services, insecure URLs or deceptive hostnames', () => {
    for (const args of [['localhost','http:','/phonecity/'],['everpinej.com.evil.test','https:','/phonecity/'],['everpinej.com','http:','/phonecity/'],['everpinej.com','https:','/penuri/']]) {
      const e=setup(...args); e.analytics.consent(true); expect(e.scripts).toHaveLength(0); expect(e.analytics.track('page_view')).toBe(false);
    }
  });
  it('uses fixed event names and strips queries, paths and fragments from referrers', () => {
    expect(eventPayload('private_nickname')).toBeNull();
    expect(eventPayload('phonecity_share','https://example.com/private?q=secret#name')).toEqual({page_location:CANONICAL_URL,page_title:'달콤한 나의 폰도시',page_referrer:'https://example.com/'});
    expect(safeReferrer('javascript:alert(1)')).toBe('');
  });
});
