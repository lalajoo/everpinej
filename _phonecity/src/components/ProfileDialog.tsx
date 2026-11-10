import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { MAX_NICK, generateNickname, normalizeNickname, type Look, type Profile } from '../data/profile';
const ProfilePreview = lazy(() => import('./ProfilePreview'));
import { useLocale, useT } from '../i18n';
import { SceneBoundary } from './SceneBoundary';

interface Props { open: boolean; initial: Profile | null; onSave: (p: Profile) => void; onClose?: () => void }

/** 처음 들어올 때(또는 '프로필'에서) 닉네임과 캐릭터 모습을 정한다. */
export function ProfileDialog({ open, initial, onSave, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  const locale = useLocale();
  const [nick, setNick] = useState(() => initial?.nickname ?? generateNickname());
  const [look, setLook] = useState<Look>(initial?.look ?? 'girl');

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setNick(initial?.nickname ?? generateNickname(Math.random, locale));
      setLook(initial?.look ?? 'girl');
      if (!d.open) d.showModal();
    } else if (d.open) d.close();
  }, [open, initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const name = normalizeNickname(nick);
  const first = !initial;
  return (
    <dialog ref={ref} className="profile-dialog" onClose={onClose} aria-labelledby="profile-title">
      <form onSubmit={(e) => { e.preventDefault(); if (name) onSave({ nickname: name, look }); }}>
        <div className="dialog-top">
          <h2 id="profile-title">{first ? t.profileWelcome : t.profileEdit}</h2>
          <button type="button" className="close" onClick={onClose} aria-label={t.close}>×</button>
        </div>
        <p className="dialog-copy">{t.profileCopy}</p>
        <div className="profile-preview" aria-hidden="true">
          {open && <SceneBoundary message={t.sceneError} retry={t.reloadCity}><Suspense fallback={<div className="preview-loading" role="status">{t.loadingCity}</div>}><ProfilePreview look={look} /></Suspense></SceneBoundary>}
        </div>
        <div className="look-choice" role="radiogroup" aria-label={t.character}>
          {([['girl', t.girl], ['boy', t.boy]] as const).map(([v, label]) => (
            <button type="button" key={v} role="radio" aria-checked={look === v} className={look === v ? 'on' : ''} onClick={() => setLook(v)}>{label}</button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="nick">{t.nickname}</label>
          <div className="nick-row">
            <input id="nick" maxLength={MAX_NICK} value={nick} onChange={(e) => setNick(e.target.value)} placeholder={generateNicknamePlaceholder(locale)} />
            <button type="button" className="secondary dice" onClick={() => setNick(generateNickname(Math.random, locale))} aria-label={t.rerollLabel}>{t.reroll}</button>
          </div>
          <small className="nick-help">{t.nickHelp(MAX_NICK)}</small>
        </div>
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>{t.cancel}</button>
          <button type="submit" className="primary" disabled={!name}>{first ? t.profileStart : t.save}</button>
        </div>
      </form>
    </dialog>
  );
}

const generateNicknamePlaceholder = (l: string) => (l === 'en' ? 'Wandering Squirrel' : '산책하는 다람쥐');
