// 지도 보기. Leaflet(오픈소스)과 OpenStreetMap 타일을 '지도' 버튼을 눌렀을 때만 불러온다.
// 위치·검색어는 외부로 보내지 않고, 타일 서버에는 지도 화면 영역 요청만 간다.
const CSS = { href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=' };
const JS = { src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=' };
const JAPAN = [[24.0, 122.9], [45.6, 145.9]];
let loading = null, map = null, layer = null, me = null;

function load() {
  if (window.L) return Promise.resolve(window.L);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: CSS.href, integrity: CSS.integrity, crossOrigin: '' });
    document.head.append(link);
    const s = Object.assign(document.createElement('script'), { src: JS.src, integrity: JS.integrity, crossOrigin: '', async: true });
    s.onload = () => resolve(window.L);
    s.onerror = () => { loading = null; reject(new Error('leaflet')); };
    document.head.append(s);
  });
  return loading;
}

// 1펜 단가로 색을 나눈다(저렴할수록 진한 초록).
export function tone(unit) {
  if (unit == null) return '#9aa59d';
  if (unit <= 3500) return '#1d7a4f';
  if (unit <= 5000) return '#e8613c';
  return '#8a5a44';
}

export async function showMap(el, rows, { origin = null, popup, onPick } = {}) {
  const L = await load();
  if (!map) {
    map = L.map(el, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).fitBounds(JAPAN);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18, subdomains: 'abc',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }
  setTimeout(() => map.invalidateSize(), 0);
  layer.clearLayers();
  const points = [];
  for (const r of rows) {
    const c = r.clinic;
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const refused = c.touristOk === false;
    const m = L.circleMarker([c.lat, c.lng], {
      radius: 9, weight: 2, color: '#fff', fillColor: refused ? '#b42318' : tone(r.unit), fillOpacity: refused ? 0.55 : 0.95,
    }).bindPopup(popup(r), { maxWidth: 260 });
    m.on('popupopen', e => e.popup.getElement()?.querySelector('[data-pick]')?.addEventListener('click', ev => { ev.preventDefault(); onPick?.(c.id); }));
    m.addTo(layer); points.push([c.lat, c.lng]);
  }
  if (me) { me.remove(); me = null; }
  if (origin) {
    me = L.circleMarker([origin.lat, origin.lng], { radius: 7, weight: 3, color: '#fff', fillColor: '#2f6fed', fillOpacity: 1 }).bindTooltip('내 위치').addTo(map);
    points.push([origin.lat, origin.lng]);
  }
  if (points.length === 1) map.setView(points[0], 14);
  else if (points.length) map.fitBounds(points, { padding: [28, 28], maxZoom: 15 });
  else map.fitBounds(JAPAN);
  return points.length;
}
