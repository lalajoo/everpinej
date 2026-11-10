import { appName } from '../data/apps';
import { fmtMinutes, totalMinutes } from '../data/format';
import { useLocale, useT } from '../i18n';
import type { AppUsage } from '../data/types';

export function UsagePanel({ apps, onEdit, onPick }: { apps: AppUsage[]; onEdit: () => void; onPick: (id: string) => void }) {
  const t = useT();
  const l = useLocale();
  const total = totalMinutes(apps);
  return (
    <div className="panel">
      <div className="panel-heading"><h2>{t.residents}</h2><span className="chip">{t.dailyAvg}</span></div>
      {apps.map((a) => (
        <button className="usage-row" key={a.id} onClick={() => onPick(a.id)} aria-label={t.viewApp(appName(a, l), fmtMinutes(a.minutes, l))}>
          <div className="row-top">
            <span className="app"><i style={{ background: a.roof }}>{a.icon}</i>{appName(a, l)}</span>
            <span>{a.minutes ? fmtMinutes(a.minutes, l) : t.zeroPark}</span>
          </div>
          <div className="bar"><b style={{ width: `${total ? (a.minutes / total) * 100 : 0}%`, background: a.color }} /></div>
        </button>
      ))}
      <div className="panel-foot">
        <span className="small">{t.tallestHint}</span>
        <button className="subtle" onClick={onEdit}>{t.edit}</button>
      </div>
    </div>
  );
}
