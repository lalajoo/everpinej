import type { Lot } from '../city/layout';
import { appName } from '../data/apps';
import { useLocale, useT } from '../i18n';
interface Props { lots: Lot[]; onSelect: (id: string) => void; onStart: () => void; loading?: boolean; disabled?: boolean }
export function CityPreview({ lots, onSelect, onStart, loading, disabled }: Props) {
  const t = useT(), locale = useLocale();
  const point = (x: number, z: number, y = 0) => `${260 + (x - z) * 7.5},${205 + (x + z) * 3.6 - y * 11}`;
  return <div className="city-preview">
    <svg viewBox="0 0 520 380" role="group" aria-label={t.previewLabel}>
      <path d="M20 211 260 96 500 211 260 326Z" fill="#adbd91" />
      <path d="M20 203 260 88 500 203 260 318Z" fill="#d1dfb5" />
      <path d="M238 99 478 213 456 224 216 110ZM49 189 71 200 311 85 289 75Z" fill="#edf0dc" opacity=".75" />
      {[...lots].sort((a,b) => a.slot.x+a.slot.z-b.slot.x-b.slot.z).map(lot => {
        const { x, z, w, d } = lot.slot; const h = Math.min(12, lot.height);
        const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2;
        return <g key={lot.app.id} role="button" tabIndex={0} aria-label={t.previewBuilding(appName(lot.app, locale), lot.floors)}
          onClick={() => onSelect(lot.app.id)} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(lot.app.id); } }}>
          {lot.kind === 'building' ? <>
            <polygon points={`${point(x0,z1)} ${point(x1,z1)} ${point(x1,z1,h)} ${point(x0,z1,h)}`} fill={lot.app.color}/>
            <polygon points={`${point(x1,z0)} ${point(x1,z1)} ${point(x1,z1,h)} ${point(x1,z0,h)}`} fill={lot.app.side}/>
            <polygon points={`${point(x0,z0,h)} ${point(x1,z0,h)} ${point(x1,z1,h)} ${point(x0,z1,h)}`} fill={lot.app.roof}/>
            {Array.from({length:Math.max(1,Math.floor(h/1.8))},(_,row)=>[0.22,0.5,0.78].map((v,col)=>{
              const a=x0+w*v,b=z1; const yh=1+row*1.8;
              return <polygon key={`${row}-${col}`} points={`${point(a,b,yh)} ${point(a+.35,b,yh)} ${point(a+.35,b,yh+.65)} ${point(a,b,yh+.65)}`} fill="#fff6df"/>;
            }))}
          </> : <><ellipse cx={260+(x-z)*7.5} cy={205+(x+z)*3.6-6} rx="13" ry="18" fill="#8eae73"/><path d={`M${point(x,z)}v-13`} stroke="#8c8d61" strokeWidth="4"/></>}
          <text x={260+(x-z)*7.5} y={205+(x+z)*3.6+16} textAnchor="middle" fontSize="10" fill="#355b48" stroke="#f7f8f2" strokeWidth="3" paintOrder="stroke">{appName(lot.app,locale)}</text>
        </g>;
      })}
    </svg>
    <button className="primary preview-start" onClick={onStart} disabled={disabled || loading}>{loading ? t.loadingCity : t.walk}</button>
    {loading && <p className="loading-note" role="status">{t.loadingHint}</p>}
  </div>;
}
