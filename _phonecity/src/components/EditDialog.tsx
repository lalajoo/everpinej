import { useCallback, useEffect, useRef, useState } from 'react';
import { ETC_ID, MAX_APP_NAME, MAX_NAMED_APPS, appFromName, appName } from '../data/apps';
import { fmtMinutes, lastWeekPeriod } from '../data/format';
import type { CityData } from '../data/types';
import { MAX_MINUTES_PER_DAY, MAX_NAME_LENGTH, buildApps, normalizeName, validateApps, validatePeriod } from '../data/validate';
import { assignSlots } from '../city/slots';
import { parseScreenTime, toCityRows, type ParsedScreenTime, type Scope } from '../ocr/parseScreenTime';
import { tr, useT } from '../i18n';

interface Props {
  open: boolean;
  city: CityData;
  /** 열 때 바로 인식할 캡처 (사이드 패널의 '캡처로 만들기') */
  initialFile?: File | null;
  onClose: () => void;
  onSubmit: (next: CityData) => void;
}

type Ocr =
  | { status: 'idle' }
  | { status: 'reading'; progress: number }
  | { status: 'done'; parsed: ParsedScreenTime; scope: Scope; found: number; etcFrom: { rest: string[]; unlisted: number } }
  | { status: 'error'; message: string };

interface Row { key: number; name: string; minutes: string; hit?: boolean }
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp'];
let rowKey = 1;

export function EditDialog({ open, city, initialFile, onClose, onSubmit }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useT();
  const submitBtn = useRef<HTMLButtonElement>(null);
  const [name, setName] = useState(city.name);
  const [rows, setRows] = useState<Row[]>([]);
  const [etc, setEtc] = useState('0');
  const [period, setPeriod] = useState(() => lastWeekPeriod());
  const [errors, setErrors] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [ocr, setOcr] = useState<Ocr>({ status: 'idle' });
  const runId = useRef(0);

  /** 인식 결과 → 입력칸 (사용 시간이 긴 앱부터 건물로, 나머지는 기타) */
  const apply = useCallback((parsed: ParsedScreenTime, scope: Scope) => {
    const r = toCityRows(parsed, scope, MAX_NAMED_APPS);
    setRows(r.rows.map((x) => ({ key: rowKey++, name: x.name, minutes: String(x.minutes), hit: true })));
    setEtc(String(r.etc));
    return r.etcFrom;
  }, []);

  const readImage = useCallback(async (f: File) => {
    if (!ACCEPT.includes(f.type)) { setErrors([tr().badType]); return; }
    if (f.size > 15 * 1024 * 1024) { setErrors([tr().tooBig]); return; }
    setErrors([]);
    setPhoto(URL.createObjectURL(f));
    const id = ++runId.current;
    setOcr({ status: 'reading', progress: 0 });
    try {
      const { recognizeScreenTime } = await import('../ocr/recognize');
      const text = await recognizeScreenTime(f, (p) => { if (runId.current === id) setOcr({ status: 'reading', progress: p }); });
      if (runId.current !== id) return;
      const parsed = parseScreenTime(text);
      if (parsed.entries.length === 0) {
        setOcr({ status: 'error', message: tr().ocrNone });
        return;
      }
      let scope = parsed.scope;
      // 하루 기준으로 24시간을 넘으면 일주일 합계 화면으로 판단
      const sum = parsed.entries.reduce((s, e) => s + e.minutes, 0);
      if (!parsed.scopeDetected && sum > MAX_MINUTES_PER_DAY) scope = 'week';
      const etcFrom = apply(parsed, scope);
      if (scope === 'week') setPeriod(lastWeekPeriod());
      setOcr({ status: 'done', parsed, scope, found: parsed.entries.length, etcFrom });
      setTimeout(() => submitBtn.current?.focus(), 50);
    } catch {
      if (runId.current === id) setOcr({ status: 'error', message: tr().ocrFail });
    }
  }, [apply]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      setName(city.name);
      setRows(city.apps.filter((a) => a.id !== ETC_ID).map((a) => ({ key: rowKey++, name: appName(a), minutes: String(a.minutes) })));
      setEtc(String(city.apps.find((a) => a.id === ETC_ID)?.minutes ?? 0));
      setPeriod(city.period.kind === 'custom' ? { start: city.period.start, end: city.period.end } : lastWeekPeriod());
      setErrors([]);
      setOcr({ status: 'idle' });
      if (!d.open) d.showModal();
      if (initialFile) void readImage(initialFile);
    } else if (d.open) d.close();
  }, [open, city, initialFile]); // eslint-disable-line react-hooks/exhaustive-deps

  // 캡처는 이 기기에서만 미리보기 — 저장·업로드하지 않고 닫으면 해제
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  useEffect(() => { if (!open) { setPhoto(null); runId.current++; } }, [open]);

  const live = validateApps(rows, etc);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = validateApps(rows, etc);
    const p = validatePeriod({ kind: 'custom', ...period });
    const errs = [...v.errors, ...(p ? [] : [t.periodError])];
    setErrors(errs);
    if (errs.length || !p) return;
    const apps = buildApps(v, city.apps);
    onSubmit({ ...city, name: normalizeName(name), period: p, isExample: false, apps, slotOf: assignSlots(apps, city.slotOf) });
  };

  const switchScope = (scope: Scope) => {
    if (ocr.status !== 'done') return;
    const etcFrom = apply(ocr.parsed, scope);
    setOcr({ ...ocr, scope, etcFrom });
  };
  const setRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="edit-title">
      <form onSubmit={submit} noValidate>
        <div className="dialog-top"><h2 id="edit-title">{t.editTitle}</h2><button type="button" className="close" onClick={onClose} aria-label={t.close}>×</button></div>
        <p className="dialog-copy">
          {photo
            ? t.editCopyPhoto
            : t.editCopy(MAX_NAMED_APPS)}
        </p>
        <label className="upload ocr-upload">
          {t.uploadShot}
          <input type="file" accept={ACCEPT.join(',')} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void readImage(f); e.target.value = ''; }} />
        </label>
        {photo && (
          <div className="ocr-box">
            <img className="uploaded" src={photo} alt={t.shotAlt} />
            <div className="ocr-status" role="status" aria-live="polite">
              {ocr.status === 'reading' && (
                <>
                  <strong>{t.reading(Math.round(ocr.progress * 100))}</strong>
                  <div className="prog"><i style={{ width: `${Math.round(ocr.progress * 100)}%` }} /></div>
                  <small>{t.readingNote}</small>
                </>
              )}
              {ocr.status === 'done' && (
                <>
                  <strong>{t.readDone(ocr.found)}</strong>
                  <small>{t.readFix}</small>
                  {(ocr.etcFrom.rest.length > 0 || ocr.etcFrom.unlisted > 0) && (
                    <small>
                      {t.etcFrom} {ocr.etcFrom.rest.length > 0 && `${ocr.etcFrom.rest.slice(0, 4).join(', ')}`}
                      {ocr.etcFrom.rest.length > 0 && ocr.etcFrom.unlisted > 0 && ' + '}
                      {ocr.etcFrom.unlisted > 0 && t.unlisted(fmtMinutes(ocr.etcFrom.unlisted))}
                    </small>
                  )}
                  <div className="scope-toggle" role="group" aria-label={t.scopeLabel}>
                    <span>{t.scopeIs}</span>
                    <button type="button" className={ocr.scope === 'day' ? 'on' : ''} onClick={() => switchScope('day')}>{t.scopeDay}</button>
                    <button type="button" className={ocr.scope === 'week' ? 'on' : ''} onClick={() => switchScope('week')}>{t.scopeWeek}</button>
                  </div>
                </>
              )}
              {ocr.status === 'error' && <strong className="ocr-error">{ocr.message}</strong>}
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="city-name">{t.cityName}</label>
          <input id="city-name" maxLength={MAX_NAME_LENGTH} placeholder={t.defaultCityName} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field period-field">
          <label>{t.periodField}</label>
          <div className="period-inputs">
            <input type="date" aria-label={t.start} value={period.start} onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))} />
            <span>—</span>
            <input type="date" aria-label={t.end} value={period.end} onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))} />
          </div>
        </div>
        <div className="app-rows">
          <div className="app-rows-head"><span>{t.appsHead}</span><span>{rows.length}/{MAX_NAMED_APPS}</span></div>
          {rows.map((r) => {
            const preview = appFromName(r.name || '?', 0);
            return (
              <div className={`app-row${r.hit ? ' hit' : ''}`} key={r.key}>
                <i style={{ background: preview.roof }} aria-hidden="true">{preview.icon}</i>
                <input className="app-name" aria-label={t.appName} maxLength={MAX_APP_NAME} value={r.name} placeholder={t.appName} onChange={(e) => setRow(r.key, { name: e.target.value, hit: false })} />
                <input className="app-min" aria-label={t.appMinutes(r.name || t.appName)} type="number" inputMode="numeric" min={0} max={MAX_MINUTES_PER_DAY} step={1} value={r.minutes} onChange={(e) => setRow(r.key, { minutes: e.target.value })} />
                <span>{t.minUnit}</span>
                <button type="button" className="row-del" aria-label={t.removeApp(r.name || t.appName)} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>×</button>
              </div>
            );
          })}
          {rows.length < MAX_NAMED_APPS && (
            <button type="button" className="row-add" onClick={() => setRows((rs) => [...rs, { key: rowKey++, name: '', minutes: '0' }])}>{t.addApp}</button>
          )}
          <div className="app-row etc">
            <i aria-hidden="true">••</i>
            <span className="app-name">{t.etcRow}</span>
            <input className="app-min" aria-label={t.etcMinutes} type="number" inputMode="numeric" min={0} max={MAX_MINUTES_PER_DAY} step={1} value={etc} onChange={(e) => setEtc(e.target.value)} />
            <span>{t.minUnit}</span>
            <span className="row-del" />
          </div>
        </div>
        <p className={`total-line${live.total > MAX_MINUTES_PER_DAY ? ' over' : ''}`}>{t.totalLine(fmtMinutes(live.total))}</p>
        {errors.length > 0 && <ul className="errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={onClose}>{t.cancel}</button>
          <button ref={submitBtn} type="submit" className="primary" disabled={ocr.status === 'reading'}>{t.makeCity}</button>
        </div>
      </form>
    </dialog>
  );
}
