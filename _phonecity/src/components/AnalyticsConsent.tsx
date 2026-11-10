import { useEffect, useState } from 'react';
import { CONSENT_KEY, applyConsent, readConsent, saveConsent, type Consent } from '../analytics/analytics';
import { useT } from '../i18n';
export function AnalyticsConsent({ playing }: { playing: boolean }) {
  const t = useT();
  const [choice, setChoice] = useState<Consent>(readConsent);
  const [open, setOpen] = useState(() => readConsent() === null);
  useEffect(() => { applyConsent(choice); }, [choice]);
  useEffect(() => {
    const sync = (e: StorageEvent) => { if (e.key === CONSENT_KEY) { setChoice(readConsent()); setOpen(false); } };
    window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);
  }, []);
  const choose = (value: Consent) => { saveConsent(value); setChoice(value); setOpen(false); };
  return <>
    <div className="privacy-info">
      <details><summary>{t.privacyTitle}</summary><p>{t.privacyLocal}</p><p>{t.privacyAnalytics}</p><p>{t.privacyCookies}</p><a href="https://policies.google.com/privacy?hl=ko" target="_blank" rel="noopener noreferrer">{t.googlePrivacy} ↗</a></details>
      <button className="subtle" onClick={() => setOpen(true)}>{t.analyticsSettings}</button>
      <span className="small">{choice === 'granted' ? t.analyticsOn : t.analyticsOff}</span>
    </div>
    {open && !playing && <section className="consent-panel" aria-labelledby="consent-title">
      <strong id="consent-title">{t.consentTitle}</strong><p>{t.consentBody}</p>
      <div><button className="secondary" onClick={() => choose('denied')}>{t.consentDecline}</button><button className="primary" onClick={() => choose('granted')}>{t.consentAllow}</button></div>
    </section>}
  </>;
}
