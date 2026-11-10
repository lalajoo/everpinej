import { useT } from '../i18n';

export function Header({ onHow, nickname, onProfile, onLocale }: { onHow: () => void; nickname?: string; onProfile: () => void; onLocale: () => void }) {
  const t = useT();
  return (
    <header className="site-header">
      <div className="brand">
        <svg viewBox="0 0 32 36" fill="none" aria-hidden="true">
          <path d="M3 15 13 9v23L3 27z" fill="#9db875" />
          <path d="m13 9 8 5v21l-8-3z" fill="#678b57" />
          <path d="m18 4 7-4 6 4v23l-6 4-7-4z" fill="#355b48" />
          <path d="M23 8v3m0 4v3m0 4v3M7 18v3m0 3v2" stroke="#e7f1cb" strokeWidth="2" />
        </svg>
        <span>{t.brand}</span>
      </div>
      <nav className="nav">
        <button className="active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>{t.navCity}</button>
        <button onClick={onHow}>{t.navHow}</button>
        <button className="lang-chip" onClick={onLocale} aria-label={`Language: ${t.langName}`}>{t.langToggle}</button>
        <button className="me-chip" onClick={onProfile} aria-label={t.profileEdit} title={nickname || t.profile}><span aria-hidden="true">🙂</span><span className="nickname">{nickname || t.profile}</span></button>
      </nav>
    </header>
  );
}
