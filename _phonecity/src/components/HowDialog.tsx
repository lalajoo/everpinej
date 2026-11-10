import { useEffect, useRef } from 'react';
import { useT } from '../i18n';

export function HowDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose}>
      <div className="dialog-top"><h2>{t.howTitle}</h2><button className="close" onClick={onClose} aria-label={t.close}>×</button></div>
      <div className="steps">
        <p><b><em>01</em>{t.how1t}</b>{t.how1}</p>
        <p><b><em>02</em>{t.how2t}</b>{t.how2}</p>
        <p><b><em>03</em>{t.how3t}</b>{t.how3}</p>
        <p><b><em>04</em>{t.how4t}</b>{t.how4}</p>
      </div>
      <p className="dialog-copy">{t.howNote}</p>
      <button className="primary wide" onClick={onClose}>{t.howGo}</button>
    </dialog>
  );
}
