import { useEffect, useRef, useState } from 'react';
import { useT } from '../i18n';
import { CANONICAL_URL, track } from '../analytics/analytics';
export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT(), dialog = useRef<HTMLDialogElement>(null), field = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    const d = dialog.current;
    if (open && d && !d.open) { setCopied(false); d.showModal(); }
    else if (!open && d?.open) d.close();
  }, [open]);
  const text = `${t.shareText}\n${CANONICAL_URL}`;
  return <dialog ref={dialog} onClose={onClose} aria-labelledby="share-title">
    <div className="dialog-top"><h2 id="share-title">{t.shareTitle}</h2><button className="close" onClick={onClose} aria-label={t.close}>×</button></div>
    <p className="dialog-copy">{t.shareFallback}</p>
    <textarea ref={field} className="share-text" aria-label={t.shareTitle} readOnly value={text} rows={5} onFocus={(e) => e.currentTarget.select()} />
    <div className="dialog-actions"><button className="primary" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setCopied(true); track('phonecity_share'); }
      catch { field.current?.focus(); field.current?.select(); }
    }}>{t.copyLink}</button><button className="secondary" onClick={onClose}>{t.close}</button></div>
    <p className="small" role="status">{copied ? t.shareCopied : t.sharePrivacy}</p>
  </dialog>;
}
